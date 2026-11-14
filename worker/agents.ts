// 留学エージェント向けの画面のAPI（掲載情報の編集、受け取った相談、相談ごとのやり取り）。
// worker/index.ts から登録する。
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
  FEE_TYPES,
  LINK_KINDS,
  MATERIAL_KINDS,
  SEMINAR_FORMATS,
  withAgentDefaults,
  type AgentDetails,
  type PublicAgent,
} from "../src/lib/agents";

const parse = <T>(s: string | null | undefined, f: T): T => {
  try {
    return s ? (JSON.parse(s) as T) : f;
  } catch {
    return f;
  }
};
const text = (max: number) =>
  z.string().trim().max(max, `${max}文字以内で入力してください`).default("");
const url = z
  .string()
  .trim()
  .max(500, "URLは500文字以内で入力してください")
  .refine(
    (v) => /^https?:\/\/[^\s]+$/i.test(v) && URL.canParse(v),
    "URLは https:// から始まる形で入力してください",
  );
const optionalUrl = z.union([z.literal(""), url]).default("");
const keys = <T extends Record<string, string>>(o: T) =>
  Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];
const list = (max: number, n: number) =>
  z.array(z.string().trim().min(1).max(max)).max(n).default([]);

export const agentDetailsSchema = z
  .object({
    tagline: text(80),
    staffTitle: text(40),
    staffMessage: text(500),
    countries: list(30, 30),
    programs: list(40, 20),
    audiences: list(20, 10),
    services: list(40, 20),
    feeType: z.enum(["", ...keys(FEE_TYPES)]).default(""),
    feeNote: text(800),
    methods: list(20, 6),
    hours: text(100),
    responseTime: text(40),
    languages: text(100),
    offices: z
      .array(z.object({ name: text(60), address: text(120) }).strict())
      .max(10)
      .default([]),
    localSupport: text(400),
    founded: text(20),
    track: text(300),
    memberships: text(300),
    license: text(120),
    website: optionalUrl,
    links: z
      .array(
        z
          .object({
            kind: z.enum(keys(LINK_KINDS)),
            url,
            label: text(40),
          })
          .strict(),
      )
      .max(12, "リンクは12件までです")
      .default([]),
    seminars: z
      .array(
        z
          .object({
            title: z
              .string()
              .trim()
              .min(1, "説明会名を入力してください")
              .max(80),
            date: z
              .string()
              .regex(/^\d{4}-\d{2}-\d{2}$/, "説明会の日付を入力してください"),
            time: text(20),
            format: z.enum(keys(SEMINAR_FORMATS)),
            place: text(80),
            url: optionalUrl,
            note: text(300),
          })
          .strict(),
      )
      .max(20, "説明会は20件までです")
      .default([]),
    materials: z
      .array(
        z
          .object({
            title: z.string().trim().min(1, "資料名を入力してください").max(80),
            kind: z.enum(keys(MATERIAL_KINDS)),
            url,
            note: text(200),
          })
          .strict(),
      )
      .max(20, "資料は20件までです")
      .default([]),
    faq: z
      .array(
        z
          .object({
            q: z.string().trim().min(1, "質問を入力してください").max(120),
            a: z.string().trim().min(1, "回答を入力してください").max(800),
          })
          .strict(),
      )
      .max(15, "よくある質問は15件までです")
      .default([]),
  })
  .strict();

export const agentProfileSchema = z.object({
  name: z.string().trim().min(1, "担当者名を入力してください").max(100),
  organization: z
    .string()
    .trim()
    .min(1, "所属（会社・団体名）を入力してください")
    .max(100),
  theme: z.string().trim().min(1, "得意分野を入力してください").max(100),
  bio: text(1500),
  details: agentDetailsSchema,
});

type Deps = {
  mustUser: (c: any) => any;
  json: <T>(c: any, s: z.ZodType<T>) => Promise<T>;
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
  uid: () => string;
  safeText: (s: string) => string;
  avatarUrl: (id: string, version?: string) => string;
};

/** 公開してよい項目だけを返す（メールアドレスや審査情報は含めない）。 */
export const publicAgent = (
  row: any,
  avatarUrl: Deps["avatarUrl"],
): PublicAgent => ({
  id: row.id,
  name: row.name,
  organization: row.organization || "",
  theme: row.theme,
  bio: row.bio,
  verified: !!row.verified,
  avatarUrl: avatarUrl(row.user_id, row.photo_version),
  details: withAgentDefaults(parse<Partial<AgentDetails>>(row.details, {})),
});
export const PUBLIC_AGENT_SQL =
  "SELECT p.*,ph.version photo_version FROM providers p JOIN users u ON u.id=p.user_id LEFT JOIN profile_photos ph ON ph.user_id=p.user_id";

export function registerAgents(app: any, d: Deps) {
  const { mustUser, json, queue, audit, uid, safeText, avatarUrl } = d;
  const fail = (s: number, m: string): never => {
    throw new HTTPException(s as any, { message: m });
  };
  const db = (c: any): D1Database => c.env.DB;
  async function myAgent(c: any) {
    const u = mustUser(c);
    const p = await db(c)
      .prepare(PUBLIC_AGENT_SQL + " WHERE p.user_id=?")
      .bind(u.id)
      .first<any>();
    if (!p || u.role !== "provider")
      fail(403, "留学エージェントとして登録されたアカウントで利用できます");
    return { u, p };
  }

  // ---- 掲載情報 ----
  app.get("/api/agent/me", async (c: any) => {
    const { p } = await myAgent(c);
    const counts = await db(c)
      .prepare(
        "SELECT sum(status='submitted') fresh,sum(status='accepted') active,count(*) total FROM consultations WHERE provider_id=?",
      )
      .bind(p.id)
      .first<any>();
    return c.json({
      agent: publicAgent(p, avatarUrl),
      counts: {
        fresh: counts?.fresh || 0,
        active: counts?.active || 0,
        total: counts?.total || 0,
      },
    });
  });
  app.put("/api/agent/me", async (c: any) => {
    const { u, p } = await myAgent(c);
    const b = await json(c, agentProfileSchema);
    await db(c)
      .prepare(
        "UPDATE providers SET name=?,organization=?,theme=?,bio=?,details=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
      )
      .bind(
        b.name,
        b.organization,
        b.theme,
        b.bio,
        JSON.stringify(b.details),
        p.id,
      )
      .run();
    await audit(db(c), u, "agent_profile_update", p.id);
    return c.json({ ok: true });
  });
  // 公開ページ。本人は確認前でも自分のページを確認できる。
  app.get("/api/agents/:id", async (c: any) => {
    const u = mustUser(c);
    const p = await db(c)
      .prepare(PUBLIC_AGENT_SQL + " WHERE p.id=? AND u.account_status='active'")
      .bind(c.req.param("id"))
      .first<any>();
    if (!p || (!p.verified && p.user_id !== u.id))
      fail(404, "エージェントが見つかりません");
    return c.json({
      agent: publicAgent(p, avatarUrl),
      own: p.user_id === u.id,
    });
  });

  // ---- 受け取った相談 ----
  app.get("/api/agent/consultations", async (c: any) => {
    const { p } = await myAgent(c);
    const rs = await db(c)
      .prepare(
        `SELECT c.id,c.title,c.budget,c.desired_date date,c.status,c.created_at createdAt,u.name sender,
          (SELECT count(*) FROM consultation_messages m WHERE m.consultation_id=c.id) replies,
          (SELECT max(created_at) FROM consultation_messages m WHERE m.consultation_id=c.id) lastAt
         FROM consultations c JOIN users u ON u.id=c.user_id WHERE c.provider_id=? ORDER BY c.created_at DESC LIMIT 200`,
      )
      .bind(p.id)
      .all<any>();
    return c.json({ consultations: rs.results });
  });
  app.patch("/api/agent/consultations/:id", async (c: any) => {
    const { u, p } = await myAgent(c);
    const b = await json(
      c,
      z.object({ status: z.enum(["accepted", "completed", "cancelled"]) }),
    );
    const r = await db(c)
      .prepare("UPDATE consultations SET status=? WHERE id=? AND provider_id=?")
      .bind(b.status, c.req.param("id"), p.id)
      .run();
    if (!r.meta.changes) fail(404, "相談が見つかりません");
    await audit(db(c), u, "agent_consultation:" + b.status, c.req.param("id"));
    return c.json({ ok: true });
  });

  // ---- 相談ごとのやり取り（相談した本人と、相談先のエージェントだけが見られる） ----
  async function loadConsultation(c: any) {
    const u = mustUser(c);
    const row = await db(c)
      .prepare(
        `SELECT c.*,s.name sender_name,s.email sender_email,p.user_id agent_user_id,p.name agent_name,p.organization agent_org,a.email agent_email
         FROM consultations c JOIN users s ON s.id=c.user_id JOIN providers p ON p.id=c.provider_id JOIN users a ON a.id=p.user_id WHERE c.id=?`,
      )
      .bind(c.req.param("id"))
      .first<any>();
    // 当事者以外には存在自体を見せない。
    if (!row || (row.user_id !== u.id && row.agent_user_id !== u.id))
      fail(404, "相談が見つかりません");
    return { u, row, role: row.agent_user_id === u.id ? "agent" : "client" };
  }
  app.get("/api/consultations/:id", async (c: any) => {
    const { u, row, role } = await loadConsultation(c);
    const ms = await db(c)
      .prepare(
        "SELECT m.id,m.body,m.created_at createdAt,m.user_id FROM consultation_messages m WHERE m.consultation_id=? ORDER BY m.created_at,m.rowid",
      )
      .bind(row.id)
      .all<any>();
    return c.json({
      consultation: {
        id: row.id,
        role,
        title: row.title,
        body: row.body,
        budget: row.budget,
        date: row.desired_date,
        status: row.status,
        createdAt: row.created_at,
        senderName: row.sender_name,
        agentId: row.provider_id,
        agentName: row.agent_name,
        agentOrganization: row.agent_org || "",
        shared: parse<{ id: string; body: string }[]>(
          row.shared_messages,
          [],
        ).map((m) => ({ id: m.id, body: m.body })),
        messages: ms.results.map((m: any) => ({
          id: m.id,
          body: m.body,
          createdAt: m.createdAt,
          own: m.user_id === u.id,
          fromAgent: m.user_id === row.agent_user_id,
        })),
      },
    });
  });
  app.post("/api/consultations/:id/messages", async (c: any) => {
    const { u, row, role } = await loadConsultation(c);
    const b = await json(
      c,
      z.object({
        body: z
          .string()
          .trim()
          .min(1, "メッセージを入力してください")
          .max(3000, "3000文字以内で入力してください"),
      }),
    );
    if (row.status === "cancelled" || row.status === "completed")
      fail(409, "この相談は終了しています");
    const recent = await db(c)
      .prepare(
        "SELECT count(*) n FROM consultation_messages WHERE user_id=? AND created_at>datetime('now','-1 hour')",
      )
      .bind(u.id)
      .first<any>();
    if (recent.n >= 60) fail(429, "少し時間をおいてから送ってください");
    const id = uid();
    const to = role === "agent" ? row.sender_email : row.agent_email;
    const link = c.env.APP_ORIGIN + "/consultations/" + row.id;
    const stmts = [
      db(c)
        .prepare(
          "INSERT INTO consultation_messages(id,consultation_id,user_id,body) VALUES(?,?,?,?)",
        )
        .bind(id, row.id, u.id, b.body),
      queue(
        db(c),
        "consult-msg:" + id,
        to,
        role === "agent"
          ? "Roamigo：留学エージェントから返信が届きました"
          : "Roamigo：相談に新しいメッセージが届きました",
        "<p>「" +
          safeText(row.title) +
          '」に新しいメッセージがあります。</p><p><a href="' +
          safeText(link) +
          '">Roamigoで開く</a></p>',
      ),
    ];
    // エージェントが最初に返信したら「対応中」にする。
    if (role === "agent" && row.status === "submitted")
      stmts.push(
        db(c)
          .prepare("UPDATE consultations SET status='accepted' WHERE id=?")
          .bind(row.id),
      );
    await db(c).batch(stmts);
    return c.json({ id }, 201);
  });
}
