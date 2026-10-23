import { test, expect } from "@playwright/test";
const auth = (id = "admin") => ({
  Origin: "http://127.0.0.1:5174",
  Cookie: "machi_admin_session=e2e-admin-" + id,
});
test("管理者ログイン保留・未認証・期限切れ・一般会員・未指定管理者を拒否", async ({
  request,
}) => {
  expect((await request.get("/api/auth/google")).status()).toBe(503);
  expect(
    (await request.get("/api/auth/callback?code=fake&state=fake")).status(),
  ).toBe(503);
  expect((await request.get("/api/admin")).status()).toBe(401);
  expect(
    (await request.get("/api/admin", { headers: auth("expired") })).status(),
  ).toBe(401);
  for (const id of ["a", "outsider"]) {
    expect(
      (await request.get("/api/admin", { headers: auth(id) })).status(),
    ).toBe(403);
    expect(
      (
        await request.post("/api/admin/costs", {
          headers: auth(id),
          data: { fees: 0, reward: 0, labor: 0 },
        })
      ).status(),
    ).toBe(403);
  }
  expect(
    (
      await request.get("/api/admin", {
        headers: { Cookie: "machi_session=e2e-admin" },
      })
    ).status(),
  ).toBe(401);
});
test("別サイトの境界とCSRFを検証し、管理セッションで個人会話は読めない", async ({
  request,
}) => {
  expect(
    (
      await request.get("http://127.0.0.1:8787/api/admin", {
        headers: { Cookie: "machi_session=e2e-admin" },
      })
    ).status(),
  ).toBe(404);
  for (const path of [
    "bootstrap",
    "rooms/e2e-room-a/messages",
    "conversations/e2e-db",
  ]) {
    expect(
      (await request.get("/api/" + path, { headers: auth() })).status(),
    ).toBe(404);
  }
  expect(
    (
      await request.post("/api/admin/costs", {
        headers: { ...auth(), Origin: "http://127.0.0.1:5173" },
        data: { fees: 0, reward: 0, labor: 0 },
      })
    ).status(),
  ).toBe(403);
  const r = await request.get("/api/admin", { headers: auth() });
  expect(r.status()).toBe(200);
  const d = await r.json();
  expect(d.members.length).toBeGreaterThan(0);
  expect(JSON.stringify(d)).not.toContain("参加者Aだけの秘密のメモ");
  expect(JSON.stringify(d)).not.toContain("token_hash");
  expect(d.rooms.every((r: any) => !r.id.startsWith("direct-"))).toBe(true);
});
test("管理者を停止できず、一般会員の停止は既存セッションを無効化", async ({
  request,
}) => {
  expect(
    (
      await request.patch("/api/admin/members/e2e-admin", {
        headers: auth(),
        data: { status: "suspended", reason: "停止を検証" },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.patch("/api/admin/members/e2e-status", {
        headers: auth(),
        data: { status: "suspended", reason: "本人の依頼で停止" },
      })
    ).status(),
  ).toBe(200);
  const d = await (
    await request.get("http://127.0.0.1:8787/api/bootstrap", {
      headers: { Cookie: "machi_session=e2e-status" },
    })
  ).json();
  expect(d.user).toBeNull();
  expect(
    (
      await request.patch("/api/admin/members/e2e-status", {
        headers: auth(),
        data: { status: "active", reason: "本人の依頼で再開" },
      })
    ).status(),
  ).toBe(200);
  const resumed = await (
    await request.get("http://127.0.0.1:8787/api/bootstrap", {
      headers: { Cookie: "machi_session=e2e-status" },
    })
  ).json();
  expect(resumed.user).toBeNull();
});
test("募集の公開切替・編集と、中止時の返金待ち・通知・重複実行を検証", async ({
  request,
}) => {
  expect(
    (
      await request.patch("/api/admin/talks/e2e-cancel", {
        headers: auth(),
        data: { published: false },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.patch("/api/admin/talks/e2e-cancel", {
        headers: auth(),
        data: {
          title: "中止予定のトーク",
          category: "喫茶店",
          host: "運営",
          description: "中止処理を検証するトークです。",
        },
      })
    ).status(),
  ).toBe(200);
  for (let i = 0; i < 2; i++)
    expect(
      (
        await request.post("/api/admin/talks/e2e-cancel/cancel", {
          headers: auth(),
          data: { reason: "進行役の都合で開催中止" },
        })
      ).status(),
    ).toBe(200);
  const d = await (await request.get("/api/admin", { headers: auth() })).json();
  expect(d.bookings.find((b: any) => b.id === "e2e-cancel-free").status).toBe(
    "cancelled",
  );
  expect(d.bookings.find((b: any) => b.id === "e2e-cancel-paid").status).toBe(
    "refund_pending",
  );
  expect(
    d.emails.filter((m: any) => m.id.startsWith("cancel:e2e-cancel")).length,
  ).toBe(2);
  expect(
    d.logs.filter(
      (l: any) => l.action === "cancel_talk" && l.target_id === "e2e-cancel",
    ),
  ).toHaveLength(1);
  expect(
    (
      await request.patch("/api/admin/talks/e2e-cancel", {
        headers: auth(),
        data: { published: true },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.patch("/api/admin/bookings/e2e-cancel-paid", {
        headers: auth(),
        data: { status: "refunded" },
      })
    ).status(),
  ).toBe(503);
});
test("メモを編集・非公開にし、招待を取り消して監査履歴へ残す", async ({
  request,
}) => {
  const note = await request.post("/api/admin/notes", {
    headers: auth(),
    data: {
      title: "管理APIのメモ",
      body: "営業時間を更新しました",
      verifiedAt: "2026-10-23",
      relation: "利害関係なし",
      category: "喫茶店",
      image: "https://images.unsplash.com/photo-1442512595331-e89e73853f31",
    },
  });
  expect(note.status()).toBe(201);
  const { id } = await note.json();
  expect(
    (
      await request.patch("/api/admin/notes/" + id, {
        headers: auth(),
        data: {
          title: "更新したメモ",
          body: "営業日を更新しました",
          verifiedAt: "2026-10-23",
          relation: "利害関係なし",
        },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.patch("/api/admin/notes/" + id, {
        headers: auth(),
        data: { published: false },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post("/api/admin/invitations", {
        headers: auth(),
        data: { email: "revoke@example.test" },
      })
    ).status(),
  ).toBe(201);
  expect(
    (
      await request.delete("/api/admin/invitations/revoke%40example.test", {
        headers: auth(),
      })
    ).status(),
  ).toBe(200);
  const d = await (await request.get("/api/admin", { headers: auth() })).json();
  expect(d.notes.find((n: any) => n.id === id).published).toBe(0);
  expect(
    Date.parse(
      d.invitations.find((i: any) => i.email === "revoke@example.test")
        .expires_at + "Z",
    ),
  ).toBeLessThan(Date.now());
  expect(d.logs.some((l: any) => l.action === "revoke_invitation")).toBe(true);
});
test("存在しない対象・不正値を拒否し、未接続メールを成功扱いにしない", async ({
  request,
}) => {
  expect(
    (
      await request.patch("/api/admin/members/missing", {
        headers: auth(),
        data: { status: "suspended", reason: "テスト理由" },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.patch("/api/admin/talks/missing", {
        headers: auth(),
        data: { published: true },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.post("/api/admin/costs", {
        headers: auth(),
        data: { fees: -1, reward: 0, labor: 0 },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/admin/emails/missing/retry", {
        headers: auth(),
        data: {},
      })
    ).status(),
  ).toBe(503);
});

test("同じトークの参加者4人で小部屋を作成し、本人だけの所属としてDBへ保存", async ({
  request,
}) => {
  const r = await request.post("/api/admin/rooms", {
    headers: auth(),
    data: {
      title: "実APIで組み合わせた小部屋",
      bookingIds: [0, 1, 2, 3].map((i) => "e2e-group-" + i),
    },
  });
  expect(r.status()).toBe(201);
  const { id } = await r.json();
  const d = await (await request.get("/api/admin", { headers: auth() })).json();
  expect(d.rooms.find((r: any) => r.id === id).member_count).toBe(5);
  const member = await (
    await request.get("http://127.0.0.1:8787/api/bootstrap", {
      headers: { Cookie: "machi_session=e2e-g0" },
    })
  ).json();
  expect(member.rooms.some((r: any) => r.id === id)).toBe(true);
  const unrelated = await (
    await request.get("http://127.0.0.1:8787/api/bootstrap", {
      headers: { Cookie: "machi_session=e2e-b" },
    })
  ).json();
  expect(unrelated.rooms.some((r: any) => r.id === id)).toBe(false);
});

test("利用停止中の事業者を相談先から外し、URL直送信も拒否。再開後は受付可能", async ({
  request,
}) => {
  const memberHeaders = {
    Origin: "http://127.0.0.1:5173",
    Cookie: "machi_session=e2e-ui",
  };
  const get = async () =>
    (
      await request.get("http://127.0.0.1:8787/api/bootstrap", {
        headers: memberHeaders,
      })
    ).json();
  expect((await get()).providers.some((p: any) => p.id === "e2e-pstatus")).toBe(
    true,
  );
  expect(
    (
      await request.patch("/api/admin/members/e2e-pstatus", {
        headers: auth(),
        data: { status: "suspended", reason: "本人の依頼で停止" },
      })
    ).status(),
  ).toBe(200);
  expect((await get()).providers.some((p: any) => p.id === "e2e-pstatus")).toBe(
    false,
  );
  const send = () =>
    request.post("http://127.0.0.1:8787/api/consultations", {
      headers: memberHeaders,
      data: {
        title: "停止状態の相談先を検証",
        provider: "e2e-pstatus",
        budget: "3,000円以内",
        date: "2026-11-20",
        body: "停止中の事業者に相談が届かないことを確かめます。",
        shareMessageIds: [],
        consent: true,
      },
    });
  expect((await send()).status()).toBe(400);
  expect(
    (
      await request.patch("/api/admin/members/e2e-pstatus", {
        headers: auth(),
        data: { status: "active", reason: "本人の依頼で再開" },
      })
    ).status(),
  ).toBe(200);
  expect((await get()).providers.some((p: any) => p.id === "e2e-pstatus")).toBe(
    true,
  );
  expect((await send()).status()).toBe(201);
});
