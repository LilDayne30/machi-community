import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import Stripe from "stripe";
import worker from "../worker/index";
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
});
const session = () => ({
  id: "cs_local",
  metadata: { bookingId: "b", userId: "u" },
  client_reference_id: "u",
  payment_status: "paid",
  currency: "jpy",
  amount_total: 1000,
  payment_intent: "pi_local",
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
beforeEach(() => {
  sql = new DatabaseSync(":memory:");
  sql.exec(readFileSync("migrations/0001_initial.sql", "utf8"));
  sql.exec(readFileSync("migrations/0002_direct_conversations.sql", "utf8"));
  sql.exec(readFileSync("migrations/0003_profile_photos.sql", "utf8"));
  sql.exec(readFileSync("migrations/0004_region_connections.sql", "utf8"));
  sql.exec(
    "INSERT INTO users(id,google_sub,email,name) VALUES('u','g','user@example.test','テスト'); INSERT INTO talks(id,title,category,starts_at,image,host,description) VALUES('t','会話','喫茶店','2099-01-01T12:00:00Z','/icon.svg','運営','テスト'); INSERT INTO bookings(id,talk_id,user_id,status,amount,stripe_session_id,expires_at) VALUES('b','t','u','pending',1000,'cs_local',unixepoch()+1800)",
  );
});
afterEach(() => sql.close());
describe("WorkerでのStripe通知の適用", () => {
  it("正しい入金を確定し、同じ通知を再送しても予約・メールを増やさない", async () => {
    expect((await webhook(session())).status).toBe(200);
    expect((await webhook(session())).status).toBe(200);
    expect(
      sql.prepare("SELECT status FROM bookings WHERE id='b'").get()?.status,
    ).toBe("confirmed");
    expect(sql.prepare("SELECT count(*) n FROM bookings").get()?.n).toBe(1);
    expect(sql.prepare("SELECT count(*) n FROM stripe_events").get()?.n).toBe(
      1,
    );
    expect(sql.prepare("SELECT count(*) n FROM email_outbox").get()?.n).toBe(1);
  });
  for (const [label, change] of [
    ["金額", { amount_total: 1 }],
    ["通貨", { currency: "usd" }],
    ["会員", { client_reference_id: "another-user" }],
    ["決済ID", { id: "cs_other" }],
    ["入金状態", { payment_status: "unpaid" }],
  ] as const)
    it(label + "が一致しない通知を拒否する", async () => {
      expect((await webhook({ ...session(), ...change })).status).toBe(400);
      expect(
        sql.prepare("SELECT status FROM bookings WHERE id='b'").get()?.status,
      ).toBe("pending");
    });
  it("仮押さえの期限後に届いた入金は参加確定せず返金待ちにする", async () => {
    sql.exec("UPDATE bookings SET expires_at=unixepoch()-1,status='cancelled'");
    expect((await webhook(session())).status).toBe(200);
    expect(
      sql.prepare("SELECT status FROM bookings WHERE id='b'").get()?.status,
    ).toBe("refund_pending");
  });
  it("署名なしの通知でデータを変更しない", async () => {
    const r = await worker.fetch(
      new Request("https://machi.example/api/stripe/webhook", {
        method: "POST",
        body: "{}",
      }),
      env() as any,
      { waitUntil() {} } as any,
    );
    expect(r.status).toBe(400);
    expect(sql.prepare("SELECT count(*) n FROM stripe_events").get()?.n).toBe(
      0,
    );
  });
  it("本番の未ログイン利用者には地域データを返さない", async () => {
    const r = await worker.fetch(
      new Request("https://machi.example/api/bootstrap"),
      env() as any,
      { waitUntil() {} } as any,
    );
    const data = (await r.json()) as any;
    expect(data.mode).toBe("production");
    expect(data.user).toBeNull();
    expect(data.talks).toEqual([]);
    expect(data.rooms).toEqual([]);
  });
});
