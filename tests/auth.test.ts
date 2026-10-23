import { beforeAll, afterEach, describe, expect, it, vi } from "vitest";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import worker from "../worker/index";
import { readOAuthTransaction } from "../worker/auth";

// The provider is simulated. These tests never contact Google or use real credentials.
const transaction = {
  state: "s".repeat(43),
  nonce: "n".repeat(43),
  verifier: "v".repeat(43),
};
const cookie = `machi_oauth=${encodeURIComponent(btoa(JSON.stringify(transaction)))}`;
let keys: Awaited<ReturnType<typeof generateKeyPair>>;
let publicKey: object;
beforeAll(async () => {
  keys = await generateKeyPair("RS256", { extractable: true });
  publicKey = {
    ...(await exportJWK(keys.publicKey)),
    kid: "test-key",
    alg: "RS256",
    use: "sig",
  };
});
afterEach(() => vi.unstubAllGlobals());
function environment(existing = true, invited = false) {
  const sessions: unknown[][] = [];
  const user = {
    id: "test-user",
    name: "Tester",
    profile: JSON.stringify({ nationality: "日本" }),
  };
  const DB = {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async first() {
              if (sql.includes("WHERE google_sub"))
                return existing ? user : null;
              if (sql.includes("FROM invitations"))
                return invited ? { ok: 1 } : null;
              return null;
            },
            async run() {
              if (sql.includes("INSERT INTO sessions")) sessions.push(values);
              return { success: true };
            },
          };
        },
      };
    },
    batch: vi.fn(async () => []),
  };
  return {
    env: {
      DB,
      APP_ENV: "development",
      APP_ORIGIN: "http://127.0.0.1:5173",
      GOOGLE_CLIENT_ID: "local-test.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "local-test-only",
      ADMIN_EMAIL: "admin@example.test",
    } as any,
    sessions,
  };
}
async function signedToken(overrides: Record<string, unknown> = {}) {
  return new SignJWT({
    sub: "google-test-user",
    email: "invited@example.test",
    email_verified: true,
    nonce: transaction.nonce,
    ...overrides,
  })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer("https://accounts.google.com")
    .setAudience("local-test.apps.googleusercontent.com")
    .setExpirationTime("5m")
    .sign(keys.privateKey);
}
function provider(token: string, rejected = false) {
  const mocked = vi.fn(
    async (input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url === "https://oauth2.googleapis.com/token") {
        const form = new URLSearchParams(init?.body as string);
        expect(form.get("code_verifier")).toBe(transaction.verifier);
        expect(form.get("redirect_uri")).toBe(
          "http://127.0.0.1:5173/api/auth/callback",
        );
        return Response.json(
          rejected ? { error: "invalid_grant" } : { id_token: token },
          { status: rejected ? 400 : 200 },
        );
      }
      if (url === "https://www.googleapis.com/oauth2/v3/certs")
        return Response.json({ keys: [publicKey] });
      throw new Error("Unexpected external request");
    },
  );
  vi.stubGlobal("fetch", mocked);
  return mocked;
}
function callback(
  query = "state=" + transaction.state + "&code=test-only",
  savedCookie = cookie,
) {
  return new Request("http://127.0.0.1:5173/api/auth/callback?" + query, {
    headers: { Cookie: savedCookie },
  });
}
describe("Google認証の開始と復帰（プロバイダーをシミュレーション）", () => {
  it("PKCE・state・nonceと一致するコールバックを設定する", async () => {
    const { env } = environment();
    const result = await worker.fetch(
      new Request("http://127.0.0.1:5173/api/auth/google"),
      env,
    );
    expect(result.status).toBe(302);
    const target = new URL(result.headers.get("location")!);
    expect(target.origin).toBe("https://accounts.google.com");
    expect(target.searchParams.get("redirect_uri")).toBe(
      "http://127.0.0.1:5173/api/auth/callback",
    );
    expect(target.searchParams.get("code_challenge_method")).toBe("S256");
    expect(target.searchParams.get("scope")).toBe("openid email profile");
    expect(target.searchParams.get("state")).toHaveLength(43);
    expect(target.searchParams.get("nonce")).toHaveLength(43);
    expect(result.headers.get("set-cookie")).toContain("HttpOnly");
  });
  it("認証取消からアプリへ戻り、セッションを作らない", async () => {
    const { env, sessions } = environment();
    const mocked = vi.fn();
    vi.stubGlobal("fetch", mocked);
    const result = await worker.fetch(
      callback(`state=${transaction.state}&error=access_denied`),
      env,
    );
    expect(result.headers.get("location")).toBe(
      env.APP_ORIGIN + "/profile?login=cancelled",
    );
    expect(sessions).toHaveLength(0);
    expect(mocked).not.toHaveBeenCalled();
  });
  it.each([
    "machi_oauth=not-base64",
    "machi_oauth=" + btoa("null"),
    "machi_oauth=" + btoa('{"state":1}'),
  ])("壊れたCookieを安全に拒否: %s", async (badCookie) => {
    const { env, sessions } = environment();
    const result = await worker.fetch(callback(undefined, badCookie), env);
    expect(result.status).toBe(303);
    expect(result.headers.get("location")).toBe(
      env.APP_ORIGIN + "/profile?login=expired",
    );
    expect(sessions).toHaveLength(0);
  });
  it("認可コード交換失敗から再試行画面へ戻る", async () => {
    const { env, sessions } = environment();
    provider("", true);
    const result = await worker.fetch(callback(), env);
    expect(result.headers.get("location")).toBe(
      env.APP_ORIGIN + "/profile?login=failed",
    );
    expect(sessions).toHaveLength(0);
  });
  it.each([{ nonce: "wrong" }, { email_verified: false }])(
    "検証を通らないIDトークンを拒否: %j",
    async (overrides) => {
      const { env, sessions } = environment();
      provider(await signedToken(overrides));
      const result = await worker.fetch(callback(), env);
      expect(result.headers.get("location")).toBe(
        env.APP_ORIGIN + "/profile?login=failed",
      );
      expect(sessions).toHaveLength(0);
    },
  );
  it("未招待の新規アカウントにはセッションを発行しない", async () => {
    const { env, sessions } = environment(false);
    provider(await signedToken());
    const result = await worker.fetch(callback(), env);
    expect(result.headers.get("location")).toBe(
      env.APP_ORIGIN + "/profile?login=not_invited",
    );
    expect(sessions).toHaveLength(0);
  });
  it("署名・本人確認・nonceを検証した既存会員にセッションを発行する", async () => {
    const { env, sessions } = environment();
    provider(await signedToken());
    const result = await worker.fetch(callback(), env);
    expect(result.headers.get("location")).toBe(env.APP_ORIGIN + "/");
    expect(sessions).toHaveLength(1);
    expect(sessions[0][0]).toMatch(/^[a-f0-9]{64}$/);
    expect(result.headers.get("set-cookie")).toContain("machi_session=");
    expect(result.headers.get("set-cookie")).toContain("HttpOnly");
  });
  it("型が不正な認証トランザクションは復元しない", () => {
    expect(
      readOAuthTransaction(btoa(JSON.stringify({ ...transaction, nonce: [] }))),
    ).toBeNull();
  });
});
