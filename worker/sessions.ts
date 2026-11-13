// Paid consultations with experienced students (phase 1). Routes are registered from worker/index.ts.
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

export const PRICE = 3500,
  ADVISOR_SHARE = 2500,
  FEE = PRICE - ADVISOR_SHARE,
  ACCEPT_HOURS = 48,
  PAY_HOURS = 24,
  REPORT_HOURS = 72,
  REFUND_CUTOFF_HOURS = 24,
  MAX_DOC_BYTES = 1_500_000;

export type SessionRow = {
  id: string;
  advisor_id: string;
  client_id: string;
  status: string;
  scheduled_at: string | null;
  amount: number;
  advisor_amount: number;
  payment_intent: string | null;
  completed_at: number | null;
  settle_at: number | null;
  [k: string]: any;
};

const detailsSchema = z
  .object({
    city: z.string().trim().max(60).default(""),
    school: z.string().trim().max(80).default(""),
    schoolPublic: z.boolean().default(false),
    stay: z.string().trim().max(80).default(""),
    agentUsed: z.enum(["", "yes", "no"]).default(""),
    costNote: z.string().trim().max(200).default(""),
    languageLevel: z.string().trim().max(80).default(""),
    hard: z.string().trim().max(500).default(""),
    good: z.string().trim().max(500).default(""),
    current: z.string().trim().max(120).default(""),
    career: z.string().trim().max(500).default(""),
    languages: z.string().trim().max(120).default(""),
    links: z
      .array(z.string().trim().url().max(300).startsWith("https://"))
      .max(3)
      .default([]),
  })
  .strict();
export type AdvisorDetails = z.infer<typeof detailsSchema>;
const dbOf = (c: any): D1Database => c.env.DB;
const parse = <T>(s: string, f: T): T => {
  try {
    return JSON.parse(s) as T;
  } catch {
    return f;
  }
};
const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .url()
  .refine(
    (v) => v.startsWith("https://"),
    "通話URLはhttps://で始まる必要があります",
  );
const isoFuture = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "日時を確認してください");

export const isAdult = (birth: string, at = new Date()) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth);
  if (!m) return false;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const cut = new Date(
    Date.UTC(at.getUTCFullYear() - 18, at.getUTCMonth(), at.getUTCDate()),
  );
  return Date.UTC(y, mo - 1, d) <= cut.getTime() && y > 1900;
};
/** Refund rule for a paid session cancelled by `by`: advisor-side cancels always refund, client cancels refund up to 24h before. */
export const refundOnCancel = (
  by: "client" | "advisor",
  scheduledAt: string | null,
  nowMs = Date.now(),
) =>
  by === "advisor" ||
  (!!scheduledAt &&
    Date.parse(scheduledAt) - nowMs >= REFUND_CUTOFF_HOURS * 3600e3);

/** Public view of an approved advisor: private school names and documents never leave the server. */
export const publicAdvisor = (row: any) => {
  const d = parse<Partial<AdvisorDetails>>(row.details, {});
  return {
    userId: row.user_id,
    accepting: !!row.accepting,
    availability: row.availability,
    verifiedAt: row.verified_at,
    details: {
      ...d,
      school: d.schoolPublic ? d.school || "" : "",
      schoolPublic: !!d.schoolPublic,
    },
    price: PRICE,
  };
};

type Deps = {
  mustUser: (c: any) => any;
  mustAdmin: (c: any) => any;
  json: <T>(c: any, s: z.ZodType<T>) => Promise<T>;
  stripe: (e: any) => any;
  queue: (
    db: D1Database,
    id: string,
    email: string,
    subject: string,
    body: string,
  ) => D1PreparedStatement;
  audit: (
    db: D1Database,
    u: any,
    action: string,
    target: string,
  ) => Promise<void>;
  isBlocked: (db: D1Database, a: string, b: string) => Promise<boolean>;
  uid: () => string;
  now: () => number;
  safeText: (s: string) => string;
  sha256: (s: string) => Promise<string>;
};

/** Apply time-based transitions. Called on reads and from the scheduled job. */
export async function sweepSessions(db: D1Database, now: number) {
  await db.batch([
    db
      .prepare(
        "UPDATE paid_sessions SET status='expired' WHERE status='requested' AND accept_expires_at<?",
      )
      .bind(now),
    db
      .prepare(
        "UPDATE paid_sessions SET status='expired' WHERE status='accepted' AND pay_expires_at<?",
      )
      .bind(now),
    db
      .prepare(
        "UPDATE paid_sessions SET status='settled' WHERE status='completed' AND settle_at<=?",
      )
      .bind(now),
  ]);
}

export function registerSessions(app: any, d: Deps) {
  const {
    mustUser,
    mustAdmin,
    json,
    stripe,
    queue,
    audit,
    uid,
    now,
    safeText,
  } = d;
  const fail = (s: number, m: string): never => {
    throw new HTTPException(s as any, { message: m });
  };
  const sessionView = (s: any, viewer: string) => ({
    id: s.id,
    role: s.advisor_id === viewer ? "advisor" : "client",
    advisorId: s.advisor_id,
    clientId: s.client_id,
    advisorName: s.advisor_name,
    clientName: s.client_name,
    roomId: s.room_id,
    status: s.status,
    topic: s.topic,
    slots: parse<string[]>(s.slots, []),
    scheduledAt: s.scheduled_at,
    // The call URL is only shown once the session is paid.
    callUrl: ["paid", "completed", "settled"].includes(s.status)
      ? s.call_url
      : null,
    amount: s.amount,
    advisorAmount: s.advisor_id === viewer ? s.advisor_amount : undefined,
    acceptExpiresAt: s.accept_expires_at,
    payExpiresAt: s.pay_expires_at,
    reportDeadline: s.completed_at
      ? s.completed_at + REPORT_HOURS * 3600
      : null,
    reportReason: s.report_reason,
    createdAt: s.created_at,
  });
  const SELECT = `SELECT s.*,a.name advisor_name,c.name client_name FROM paid_sessions s JOIN users a ON a.id=s.advisor_id JOIN users c ON c.id=s.client_id`;
  async function load(c: any, id: string, viewer: any) {
    await sweepSessions(dbOf(c), now());
    const s = await dbOf(c)
      .prepare(SELECT + " WHERE s.id=?")
      .bind(id)
      .first<any>();
    // 404 for non-participants so that other people's sessions are not discoverable.
    if (!s || (s.advisor_id !== viewer.id && s.client_id !== viewer.id))
      fail(404, "相談が見つかりません");
    return s;
  }
  async function dmRoom(db: D1Database, a: string, b: string) {
    const [low, high] = [a, b].sort();
    const id = "dm-" + (await d.sha256(JSON.stringify([low, high])));
    await db.batch([
      db
        .prepare(
          "INSERT OR IGNORE INTO rooms(id,title,subtitle,image) VALUES(?,'1対1の会話','','')",
        )
        .bind(id),
      db
        .prepare(
          "INSERT OR IGNORE INTO direct_conversations(room_id,user_low,user_high) VALUES(?,?,?)",
        )
        .bind(id, low, high),
      db
        .prepare(
          "INSERT OR IGNORE INTO room_members(room_id,user_id) VALUES(?,?),(?,?)",
        )
        .bind(id, low, id, high),
    ]);
    return id;
  }
  /** Event card in the 1:1 chat. Posted as the acting user so existing message/read logic keeps working. */
  const card = (
    db: D1Database,
    room: string,
    user: string,
    text: string,
    sid: string,
  ) =>
    db
      .prepare("INSERT INTO messages(id,room_id,user_id,body) VALUES(?,?,?,?)")
      .bind(
        uid(),
        room,
        user,
        ("【有料相談】" + text + "\n/sessions/" + sid).slice(0, 2000),
      );
  const mail = (
    db: D1Database,
    key: string,
    email: string,
    subject: string,
    body: string,
    origin: string,
    sid: string,
  ) =>
    queue(
      db,
      key,
      email,
      "Roamigo：" + subject,
      "<p>" +
        safeText(body) +
        '</p><p><a href="' +
        safeText(origin + "/sessions/" + sid) +
        '">相談の詳細を開く</a></p>',
    );
  const emailOf = (db: D1Database, id: string) =>
    db
      .prepare("SELECT email FROM users WHERE id=?")
      .bind(id)
      .first<{ email: string }>()
      .then((r) => r?.email || "");

  // ---- advisor profile & application ----
  app.get("/api/advisor/me", async (c: any) => {
    const u = mustUser(c);
    const r = await dbOf(c)
      .prepare("SELECT * FROM advisor_profiles WHERE user_id=?")
      .bind(u.id)
      .first<any>();
    const doc = await dbOf(c)
      .prepare("SELECT 1 FROM advisor_documents WHERE user_id=?")
      .bind(u.id)
      .first();
    if (!r)
      return c.json({
        status: "none",
        accepting: false,
        availability: "",
        details: detailsSchema.parse({}),
        hasDocument: false,
        price: PRICE,
      });
    return c.json({
      status: r.status,
      accepting: !!r.accepting,
      availability: r.availability,
      details: detailsSchema.parse(parse(r.details, {})),
      hasDocument: !!doc,
      reviewReason: r.review_reason,
      price: PRICE,
    });
  });
  app.put("/api/advisor/me", async (c: any) => {
    const u = mustUser(c);
    const p = await json(
      c,
      z.object({
        details: detailsSchema,
        availability: z.string().trim().max(300),
        accepting: z.boolean(),
      }),
    );
    const cur = await dbOf(c)
      .prepare("SELECT status FROM advisor_profiles WHERE user_id=?")
      .bind(u.id)
      .first<any>();
    // Approval fields are never writable here; accepting is only allowed once approved.
    if (p.accepting && cur?.status !== "approved")
      fail(403, "運営の確認が済むまで受付はONにできません");
    await dbOf(c)
      .prepare(
        `INSERT INTO advisor_profiles(user_id,status,accepting,availability,details) VALUES(?,'none',0,?,?) ON CONFLICT(user_id) DO UPDATE SET accepting=?,availability=?,details=?,updated_at=CURRENT_TIMESTAMP`,
      )
      .bind(
        u.id,
        p.availability,
        JSON.stringify(p.details),
        p.accepting ? 1 : 0,
        p.availability,
        JSON.stringify(p.details),
      )
      .run();
    return c.json({ ok: true });
  });
  app.put("/api/advisor/document", async (c: any) => {
    const u = mustUser(c);
    const mime = (c.req.header("content-type") || "").split(";")[0];
    if (!["image/jpeg", "image/png", "application/pdf"].includes(mime))
      fail(415, "JPEG・PNG・PDFのみアップロードできます");
    const buf = new Uint8Array(await c.req.arrayBuffer());
    if (!buf.length || buf.length > MAX_DOC_BYTES)
      fail(413, "ファイルは1.5MB以下にしてください");
    const cur = await dbOf(c)
      .prepare("SELECT status FROM advisor_profiles WHERE user_id=?")
      .bind(u.id)
      .first<any>();
    if (cur?.status === "approved" || cur?.status === "suspended")
      fail(409, "確認済みのため書類は不要です");
    await dbOf(c)
      .prepare(
        "INSERT INTO advisor_documents(user_id,mime,data) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET mime=?,data=?,created_at=CURRENT_TIMESTAMP",
      )
      .bind(u.id, mime, buf, mime, buf)
      .run();
    return c.json({ ok: true });
  });
  app.post("/api/advisor/apply", async (c: any) => {
    const u = mustUser(c),
      db = dbOf(c);
    const p = await json(
      c,
      z.object({
        birthDate: z.string(),
        termsAgreed: z.literal(true, {
          message: "経験者規約への同意が必要です",
        }),
      }),
    );
    if (!isAdult(p.birthDate))
      fail(403, "有料相談を受けられるのは18歳以上の方のみです");
    const cur = await db
      .prepare("SELECT status FROM advisor_profiles WHERE user_id=?")
      .bind(u.id)
      .first<any>();
    if (!cur) fail(400, "先にプロフィール（経験の内容）を保存してください");
    if (["pending", "approved", "suspended"].includes(cur.status))
      fail(409, "すでに申請済みです");
    if (
      !(await db
        .prepare("SELECT 1 FROM advisor_documents WHERE user_id=?")
        .bind(u.id)
        .first())
    )
      fail(400, "在籍・修了がわかる書類をアップロードしてください");
    await db
      .prepare(
        "UPDATE advisor_profiles SET status='pending',birth_date=?,terms_agreed_at=CURRENT_TIMESTAMP,applied_at=CURRENT_TIMESTAMP,review_reason='' WHERE user_id=?",
      )
      .bind(p.birthDate, u.id)
      .run();
    return c.json({ ok: true }, 201);
  });
  app.get("/api/advisors/:id", async (c: any) => {
    mustUser(c);
    const r = await dbOf(c)
      .prepare(
        "SELECT * FROM advisor_profiles WHERE user_id=? AND status='approved'",
      )
      .bind(c.req.param("id"))
      .first<any>();
    if (!r) fail(404, "有料相談の受付はありません");
    return c.json(publicAdvisor(r));
  });
  app.get("/api/advisor/earnings", async (c: any) => {
    const u = mustUser(c);
    await sweepSessions(dbOf(c), now());
    const rs = await dbOf(c)
      .prepare(
        `SELECT substr(scheduled_at,1,7) month,status,count(*) n,sum(advisor_amount) total,sum(CASE WHEN payout_paid_at IS NOT NULL THEN advisor_amount ELSE 0 END) paid FROM paid_sessions WHERE advisor_id=? AND status IN ('paid','completed','settled') GROUP BY month,status ORDER BY month DESC`,
      )
      .bind(u.id)
      .all<any>();
    const months: Record<string, any> = {};
    for (const r of rs.results) {
      const m = (months[r.month] ||= {
        month: r.month,
        settledCount: 0,
        payable: 0,
        paid: 0,
        upcoming: 0,
      });
      if (r.status === "settled") {
        m.settledCount += r.n;
        m.paid += r.paid;
        m.payable += r.total - r.paid;
      } else m.upcoming += r.total;
    }
    return c.json({ months: Object.values(months) });
  });

  // ---- sessions ----
  app.post("/api/sessions", async (c: any) => {
    const u = mustUser(c),
      db = dbOf(c);
    const p = await json(
      c,
      z.object({
        advisorId: z.string().min(1),
        topic: z
          .string()
          .trim()
          .min(10, "相談したいことは10文字以上で入力してください")
          .max(1000),
        slots: z.array(isoFuture).length(3, "候補日時を3つ入力してください"),
        minor: z.boolean().default(false),
        guardianConsent: z.boolean().default(false),
      }),
    );
    if (p.advisorId === u.id) fail(400, "自分には申し込めません");
    if (p.minor && !p.guardianConsent)
      fail(400, "18歳未満の方は保護者の同意が必要です");
    const adv = await db
      .prepare(
        "SELECT a.*,u.email,u.account_status FROM advisor_profiles a JOIN users u ON u.id=a.user_id WHERE a.user_id=?",
      )
      .bind(p.advisorId)
      .first<any>();
    if (
      !adv ||
      adv.status !== "approved" ||
      !adv.accepting ||
      adv.account_status !== "active"
    )
      fail(403, "この方は現在有料相談を受け付けていません");
    if (await d.isBlocked(db, u.id, p.advisorId))
      fail(403, "この相手には申し込めません");
    const slots = p.slots.map((s) => Date.parse(s));
    if (
      slots.some(
        (t) => t < Date.now() + 3600e3 || t > Date.now() + 60 * 86400e3,
      )
    )
      fail(400, "候補日時は1時間後から60日以内で選んでください");
    const recent = await db
      .prepare(
        "SELECT count(*) n FROM paid_sessions WHERE client_id=? AND created_at>datetime('now','-1 day')",
      )
      .bind(u.id)
      .first<any>();
    if (recent.n >= 5)
      fail(429, "本日の申込み上限です。明日以降にお試しください");
    const id = uid(),
      room = await dmRoom(db, u.id, p.advisorId);
    try {
      await db.batch([
        db
          .prepare(
            `INSERT INTO paid_sessions(id,advisor_id,client_id,room_id,topic,slots,minor_consent,amount,advisor_amount,fee_amount,accept_expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
          )
          .bind(
            id,
            p.advisorId,
            u.id,
            room,
            p.topic,
            JSON.stringify(slots.map((t) => new Date(t).toISOString())),
            p.minor ? 1 : 0,
            PRICE,
            ADVISOR_SHARE,
            FEE,
            now() + ACCEPT_HOURS * 3600,
          ),
        card(
          db,
          room,
          u.id,
          "30分の相談が申し込まれました。48時間以内にご返答ください。",
          id,
        ),
        mail(
          db,
          "sess-req:" + id,
          adv.email,
          "有料相談の申込みが届きました",
          "新しい有料相談の申込みがあります。48時間以内に承認または辞退してください。",
          c.env.APP_ORIGIN,
          id,
        ),
      ]);
    } catch {
      fail(409, "この方への申込みはすでに進行中です");
    }
    return c.json({ id }, 201);
  });
  app.get("/api/sessions", async (c: any) => {
    const u = mustUser(c);
    await sweepSessions(dbOf(c), now());
    const rs = await dbOf(c)
      .prepare(
        SELECT +
          " WHERE s.advisor_id=? OR s.client_id=? ORDER BY s.created_at DESC LIMIT 200",
      )
      .bind(u.id, u.id)
      .all<any>();
    return c.json({
      sessions: rs.results.map((s: any) => sessionView(s, u.id)),
    });
  });
  app.get("/api/sessions/:id", async (c: any) => {
    const u = mustUser(c);
    return c.json(sessionView(await load(c, c.req.param("id"), u), u.id));
  });
  app.post("/api/sessions/:id/accept", async (c: any) => {
    const u = mustUser(c),
      db = dbOf(c);
    const s = await load(c, c.req.param("id"), u);
    if (s.advisor_id !== u.id) fail(403, "経験者のみ承認できます");
    const p = await json(
      c,
      z.object({ scheduledAt: isoFuture, callUrl: httpsUrl }),
    );
    const slots = parse<string[]>(s.slots, []).map((x) => Date.parse(x));
    if (!slots.includes(Date.parse(p.scheduledAt)))
      fail(400, "候補の中から日時を選んでください");
    if (Date.parse(p.scheduledAt) < Date.now() + 3600e3)
      fail(400, "この日時は近すぎます。別の候補を選ぶか辞退してください");
    const adv = await db
      .prepare("SELECT status,accepting FROM advisor_profiles WHERE user_id=?")
      .bind(u.id)
      .first<any>();
    if (adv?.status !== "approved")
      fail(403, "承認済みの経験者のみ受けられます");
    const r = await db
      .prepare(
        "UPDATE paid_sessions SET status='accepted',scheduled_at=?,call_url=?,pay_expires_at=? WHERE id=? AND status='requested'",
      )
      .bind(
        new Date(p.scheduledAt).toISOString(),
        p.callUrl,
        now() + PAY_HOURS * 3600,
        s.id,
      )
      .run();
    if (!r.meta.changes) fail(409, "この相談は承認できる状態ではありません");
    await db.batch([
      card(
        db,
        s.room_id,
        u.id,
        "相談が承認されました。24時間以内にお支払いください。",
        s.id,
      ),
      mail(
        db,
        "sess-acc:" + s.id,
        await emailOf(db, s.client_id),
        "有料相談が承認されました",
        "24時間以内にお支払いいただくと日時が確定します。",
        c.env.APP_ORIGIN,
        s.id,
      ),
    ]);
    return c.json({ ok: true });
  });
  app.post("/api/sessions/:id/decline", async (c: any) => {
    const u = mustUser(c),
      db = dbOf(c);
    const s = await load(c, c.req.param("id"), u);
    if (s.advisor_id !== u.id) fail(403, "経験者のみ辞退できます");
    const r = await db
      .prepare(
        "UPDATE paid_sessions SET status='declined' WHERE id=? AND status='requested'",
      )
      .bind(s.id)
      .run();
    if (!r.meta.changes) fail(409, "この相談は辞退できる状態ではありません");
    await db.batch([
      card(
        db,
        s.room_id,
        u.id,
        "今回の相談は辞退されました。料金は発生していません。",
        s.id,
      ),
      mail(
        db,
        "sess-dec:" + s.id,
        await emailOf(db, s.client_id),
        "有料相談は辞退されました",
        "料金は発生していません。",
        c.env.APP_ORIGIN,
        s.id,
      ),
    ]);
    return c.json({ ok: true });
  });
  app.post("/api/sessions/:id/checkout", async (c: any) => {
    const u = mustUser(c),
      db = dbOf(c);
    const s = await load(c, c.req.param("id"), u);
    if (s.client_id !== u.id) fail(403, "申込者のみお支払いできます");
    if (s.status !== "accepted" || s.pay_expires_at <= now())
      fail(409, "お支払いできる状態ではありません");
    if (s.stripe_session_id) {
      const old = await stripe(c.env).checkout.sessions.retrieve(
        s.stripe_session_id,
      );
      if (old.status === "open" && old.url) return c.json({ url: old.url });
    }
    const session = await stripe(c.env).checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        client_reference_id: u.id,
        customer_email: u.email,
        line_items: [
          {
            price_data: {
              currency: "jpy",
              unit_amount: s.amount,
              product_data: {
                name: "経験者との30分相談（" + s.advisor_name + "さん）",
              },
            },
            quantity: 1,
          },
        ],
        metadata: { paidSessionId: s.id, userId: u.id },
        success_url: c.env.APP_ORIGIN + "/sessions/" + s.id + "/paid",
        cancel_url:
          c.env.APP_ORIGIN + "/sessions/" + s.id + "?payment=cancelled",
        expires_at: now() + 1800,
      },
      { idempotencyKey: "paid-session:" + s.id + ":" + uid() },
    );
    await db
      .prepare(
        "UPDATE paid_sessions SET stripe_session_id=? WHERE id=? AND status='accepted'",
      )
      .bind(session.id, s.id)
      .run();
    return c.json({ url: session.url });
  });
  app.post("/api/sessions/:id/cancel", async (c: any) => {
    const u = mustUser(c),
      db = dbOf(c);
    const s = await load(c, c.req.param("id"), u);
    const by = s.advisor_id === u.id ? "advisor" : "client";
    if (!["requested", "accepted", "paid"].includes(s.status))
      fail(409, "この相談はキャンセルできません");
    if (
      s.status === "paid" &&
      s.scheduled_at &&
      Date.parse(s.scheduled_at) < Date.now() - 30 * 60e3
    )
      fail(409, "実施時刻を過ぎています。問題がある場合は報告してください");
    const refund = s.status === "paid" && refundOnCancel(by, s.scheduled_at);
    if (s.status === "accepted" && s.stripe_session_id)
      await stripe(c.env)
        .checkout.sessions.expire(s.stripe_session_id)
        .catch(() => {});
    const next = refund ? "refund_pending" : "cancelled";
    const r = await db
      .prepare(
        "UPDATE paid_sessions SET status=?,cancelled_by=? WHERE id=? AND status=?",
      )
      .bind(next, by, s.id, s.status)
      .run();
    if (!r.meta.changes)
      fail(409, "状態が変わりました。再読み込みしてください");
    const other = by === "advisor" ? s.client_id : s.advisor_id;
    await db.batch([
      card(
        db,
        s.room_id,
        u.id,
        "相談がキャンセルされました。" +
          (refund
            ? "全額を返金します。"
            : s.status === "paid"
              ? "規定により返金はありません。"
              : ""),
        s.id,
      ),
      mail(
        db,
        "sess-can:" + s.id,
        await emailOf(db, other),
        "有料相談がキャンセルされました",
        refund ? "全額返金の対象です。" : "相談はキャンセルされました。",
        c.env.APP_ORIGIN,
        s.id,
      ),
    ]);
    return c.json({ ok: true, refund });
  });
  app.post("/api/sessions/:id/complete", async (c: any) => {
    const u = mustUser(c),
      db = dbOf(c);
    const s = await load(c, c.req.param("id"), u);
    if (s.advisor_id !== u.id) fail(403, "経験者のみ記録できます");
    if (s.status !== "paid" || Date.parse(s.scheduled_at) > Date.now())
      fail(409, "開始時刻の後に記録できます");
    const t = now();
    const r = await db
      .prepare(
        "UPDATE paid_sessions SET status='completed',completed_at=?,settle_at=? WHERE id=? AND status='paid'",
      )
      .bind(t, t + REPORT_HOURS * 3600, s.id)
      .run();
    if (!r.meta.changes)
      fail(409, "状態が変わりました。再読み込みしてください");
    await db.batch([
      card(
        db,
        s.room_id,
        u.id,
        "相談が実施されました。問題があれば72時間以内に報告できます。",
        s.id,
      ),
    ]);
    return c.json({ ok: true });
  });
  app.post("/api/sessions/:id/report", async (c: any) => {
    const u = mustUser(c),
      db = dbOf(c);
    const s = await load(c, c.req.param("id"), u);
    if (s.client_id !== u.id) fail(403, "申込者のみ報告できます");
    const p = await json(
      c,
      z.object({
        reason: z
          .string()
          .trim()
          .min(5, "内容を5文字以上で入力してください")
          .max(1000),
      }),
    );
    // Allowed after the start time (no-show) or after completion, within 72h.
    const started = s.scheduled_at && Date.parse(s.scheduled_at) <= Date.now();
    const within = s.completed_at
      ? now() <= s.completed_at + REPORT_HOURS * 3600
      : started &&
        Date.now() <= Date.parse(s.scheduled_at) + REPORT_HOURS * 3600e3;
    if (!["paid", "completed"].includes(s.status) || !started || !within)
      fail(409, "報告できる期間ではありません");
    const r = await db
      .prepare(
        "UPDATE paid_sessions SET status='disputed',report_reason=? WHERE id=? AND status IN ('paid','completed')",
      )
      .bind(p.reason, s.id)
      .run();
    if (!r.meta.changes)
      fail(409, "状態が変わりました。再読み込みしてください");
    await audit(db, u, "session_reported", s.id);
    return c.json({ ok: true });
  });

  // ---- admin ----
  app.get("/api/admin/advisors", async (c: any) => {
    mustAdmin(c);
    const rs = await dbOf(c)
      .prepare(
        `SELECT a.user_id,a.status,a.accepting,a.birth_date,a.details,a.applied_at,a.verified_at,a.review_reason,u.name,u.email,(SELECT mime FROM advisor_documents d WHERE d.user_id=a.user_id) doc_mime FROM advisor_profiles a JOIN users u ON u.id=a.user_id WHERE a.status!='none' ORDER BY CASE a.status WHEN 'pending' THEN 0 ELSE 1 END,a.applied_at DESC LIMIT 300`,
      )
      .all<any>();
    return c.json({
      advisors: rs.results.map((r: any) => ({
        ...r,
        details: parse(r.details, {}),
        hasDocument: !!r.doc_mime,
        doc_mime: undefined,
      })),
    });
  });
  app.get("/api/admin/advisors/:id/document", async (c: any) => {
    const u = mustAdmin(c);
    const r = await dbOf(c)
      .prepare("SELECT mime,data FROM advisor_documents WHERE user_id=?")
      .bind(c.req.param("id"))
      .first<any>();
    if (!r) fail(404, "書類はありません");
    await audit(dbOf(c), u, "advisor_document_viewed", c.req.param("id"));
    return new Response(new Uint8Array(r.data), {
      headers: {
        "content-type": r.mime,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "content-disposition": "inline",
      },
    });
  });
  app.patch("/api/admin/advisors/:id", async (c: any) => {
    const u = mustAdmin(c),
      db = dbOf(c),
      id = c.req.param("id");
    const p = await json(
      c,
      z.object({
        action: z.enum([
          "approve",
          "reject",
          "suspend",
          "resume",
          "clear_links",
        ]),
        reason: z.string().trim().max(300).default(""),
      }),
    );
    const a = await db
      .prepare("SELECT status FROM advisor_profiles WHERE user_id=?")
      .bind(id)
      .first<any>();
    if (!a) fail(404, "経験者が見つかりません");
    if (p.action === "clear_links") {
      if (!p.reason) fail(400, "差し戻す理由を入力してください");
      const cur = await dbOf(c)
        .prepare("SELECT details FROM advisor_profiles WHERE user_id=?")
        .bind(id)
        .first<any>();
      const d = parse<any>(cur?.details || "{}", {});
      d.links = [];
      await dbOf(c)
        .prepare(
          "UPDATE advisor_profiles SET details=?,review_reason=? WHERE user_id=?",
        )
        .bind(JSON.stringify(d), p.reason, id)
        .run();
      await audit(dbOf(c), u, "advisor_links_cleared", id);
      return c.json({ ok: true });
    }
    const rule: Record<string, [string[], string]> = {
      approve: [["pending"], "approved"],
      reject: [["pending"], "rejected"],
      suspend: [["approved"], "suspended"],
      resume: [["suspended"], "approved"],
    };
    const [from, to] = rule[p.action];
    if ((p.action === "reject" || p.action === "suspend") && !p.reason)
      fail(400, "理由を入力してください");
    if (!from.includes(a.status)) fail(409, "この操作はできない状態です");
    const stmts = [
      db
        .prepare(
          `UPDATE advisor_profiles SET status=?,review_reason=?,accepting=CASE WHEN ?='approved' THEN accepting ELSE 0 END,verified_at=CASE WHEN ?='approve' THEN CURRENT_TIMESTAMP ELSE verified_at END,verified_by=CASE WHEN ?='approve' THEN ? ELSE verified_by END WHERE user_id=?`,
        )
        .bind(to, p.reason, to, p.action, p.action, u.id, id),
    ];
    // The document is deleted as soon as the review is done; only the date and reviewer remain.
    if (p.action === "approve" || p.action === "reject")
      stmts.push(
        db.prepare("DELETE FROM advisor_documents WHERE user_id=?").bind(id),
      );
    await db.batch(stmts);
    await audit(db, u, "advisor_" + p.action, id);
    return c.json({ ok: true });
  });
  app.get("/api/admin/advisors/:id/summary", async (c: any) => {
    mustAdmin(c);
    const id = c.req.param("id");
    await sweepSessions(dbOf(c), now());
    const a = await dbOf(c)
      .prepare(
        "SELECT a.status,a.accepting,a.verified_at,v.name verified_by_name FROM advisor_profiles a LEFT JOIN users v ON v.id=a.verified_by WHERE a.user_id=?",
      )
      .bind(id)
      .first<any>();
    const as = await dbOf(c)
      .prepare(
        "SELECT status,count(*) n,sum(advisor_amount) total FROM paid_sessions WHERE advisor_id=? GROUP BY status",
      )
      .bind(id)
      .all<any>();
    const cl = await dbOf(c)
      .prepare(
        "SELECT status,count(*) n,sum(amount) total FROM paid_sessions WHERE client_id=? GROUP BY status",
      )
      .bind(id)
      .all<any>();
    return c.json({
      advisor: a
        ? {
            status: a.status,
            accepting: !!a.accepting,
            verifiedAt: a.verified_at,
            verifiedBy: a.verified_by_name,
          }
        : null,
      asAdvisor: as.results,
      asClient: cl.results,
    });
  });
  app.get("/api/admin/sessions", async (c: any) => {
    mustAdmin(c);
    await sweepSessions(dbOf(c), now());
    const rs = await dbOf(c)
      .prepare(
        SELECT +
          " ORDER BY CASE s.status WHEN 'disputed' THEN 0 WHEN 'refund_pending' THEN 1 ELSE 2 END,s.created_at DESC LIMIT 300",
      )
      .all<any>();
    const sum = await dbOf(c)
      .prepare(
        "SELECT status,count(*) n,sum(amount) amount,sum(advisor_amount) advisor,sum(fee_amount) fee FROM paid_sessions GROUP BY status",
      )
      .all<any>();
    return c.json({
      sessions: rs.results.map((s: any) => ({
        ...sessionView(s, s.advisor_id),
        callUrl: undefined,
        payoutPaidAt: s.payout_paid_at,
        resolution: s.resolution,
      })),
      summary: sum.results,
    });
  });
  app.patch("/api/admin/sessions/:id", async (c: any) => {
    const u = mustAdmin(c),
      db = dbOf(c),
      id = c.req.param("id");
    const p = await json(
      c,
      z.object({
        action: z.enum(["refund", "pay_advisor"]),
        note: z.string().trim().max(300).default(""),
      }),
    );
    const s = await db
      .prepare("SELECT * FROM paid_sessions WHERE id=?")
      .bind(id)
      .first<any>();
    if (!s) fail(404, "相談が見つかりません");
    if (p.action === "refund") {
      if (
        !["disputed", "refund_pending"].includes(s.status) ||
        !s.payment_intent
      )
        fail(409, "返金できる状態ではありません");
      await stripe(c.env).refunds.create(
        { payment_intent: s.payment_intent },
        { idempotencyKey: "refund-session:" + id },
      );
      await db
        .prepare(
          "UPDATE paid_sessions SET status='refunded',resolution=? WHERE id=?",
        )
        .bind(p.note || "返金", id)
        .run();
    } else {
      if (s.status !== "disputed")
        fail(409, "問題報告中の相談のみ操作できます");
      await db
        .prepare(
          "UPDATE paid_sessions SET status='settled',settle_at=?,resolution=? WHERE id=?",
        )
        .bind(now(), p.note || "経験者へ支払い", id)
        .run();
    }
    await audit(db, u, "session_" + p.action, id);
    return c.json({ ok: true });
  });
  app.get("/api/admin/payouts", async (c: any) => {
    mustAdmin(c);
    const month = /^\d{4}-\d{2}$/.test(c.req.query("month") || "")
      ? c.req.query("month")
      : new Date().toISOString().slice(0, 7);
    await sweepSessions(dbOf(c), now());
    const rs = await dbOf(c)
      .prepare(
        `SELECT s.advisor_id,u.name,u.email,count(*) n,sum(s.advisor_amount) total,sum(CASE WHEN s.payout_paid_at IS NOT NULL THEN 1 ELSE 0 END) paid_n FROM paid_sessions s JOIN users u ON u.id=s.advisor_id WHERE s.status='settled' AND substr(s.scheduled_at,1,7)=? GROUP BY s.advisor_id ORDER BY u.name`,
      )
      .bind(month)
      .all<any>();
    return c.json({
      month,
      payouts: rs.results.map((r: any) => ({
        advisorId: r.advisor_id,
        name: r.name,
        email: r.email,
        count: r.n,
        total: r.total,
        paid: r.paid_n === r.n,
      })),
    });
  });
  app.post("/api/admin/payouts", async (c: any) => {
    const u = mustAdmin(c);
    const p = await json(
      c,
      z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
        advisorId: z.string(),
      }),
    );
    const r = await dbOf(c)
      .prepare(
        "UPDATE paid_sessions SET payout_paid_at=CURRENT_TIMESTAMP WHERE advisor_id=? AND status='settled' AND substr(scheduled_at,1,7)=? AND payout_paid_at IS NULL",
      )
      .bind(p.advisorId, p.month)
      .run();
    if (!r.meta.changes) fail(409, "支払済みにできる精算対象がありません");
    await audit(dbOf(c), u, "payout_paid", p.advisorId + ":" + p.month);
    return c.json({ ok: true });
  });
}

/** Webhook: returns true when the event belonged to a paid session. */
export async function handleSessionPayment(
  db: D1Database,
  s: any,
  nowSec: number,
  queueFn: Deps["queue"],
  origin: string,
): Promise<boolean> {
  const sid = s.metadata?.paidSessionId;
  if (!sid) return false;
  const row = await db
    .prepare("SELECT * FROM paid_sessions WHERE id=?")
    .bind(sid)
    .first<any>();
  if (
    !row ||
    s.payment_status !== "paid" ||
    s.currency !== "jpy" ||
    s.amount_total !== row.amount ||
    s.metadata?.userId !== row.client_id ||
    s.client_reference_id !== row.client_id ||
    s.id !== row.stripe_session_id
  )
    throw new HTTPException(400, { message: "決済内容が相談と一致しません" });
  const pi =
    typeof s.payment_intent === "string"
      ? s.payment_intent
      : s.payment_intent?.id || null;
  const ok =
    row.status === "accepted" &&
    row.pay_expires_at > nowSec - 1800 &&
    Date.parse(row.scheduled_at) > Date.now();
  if (
    row.status === "accepted" ||
    row.status === "expired" ||
    row.status === "cancelled"
  ) {
    await db
      .prepare(
        "UPDATE paid_sessions SET status=?,payment_intent=?,paid_at=? WHERE id=? AND status IN ('accepted','expired','cancelled')",
      )
      .bind(ok ? "paid" : "refund_pending", pi, nowSec, sid)
      .run();
    const [client, advisor] = await Promise.all([
      db
        .prepare("SELECT email FROM users WHERE id=?")
        .bind(row.client_id)
        .first<any>(),
      db
        .prepare("SELECT email FROM users WHERE id=?")
        .bind(row.advisor_id)
        .first<any>(),
    ]);
    const link =
      '<p><a href="' +
      origin +
      "/sessions/" +
      sid +
      '">相談の詳細を開く</a></p>';
    await db.batch([
      queueFn(
        db,
        "sess-paid:" + sid,
        client.email,
        ok
          ? "Roamigo：有料相談が確定しました"
          : "Roamigo：返金手続きを受け付けました",
        (ok
          ? "<p>お支払いを確認し、日時が確定しました。</p>"
          : "<p>期限を過ぎていたため、全額返金します。</p>") + link,
      ),
      ...(ok
        ? [
            queueFn(
              db,
              "sess-paid-adv:" + sid,
              advisor.email,
              "Roamigo：有料相談が確定しました",
              "<p>お支払いが完了し、日時が確定しました。</p>" + link,
            ),
          ]
        : []),
      ...(ok && row.room_id
        ? [
            db
              .prepare(
                "INSERT INTO messages(id,room_id,user_id,body) VALUES(?,?,?,?)",
              )
              .bind(
                crypto.randomUUID(),
                row.room_id,
                row.client_id,
                "【有料相談】お支払いが完了し、日時が確定しました。\n/sessions/" +
                  sid,
              ),
          ]
        : []),
    ]);
  }
  return true;
}

/** Scheduled job: sweep and process pending refunds. */
export async function sessionsCron(
  db: D1Database,
  nowSec: number,
  refund: (pi: string, key: string) => Promise<void>,
) {
  await sweepSessions(db, nowSec);
  const rs = await db
    .prepare(
      "SELECT id,payment_intent FROM paid_sessions WHERE status='refund_pending' AND payment_intent IS NOT NULL LIMIT 20",
    )
    .all<any>();
  for (const r of rs.results) {
    try {
      await refund(r.payment_intent, "refund-session:" + r.id);
      await db
        .prepare(
          "UPDATE paid_sessions SET status='refunded' WHERE id=? AND status='refund_pending'",
        )
        .bind(r.id)
        .run();
    } catch {
      /* retried next run; idempotency key prevents duplicate refunds */
    }
  }
}
