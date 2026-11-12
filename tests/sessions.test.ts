import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import Stripe from "stripe";
import worker from "../worker/index";
import adminWorker from "../worker/admin";
import { sha256 } from "../worker/security";
import { isAdult, refundOnCancel } from "../worker/sessions";
// Real SQL schema in memory; no external requests and no real payment credentials.
class Statement {
  constructor(
    private db: DatabaseSync,
    private sql: string,
    private args: unknown[] = [],
  ) {}
  bind(...args: unknown[]) {
    return new Statement(this.db, this.sql, args);
  }
  async first() {
    return this.db.prepare(this.sql).get(...(this.args as any[])) || null;
  }
  async all() {
    return {
      success: true,
      results: this.db.prepare(this.sql).all(...(this.args as any[])),
    };
  }
  async run() {
    const r = this.db.prepare(this.sql).run(...(this.args as any[]));
    return { success: true, meta: { changes: Number(r.changes) } };
  }
}
let sql: DatabaseSync;
const secret = "whsec_local_fixture_only";
const stripe = new Stripe("sk_test_local_fixture_only");
const env = () => ({
  DB: {
    prepare: (q: string) => new Statement(sql, q),
    batch: async (ss: Statement[]) => {
      sql.exec("BEGIN");
      try {
        const results = [];
        for (const s of ss) results.push(await s.run());
        sql.exec("COMMIT");
        return results;
      } catch (e) {
        sql.exec("ROLLBACK");
        throw e;
      }
    },
  },
  APP_ENV: "production",
  DEMO_MODE: "false",
  APP_ORIGIN: "https://machi.example",
  STRIPE_SECRET_KEY: "sk_test_local_fixture_only",
  STRIPE_WEBHOOK_SECRET: secret,
  ADMIN_EMAIL: "admin@example.test",
});

async function webhook(
  object: object,
  type = "checkout.session.completed",
  eventId = "evt_local",
) {
  const payload = JSON.stringify({
    id: eventId,
    type,
    data: { object },
    object: "event",
    livemode: false,
    created: Math.floor(Date.now() / 1000),
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  });
  return worker.fetch(
    new Request("https://machi.example/api/stripe/webhook", {
      method: "POST",
      body: payload,
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": signature,
      },
    }),
    env() as any,
    { waitUntil() {} } as any,
  );
}
const ctx = { waitUntil() {} } as any;
async function call(
  who: "client" | "advisor" | "other" | "admin",
  method: string,
  path: string,
  body?: unknown,
  raw?: { data: Uint8Array; type: string },
) {
  const admin = who === "admin";
  const token = "tok-" + who;
  const r = await (admin ? adminWorker : worker).fetch(
    new Request("https://" + (admin ? "admin." : "") + "machi.example" + path, {
      method,
      body: raw
        ? (raw.data as any)
        : body === undefined
          ? undefined
          : JSON.stringify(body),
      headers: {
        cookie:
          (admin ? "__Host-machi_admin_session=" : "__Host-machi_session=") +
          token,
        origin: "https://" + (admin ? "admin." : "") + "machi.example",
        "content-type": raw ? raw.type : "application/json",
        ...(raw ? { "content-length": String(raw.data.length) } : {}),
      },
    }),
    {
      ...env(),
      APP_ORIGIN: "https://" + (admin ? "admin." : "") + "machi.example",
      ...(admin ? { APP_SURFACE: "admin" } : {}),
    } as any,
    ctx,
  );
  const text = await r.text();
  let json: any = text;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: r.status, json };
}
const row = (id: string) =>
  sql.prepare("SELECT * FROM paid_sessions WHERE id=?").get(id) as any;
const future = (h: number) => new Date(Date.now() + h * 3600e3).toISOString();
async function login() {
  for (const [id, role] of [
    ["client", "member"],
    ["advisor", "member"],
    ["other", "member"],
    ["admin", "admin"],
  ]) {
    sql
      .prepare(
        "INSERT INTO users(id,google_sub,email,name,role) VALUES(?,?,?,?,?)",
      )
      .run(
        id,
        "g" + id,
        id + "@example.test",
        id === "admin" ? "運営" : id,
        id === "admin" ? "admin" : role,
      );
    const t = await sha256("tok-" + id);
    sql
      .prepare(
        "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,unixepoch()+9999)",
      )
      .run(t, id);
    sql
      .prepare(
        "INSERT INTO admin_sessions(token_hash,user_id,expires_at) VALUES(?,?,unixepoch()+9999)",
      )
      .run(t, id);
  }
}
async function approveAdvisor() {
  expect(
    (
      await call("advisor", "PUT", "/api/advisor/me", {
        details: {
          school: "秘密大学",
          schoolPublic: false,
          city: "台北",
          links: ["https://example.com/a"],
        },
        availability: "平日夜",
        accepting: false,
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await call("advisor", "PUT", "/api/advisor/document", undefined, {
        data: new Uint8Array([1, 2, 3]),
        type: "image/png",
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await call("advisor", "POST", "/api/advisor/apply", {
        birthDate: "2000-01-01",
        termsAgreed: true,
      })
    ).status,
  ).toBe(201);
  expect(
    (
      await call("admin", "PATCH", "/api/admin/advisors/advisor", {
        action: "approve",
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await call("advisor", "PUT", "/api/advisor/me", {
        details: { school: "秘密大学", schoolPublic: false, city: "台北" },
        availability: "平日夜",
        accepting: true,
      })
    ).status,
  ).toBe(200);
}
const request = (over: object = {}) =>
  call("client", "POST", "/api/sessions", {
    advisorId: "advisor",
    topic: "台湾の大学の交換留学について相談したいです",
    slots: [future(30), future(50), future(70)],
    ...over,
  });
async function paidSession() {
  const r = await request();
  const id = r.json.id as string;
  expect(
    (
      await call("advisor", "POST", `/api/sessions/${id}/accept`, {
        scheduledAt: row(id) && JSON.parse(row(id).slots)[0],
        callUrl: "https://meet.example.com/x",
      })
    ).status,
  ).toBe(200);
  sql
    .prepare("UPDATE paid_sessions SET stripe_session_id=? WHERE id=?")
    .run("cs_" + id, id);
  return id;
}
const pay = (id: string, over: object = {}) =>
  webhook(
    {
      id: "cs_" + id,
      metadata: { paidSessionId: id, userId: "client" },
      client_reference_id: "client",
      payment_status: "paid",
      currency: "jpy",
      amount_total: 3500,
      payment_intent: "pi_s",
      ...over,
    },
    "checkout.session.completed",
    "evt_" + Math.random(),
  );
beforeEach(async () => {
  sql = new DatabaseSync(":memory:");
  for (const f of [
    "0001_initial",
    "0002_direct_conversations",
    "0003_profile_photos",
    "0004_region_connections",
    "0005_admin_operations",
    "0006_paid_sessions",
  ])
    sql.exec(readFileSync(`migrations/${f}.sql`, "utf8"));
  await login();
});
afterEach(() => sql.close());
describe("有料相談の純粋ルール", () => {
  it("18歳判定", () => {
    expect(isAdult("2000-01-01")).toBe(true);
    expect(
      isAdult(
        new Date(Date.now() - 17 * 365 * 864e5).toISOString().slice(0, 10),
      ),
    ).toBe(false);
    expect(isAdult("bad")).toBe(false);
  });
  it("キャンセルの返金規定", () => {
    const t = new Date(Date.now() + 30 * 3600e3).toISOString();
    expect(refundOnCancel("client", t)).toBe(true);
    expect(
      refundOnCancel(
        "client",
        new Date(Date.now() + 10 * 3600e3).toISOString(),
      ),
    ).toBe(false);
    expect(
      refundOnCancel(
        "advisor",
        new Date(Date.now() + 1 * 3600e3).toISOString(),
      ),
    ).toBe(true);
  });
});
describe("経験者の確認申請", () => {
  it("未承認・停止中は受付ONにも申込みにもできない", async () => {
    expect(
      (
        await call("advisor", "PUT", "/api/advisor/me", {
          details: {},
          availability: "",
          accepting: true,
        })
      ).status,
    ).toBe(403);
    expect((await request()).status).toBe(403);
  });
  it("18歳未満・書類なしは申請できない", async () => {
    await call("advisor", "PUT", "/api/advisor/me", {
      details: {},
      availability: "",
      accepting: false,
    });
    expect(
      (
        await call("advisor", "POST", "/api/advisor/apply", {
          birthDate: "2000-01-01",
          termsAgreed: true,
        })
      ).status,
    ).toBe(400);
    await call("advisor", "PUT", "/api/advisor/document", undefined, {
      data: new Uint8Array([1]),
      type: "image/png",
    });
    const minor = new Date(Date.now() - 16 * 365 * 864e5)
      .toISOString()
      .slice(0, 10);
    expect(
      (
        await call("advisor", "POST", "/api/advisor/apply", {
          birthDate: minor,
          termsAgreed: true,
        })
      ).status,
    ).toBe(403);
  });
  it("承認で書類を削除し、公開APIに書類・非公開の学校名が出ない", async () => {
    await approveAdvisor();
    expect(
      sql.prepare("SELECT count(*) n FROM advisor_documents").get()?.n,
    ).toBe(0);
    const pub = await call("client", "GET", "/api/advisors/advisor");
    expect(pub.status).toBe(200);
    expect(JSON.stringify(pub.json)).not.toContain("秘密大学");
    const boot = await call("client", "GET", "/api/bootstrap");
    expect(JSON.stringify(boot.json.advisors)).not.toContain("秘密大学");
    expect(boot.json.advisors.length).toBe(1);
  });
  it("書類は運営だけが見られる", async () => {
    await call("advisor", "PUT", "/api/advisor/me", {
      details: {},
      availability: "",
      accepting: false,
    });
    await call("advisor", "PUT", "/api/advisor/document", undefined, {
      data: new Uint8Array([1]),
      type: "image/png",
    });
    expect(
      (await call("admin", "GET", "/api/admin/advisors/advisor/document"))
        .status,
    ).toBe(200);
    expect(
      (await call("client", "GET", "/api/admin/advisors/advisor/document"))
        .status,
    ).toBe(404);
  });
  it("運営が外部リンクを差し戻し、会員ごとの実績を確認できる", async () => {
    await approveAdvisor();
    await call("advisor", "PUT", "/api/advisor/me", {
      details: { links: ["https://example.com/a"] },
      availability: "",
      accepting: true,
    });
    expect(
      (
        await call("admin", "PATCH", "/api/admin/advisors/advisor", {
          action: "clear_links",
          reason: "",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call("admin", "PATCH", "/api/admin/advisors/advisor", {
          action: "clear_links",
          reason: "無関係なリンク",
        })
      ).status,
    ).toBe(200);
    expect(
      (await call("advisor", "GET", "/api/advisor/me")).json.details.links,
    ).toEqual([]);
    expect(
      (
        await call("advisor", "PUT", "/api/advisor/me", {
          details: { links: ["https://example.com/a"] },
          availability: "",
          accepting: true,
        })
      ).status,
    ).toBe(200);
    const s = await call("admin", "GET", "/api/admin/advisors/advisor/summary");
    expect(s.json.advisor).toMatchObject({
      status: "approved",
      verifiedBy: "運営",
    });
    expect(
      (await call("client", "GET", "/api/admin/advisors/advisor/summary"))
        .status,
    ).toBe(404);
  });
  it("本人は承認状態を書き換えられない", async () => {
    await approveAdvisor();
    await call("admin", "PATCH", "/api/admin/advisors/advisor", {
      action: "suspend",
      reason: "確認",
    });
    expect(
      (
        await call("advisor", "PUT", "/api/advisor/me", {
          details: {},
          availability: "",
          accepting: true,
        })
      ).status,
    ).toBe(403);
    expect((await request()).status).toBe(403);
  });
});
describe("有料相談の流れ", () => {
  beforeEach(approveAdvisor);
  it("申込みの検証（3候補・保護者同意・自分宛て）", async () => {
    expect((await request({ slots: [future(30)] })).status).toBe(400);
    expect((await request({ topic: "短い" })).status).toBe(400);
    expect((await request({ minor: true })).status).toBe(400);
    expect((await request({ minor: true, guardianConsent: true })).status).toBe(
      201,
    );
  });
  it("申込→承認→支払い→実施→72時間後に精算対象、他人は見られない", async () => {
    const id = await paidSession();
    expect(row(id).status).toBe("accepted");
    expect((await pay(id)).status).toBe(200);
    expect(row(id).status).toBe("paid");
    expect((await call("other", "GET", `/api/sessions/${id}`)).status).toBe(
      404,
    );
    expect(
      (await call("client", "GET", `/api/sessions/${id}`)).json.callUrl,
    ).toBe("https://meet.example.com/x");
    sql
      .prepare("UPDATE paid_sessions SET scheduled_at=? WHERE id=?")
      .run(future(-1), id);
    expect(
      (await call("client", "POST", `/api/sessions/${id}/complete`)).status,
    ).toBe(403);
    expect(
      (await call("advisor", "POST", `/api/sessions/${id}/complete`)).status,
    ).toBe(200);
    expect(row(id).status).toBe("completed");
    sql
      .prepare("UPDATE paid_sessions SET settle_at=unixepoch()-1 WHERE id=?")
      .run(id);
    expect(
      (await call("client", "GET", `/api/sessions/${id}`)).json.status,
    ).toBe("settled");
    const m = row(id).scheduled_at.slice(0, 7);
    const po = await call("admin", "GET", "/api/admin/payouts?month=" + m);
    expect(po.json.payouts[0]).toMatchObject({
      advisorId: "advisor",
      total: 2500,
      count: 1,
      paid: false,
    });
    expect(
      (
        await call("admin", "POST", "/api/admin/payouts", {
          month: m,
          advisorId: "advisor",
        })
      ).status,
    ).toBe(200);
    expect(row(id).payout_paid_at).toBeTruthy();
  });
  it("承認前は通話URLを見せず、承認48時間・支払24時間で期限切れになる", async () => {
    const r = await request();
    expect(
      (await call("client", "GET", `/api/sessions/${r.json.id}`)).json.callUrl,
    ).toBeNull();
    sql
      .prepare(
        "UPDATE paid_sessions SET accept_expires_at=unixepoch()-1 WHERE id=?",
      )
      .run(r.json.id);
    expect(
      (await call("client", "GET", `/api/sessions/${r.json.id}`)).json.status,
    ).toBe("expired");
    await call("advisor", "PUT", "/api/advisor/me", {
      details: {},
      availability: "",
      accepting: true,
    });
    const id = await paidSession();
    sql
      .prepare(
        "UPDATE paid_sessions SET pay_expires_at=unixepoch()-1 WHERE id=?",
      )
      .run(id);
    expect(
      (await call("client", "GET", `/api/sessions/${id}`)).json.status,
    ).toBe("expired");
    expect(
      (await call("client", "POST", `/api/sessions/${id}/checkout`)).status,
    ).toBe(409);
  });
  it("承認時の入力検証（候補外の日時・http URL）", async () => {
    const r = await request();
    const id = r.json.id;
    expect(
      (
        await call("advisor", "POST", `/api/sessions/${id}/accept`, {
          scheduledAt: future(100),
          callUrl: "https://a.example",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call("advisor", "POST", `/api/sessions/${id}/accept`, {
          scheduledAt: JSON.parse(row(id).slots)[0],
          callUrl: "http://a.example",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call("client", "POST", `/api/sessions/${id}/accept`, {
          scheduledAt: JSON.parse(row(id).slots)[0],
          callUrl: "https://a.example",
        })
      ).status,
    ).toBe(403);
  });
  it("金額が違う入金通知は拒否する", async () => {
    const id = await paidSession();
    expect((await pay(id, { amount_total: 1 })).status).toBe(400);
    expect(row(id).status).toBe("accepted");
  });
  it("期限後に届いた入金は返金待ちになる", async () => {
    const id = await paidSession();
    sql.prepare("UPDATE paid_sessions SET status='expired' WHERE id=?").run(id);
    expect((await pay(id)).status).toBe(200);
    expect(row(id).status).toBe("refund_pending");
  });
  it("キャンセル：24時間前まで→返金、直前→返金なし、経験者都合→返金", async () => {
    let id = await paidSession();
    await pay(id);
    expect(
      (await call("client", "POST", `/api/sessions/${id}/cancel`)).json.refund,
    ).toBe(true);
    expect(row(id).status).toBe("refund_pending");
    await call("advisor", "PUT", "/api/advisor/me", {
      details: {},
      availability: "",
      accepting: true,
    });
    id = await paidSession();
    await pay(id);
    sql
      .prepare("UPDATE paid_sessions SET scheduled_at=? WHERE id=?")
      .run(future(5), id);
    expect(
      (await call("client", "POST", `/api/sessions/${id}/cancel`)).json.refund,
    ).toBe(false);
    expect(row(id).status).toBe("cancelled");
    id = await paidSession();
    await pay(id);
    sql
      .prepare("UPDATE paid_sessions SET scheduled_at=? WHERE id=?")
      .run(future(5), id);
    expect(
      (await call("advisor", "POST", `/api/sessions/${id}/cancel`)).json.refund,
    ).toBe(true);
    expect(row(id).status).toBe("refund_pending");
  });
  it("問題報告→管理画面で返金／経験者へ支払い", async () => {
    let id = await paidSession();
    await pay(id);
    sql
      .prepare("UPDATE paid_sessions SET scheduled_at=? WHERE id=?")
      .run(future(-1), id);
    expect(
      (
        await call("advisor", "POST", `/api/sessions/${id}/report`, {
          reason: "報告します",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await call("client", "POST", `/api/sessions/${id}/report`, {
          reason: "来ませんでした",
        })
      ).status,
    ).toBe(200);
    expect(row(id).status).toBe("disputed");
    expect(
      (
        await call("client", "PATCH", `/api/admin/sessions/${id}`, {
          action: "pay_advisor",
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await call("admin", "PATCH", `/api/admin/sessions/${id}`, {
          action: "pay_advisor",
          note: "実施確認",
        })
      ).status,
    ).toBe(200);
    expect(row(id).status).toBe("settled");
  });
  it("72時間を過ぎた報告は受け付けない", async () => {
    const id = await paidSession();
    await pay(id);
    sql
      .prepare(
        "UPDATE paid_sessions SET status='completed',scheduled_at=?,completed_at=unixepoch()-300000,settle_at=unixepoch()+1000 WHERE id=?",
      )
      .run(future(-80), id);
    expect(
      (
        await call("client", "POST", `/api/sessions/${id}/report`, {
          reason: "遅れた報告",
        })
      ).status,
    ).toBe(409);
  });
  it("チャットにカードが入り、他人は一覧に出ない", async () => {
    const id = await paidSession();
    expect(
      sql
        .prepare("SELECT count(*) n FROM messages WHERE body LIKE ?")
        .get("%/sessions/" + id)?.n,
    ).toBe(2);
    expect((await call("other", "GET", "/api/sessions")).json.sessions).toEqual(
      [],
    );
    expect(
      (await call("client", "GET", "/api/sessions")).json.sessions.length,
    ).toBe(1);
  });
});
