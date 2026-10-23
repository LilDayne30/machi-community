import { afterEach, describe, expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
const temporary: string[] = [];
afterEach(() => {
  for (const directory of temporary.splice(0))
    rmSync(directory, { recursive: true, force: true });
});
function fixture(redirect = "http://127.0.0.1:5173/api/auth/callback") {
  const directory = mkdtempSync(path.join(tmpdir(), "machi-oauth-test-"));
  temporary.push(directory);
  mkdirSync(path.join(directory, "scripts"));
  copyFileSync(
    "scripts/setup-google.mjs",
    path.join(directory, "scripts/setup-google.mjs"),
  );
  writeFileSync(
    path.join(directory, ".dev.vars"),
    "APP_ORIGIN=http://127.0.0.1:5173\nDEMO_MODE=true\nGOOGLE_CLIENT_ID=\nGOOGLE_CLIENT_SECRET=\n",
  );
  const file = path.join(directory, "client_secret.json");
  writeFileSync(
    file,
    JSON.stringify({
      web: {
        client_id: "fixture.apps.googleusercontent.com",
        client_secret: "test-secret-never-real",
        redirect_uris: [redirect],
      },
    }),
  );
  return {
    directory,
    file,
    run: () =>
      spawnSync(
        process.execPath,
        [path.join(directory, "scripts/setup-google.mjs"), file],
        { encoding: "utf8" },
      ),
  };
}
describe("Google接続設定の安全な取り込み", () => {
  it("一致するコールバックだけ取り込み、秘密情報を出力しない", () => {
    const { directory, run } = fixture();
    const result = run();
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).not.toContain(
      "test-secret-never-real",
    );
    const content = readFileSync(path.join(directory, ".dev.vars"), "utf8");
    expect(content).toContain('GOOGLE_CLIENT_SECRET="test-secret-never-real"');
    expect(content).toContain("DEMO_MODE=true");
    expect(statSync(path.join(directory, ".dev.vars")).mode & 0o777).toBe(
      0o600,
    );
  });
  it("リダイレクト先の不一致では既存設定を変えない", () => {
    const { directory, run } = fixture(
      "https://wrong.example/api/auth/callback",
    );
    const original = readFileSync(path.join(directory, ".dev.vars"), "utf8");
    const result = run();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("承認済みリダイレクトURI");
    expect(readFileSync(path.join(directory, ".dev.vars"), "utf8")).toBe(
      original,
    );
    expect(result.stdout + result.stderr).not.toContain(
      "test-secret-never-real",
    );
  });
  it("Webアプリ以外のクライアントは拒否", () => {
    const { file, run } = fixture();
    writeFileSync(
      file,
      JSON.stringify({
        installed: { client_secret: "test-secret-never-real" },
      }),
    );
    const result = run();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Webアプリ用");
    expect(result.stdout + result.stderr).not.toContain(
      "test-secret-never-real",
    );
  });
});
