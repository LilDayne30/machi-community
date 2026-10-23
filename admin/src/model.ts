export type Row = { id: string; [key: string]: any };
export type AdminData = {
  members: Row[];
  talks: Row[];
  bookings: Row[];
  reports: Row[];
  consultations: Row[];
  providers: Row[];
  notes: Row[];
  invitations: Row[];
  emails: Row[];
  rooms: Row[];
  logs: Row[];
  costs: { fees: number; reward: number; labor: number };
  metrics: {
    gross: number;
    refunds: number;
    revenue: number;
    reconnections: number;
    bookings: number;
    consultations: number;
  };
  connections: { stripe: boolean; email: boolean; ai: boolean };
};
export const previewKey = "machi-admin-preview-v1";
const tomorrow = new Date(Date.now() + 86400000 * 3).toISOString();
const timestamp = new Date().toISOString();
export function sampleData(): AdminData {
  return {
    members: [
      {
        id: "m1",
        name: "田中 みさき",
        email: "misaki@example.test",
        role: "member",
        account_status: "active",
        profile: {
          nationality: "日本",
          city: "台北",
          interestedRegions: ["日本", "韓国"],
          bio: "台北の喫茶店と街歩きが好きです。",
        },
        created_at: timestamp,
      },
      {
        id: "m2",
        name: "林 ユイ",
        email: "yui@example.test",
        role: "member",
        account_status: "active",
        profile: {
          nationality: "台湾",
          city: "東京",
          interestedRegions: ["日本"],
          bio: "次の旅の話をしたいです。",
        },
        created_at: timestamp,
      },
      {
        id: "m3",
        name: "佐藤 遥",
        email: "haruka@example.test",
        role: "member",
        account_status: "active",
        profile: {
          nationality: "日本",
          city: "福岡",
          interestedRegions: ["台湾"],
        },
        created_at: timestamp,
      },
      {
        id: "m4",
        name: "中村 直人",
        email: "naoto@example.test",
        role: "provider",
        account_status: "active",
        profile: {
          nationality: "日本",
          city: "台北",
          interestedRegions: ["台湾"],
        },
        created_at: timestamp,
      },
      {
        id: "admin",
        name: "運営者",
        email: "admin@example.test",
        role: "admin",
        account_status: "active",
        profile: { nationality: "日本" },
        created_at: timestamp,
      },
    ],
    talks: [
      {
        id: "t1",
        title: "台北の喫茶店を話す",
        category: "喫茶店",
        starts_at: tomorrow,
        duration: 45,
        capacity: 6,
        price: 1000,
        host: "田中 みさき",
        description:
          "最近訪れた喫茶店と、次の旅で行きたいお店について話します。",
        published: 1,
        occupied: 4,
      },
      {
        id: "t2",
        title: "東京の古本屋と街歩き",
        category: "古本屋",
        starts_at: new Date(Date.now() + 86400000 * 7).toISOString(),
        duration: 45,
        capacity: 6,
        price: 1000,
        host: "運営",
        description: "気になる古本屋や街歩きについて少人数で情報を交換します。",
        published: 0,
        occupied: 0,
      },
    ],
    bookings: [
      {
        id: "b1",
        talkId: "t1",
        talk_title: "台北の喫茶店を話す",
        name: "田中 みさき",
        user_id: "m1",
        status: "confirmed",
        amount: 0,
        created_at: timestamp,
      },
      {
        id: "b2",
        talkId: "t1",
        talk_title: "台北の喫茶店を話す",
        name: "林 ユイ",
        user_id: "m2",
        status: "confirmed",
        amount: 1000,
        created_at: timestamp,
      },
      {
        id: "b3",
        talkId: "t1",
        talk_title: "台北の喫茶店を話す",
        name: "佐藤 遥",
        user_id: "m3",
        status: "confirmed",
        amount: 0,
        created_at: timestamp,
      },
      {
        id: "b4",
        talkId: "t1",
        talk_title: "台北の喫茶店を話す",
        name: "中村 直人",
        user_id: "m4",
        status: "confirmed",
        amount: 0,
        created_at: timestamp,
      },
      {
        id: "b5",
        talkId: "t2",
        talk_title: "東京の古本屋と街歩き",
        name: "林 ユイ",
        user_id: "m2",
        status: "refund_pending",
        amount: 1000,
        created_at: timestamp,
      },
    ],
    reports: [
      {
        id: "r1",
        body: "詳しい案内は外部の有料サイトで申し込んでください。",
        reason: "望まない営業・勧誘",
        status: "open",
        created_at: timestamp,
        ai_suggestion: "",
      },
    ],
    consultations: [
      {
        id: "c1",
        name: "佐藤 遥",
        provider_name: "台北まち案内",
        title: "午後の喫茶店めぐり",
        body: "次の訪問で、喫茶店を2軒ほど案内してもらいたいです。",
        budget: "6,000円まで",
        desired_date: tomorrow.slice(0, 10),
        status: "submitted",
        shared_messages: "[]",
        created_at: timestamp,
      },
    ],
    providers: [
      {
        id: "p1",
        name: "台北まち案内",
        theme: "喫茶店・街歩き",
        bio: "日本語で個別に街を案内します。",
        price: "相談2,000円〜 / 案内6,000円〜",
        verified: 0,
      },
    ],
    notes: [
      {
        id: "n1",
        title: "台北の喫茶店・週末の営業時間",
        body: "週末は営業時間が変わるお店があります。訪問前にお店の公式情報をご確認ください。",
        verified_at: new Date().toISOString().slice(0, 10),
        relation: "お店との利害関係なし",
        category: "喫茶店",
        published: 1,
      },
    ],
    invitations: [
      {
        id: "invite1",
        email: "next@example.test",
        expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
        used_at: null,
      },
    ],
    emails: [
      {
        id: "mail1",
        recipient: "yui@example.test",
        subject: "地域トークの参加確定",
        status: "pending",
        attempts: 5,
        created_at: timestamp,
      },
      {
        id: "mail2",
        recipient: "misaki@example.test",
        subject: "地域トークの参加確定",
        status: "sent",
        attempts: 1,
        sent_at: timestamp,
        created_at: timestamp,
      },
    ],
    rooms: [
      {
        id: "room1",
        title: "喫茶店と次の旅",
        subtitle: "地域トークの小部屋",
        member_count: 5,
        created_at: timestamp,
      },
    ],
    logs: [
      {
        id: "log1",
        actor_name: "運営者",
        action: "publish_talk",
        target_id: "t1",
        created_at: timestamp,
      },
    ],
    costs: { fees: 72, reward: 1500, labor: 800 },
    metrics: {
      gross: 2000,
      refunds: 0,
      revenue: 2000,
      reconnections: 2,
      bookings: 5,
      consultations: 1,
    },
    connections: { stripe: false, email: false, ai: false },
  };
}
export function previewMutation(
  data: AdminData,
  path: string,
  method: string,
  body: any = {},
): AdminData {
  const d = structuredClone(data),
    [kind, rawId, action] = path.replace(/^\//, "").split("/"),
    id = decodeURIComponent(rawId || "");
  const newId = crypto.randomUUID();
  const update = (rows: Row[], values: object) => {
    const row = rows.find((r) => r.id === id);
    if (!row) throw new Error("対象が見つかりません");
    Object.assign(row, values);
  };
  if (kind === "costs") d.costs = body;
  else if (kind === "members")
    update(d.members, {
      account_status: body.status,
      status_reason: body.reason,
    });
  else if (kind === "invitations") {
    const existing = d.invitations.find((r) => r.email === (body.email || id));
    if (method === "DELETE") {
      if (existing) existing.expires_at = new Date(0).toISOString();
    } else if (existing)
      existing.expires_at = new Date(Date.now() + 86400000 * 30).toISOString();
    else
      d.invitations.unshift({
        id: newId,
        email: body.email,
        expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
        used_at: null,
      });
  } else if (kind === "talks") {
    if (action === "cancel") {
      update(d.talks, {
        published: 0,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: body.reason,
      });
      d.bookings
        .filter(
          (b) => b.talkId === id && ["confirmed", "pending"].includes(b.status),
        )
        .forEach(
          (b) =>
            (b.status =
              b.status === "confirmed" && b.amount > 0
                ? "refund_pending"
                : "cancelled"),
        );
    } else if (method === "POST")
      d.talks.unshift({
        id: newId,
        ...body,
        starts_at: body.startsAt,
        published: 1,
        occupied: 0,
      });
    else update(d.talks, body);
  } else if (kind === "notes") {
    if (method === "POST")
      d.notes.unshift({
        id: newId,
        ...body,
        verified_at: body.verifiedAt,
        published: 1,
      });
    else
      update(d.notes, {
        ...body,
        ...(body.verifiedAt ? { verified_at: body.verifiedAt } : {}),
      });
  } else if (kind === "providers") {
    if (method === "POST")
      d.providers.unshift({ id: newId, ...body, verified: 0 });
    else update(d.providers, { verified: body.status === "verified" ? 1 : 0 });
  } else if (kind === "bookings") {
    update(d.bookings, body);
  } else if (kind === "consultations") update(d.consultations, body);
  else if (kind === "reports") update(d.reports, body);
  else if (kind === "classify")
    d.reports
      .filter((r) => r.status === "open")
      .forEach(
        (r) =>
          (r.ai_suggestion = JSON.stringify({
            category: "営業・勧誘の可能性",
            review: true,
          })),
      );
  else if (kind === "emails") update(d.emails, { attempts: 0 });
  else if (kind === "rooms") {
    const chosen = d.bookings.filter((b) => body.bookingIds.includes(b.id));
    if (
      chosen.length < 4 ||
      chosen.length > 6 ||
      new Set(chosen.map((b) => b.talkId)).size !== 1
    )
      throw new Error("同じトークの参加確定済みの予約を4〜6件選んでください");
    d.rooms.unshift({
      id: newId,
      title: body.title,
      subtitle: "地域トークの小部屋",
      member_count: chosen.length + 1,
      created_at: new Date().toISOString(),
    });
  } else if (kind === "meeting") {
    const t = d.talks.find((t) => t.id === body.talkId);
    if (t) t.meeting_url = body.url;
  } else throw new Error("対応していない操作です");
  d.logs.unshift({
    id: newId,
    actor_name: "サンプル運営者",
    action: (
      {
        costs: "save_costs",
        members: "member:" + body.status,
        invitations:
          method === "DELETE" ? "revoke_invitation" : "invite_member",
        talks:
          action === "cancel"
            ? "cancel_talk"
            : method === "POST"
              ? "publish_talk"
              : "update_talk",
        notes: method === "POST" ? "publish_note" : "update_note",
        providers: method === "POST" ? "register_provider" : body.status,
        bookings: body.status,
        reports: "resolve_report",
        consultations: "consultation:" + body.status,
        rooms: "create_room",
        meeting: "meeting",
        emails: "retry_email",
        classify: "classify_reports",
      } as Record<string, string>
    )[kind],
    target_id: id || body.title || body.email || kind,
    created_at: new Date().toISOString(),
  });
  d.metrics.refunds = d.bookings
    .filter((b) => b.status === "refunded")
    .reduce((s, b) => s + b.amount, 0);
  d.metrics.revenue = d.metrics.gross - d.metrics.refunds;
  d.talks.forEach(
    (t) =>
      (t.occupied = d.bookings.filter(
        (b) =>
          b.talkId === t.id && ["confirmed", "attended"].includes(b.status),
      ).length),
  );
  return d;
}
