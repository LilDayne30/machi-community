import { test, expect } from "@playwright/test";
const origin = { Origin: "http://127.0.0.1:5173" };
const auth = (user: string) => ({
  ...origin,
  Cookie: "machi_session=e2e-" + user,
});
test("未ログインの投稿・予約・相談・管理を拒否", async ({ request }) => {
  for (const [path, body] of [
    ["/rooms/e2e-room-a/messages", { body: "侵入" }],
    ["/bookings", { talkId: "e2e-free" }],
    ["/consultations", {}],
  ]) {
    const r = await request.post("/api" + path, {
      headers: origin,
      data: body,
    });
    expect(r.status()).toBe(401);
  }
  expect((await request.get("/api/admin")).status()).toBe(401);
});
test("CSRF：別オリジンからの投稿を拒否", async ({ request }) => {
  expect(
    (
      await request.post("/api/rooms/e2e-room-a/messages", {
        headers: { ...auth("a"), Origin: "https://attacker.example" },
        data: { body: "攻撃" },
      })
    ).status(),
  ).toBe(403);
});
test("参加者だけが自分の部屋を読み、他の部屋へ投稿できない", async ({
  request,
}) => {
  const r = await request.get("/api/bootstrap", { headers: auth("a") });
  expect(r.status()).toBe(200);
  const b = await r.json();
  expect(b.rooms.map((r: any) => r.id)).toContain("e2e-room-a");
  expect(b.rooms.map((r: any) => r.id)).not.toContain("e2e-room-b");
  expect(JSON.stringify(b)).not.toContain("参加者Bだけの秘密");
  expect(
    (
      await request.post("/api/rooms/e2e-room-b/messages", {
        headers: auth("a"),
        data: { body: "部外者" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/rooms/e2e-room-b/read", { headers: auth("a") })
    ).status(),
  ).toBe(403);
});
test("投稿・返信の保存と異なる部屋への返信を拒否", async ({ request }) => {
  const r = await request.post("/api/rooms/e2e-room-a/messages", {
    headers: auth("a"),
    data: { body: "訪問後の報告です", replyTo: "e2e-ma" },
  });
  expect(r.status()).toBe(201);
  const b = await (
    await request.get("/api/bootstrap", { headers: auth("a") })
  ).json();
  expect(
    b.rooms.find((r: any) => r.id === "e2e-room-a").messages.at(-1).body,
  ).toBe("訪問後の報告です");
  expect(
    (
      await request.post("/api/rooms/e2e-room-a/messages", {
        headers: auth("a"),
        data: { body: "不正返信", replyTo: "e2e-mb" },
      })
    ).status(),
  ).toBe(400);
});
test("空投稿・長すぎる投稿を拒否", async ({ request }) => {
  for (const body of ["  ", "x".repeat(2001)])
    expect(
      (
        await request.post("/api/rooms/e2e-room-a/messages", {
          headers: auth("a"),
          data: { body },
        })
      ).status(),
    ).toBe(400);
});
test("通報は読める部屋だけ、一般会員は運営画面を開けない", async ({
  request,
}) => {
  expect(
    (
      await request.post("/api/reports", {
        headers: auth("a"),
        data: { messageId: "e2e-mb", reason: "誤った情報" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/reports", {
        headers: auth("a"),
        data: { messageId: "e2e-shared-b", reason: "誤った情報" },
      })
    ).status(),
  ).toBe(201);
  expect(
    (await request.get("/api/admin", { headers: auth("a") })).status(),
  ).toBe(403);
  const a = await (
    await request.get("/api/admin", { headers: auth("admin") })
  ).json();
  expect(a.reports.length).toBeGreaterThan(0);
});
const consultation = {
  title: "相談APIのテスト",
  provider: "e2e-pa",
  budget: "3,000円以内",
  date: "2026-11-20",
  body: "京都再訪の喫茶店めぐりについて相談したいです。",
  shareMessageIds: ["e2e-shared-a"],
  consent: true,
};
test("相談は明示同意と自分の投稿だけを共有", async ({ request }) => {
  expect(
    (
      await request.post("/api/consultations", {
        headers: auth("a"),
        data: { ...consultation, consent: false },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/consultations", {
        headers: auth("a"),
        data: { ...consultation, shareMessageIds: ["e2e-shared-b"] },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/consultations", {
        headers: auth("a"),
        data: consultation,
      })
    ).status(),
  ).toBe(201);
});
test("無関係な事業者・他の会員には相談を開示しない", async ({ request }) => {
  const pa = await (
    await request.get("/api/bootstrap", { headers: auth("pa") })
  ).json();
  expect(pa.consultations).toHaveLength(1);
  expect(JSON.stringify(pa.consultations)).toContain("共有してよい自分の投稿");
  for (const u of ["pb", "b"]) {
    const b = await (
      await request.get("/api/bootstrap", { headers: auth(u) })
    ).json();
    expect(b.consultations).toHaveLength(0);
    expect(JSON.stringify(b)).not.toContain("相談APIのテスト");
  }
});
test("初回無料予約・二重申込み防止・他人の予約キャンセル拒否", async ({
  request,
}) => {
  const r = await request.post("/api/bookings", {
    headers: auth("a"),
    data: { talkId: "e2e-free" },
  });
  expect(r.status()).toBe(201);
  const { id } = await r.json();
  expect(
    (
      await request.post("/api/bookings", {
        headers: auth("a"),
        data: { talkId: "e2e-free" },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.delete("/api/bookings/" + id, { headers: auth("b") })
    ).status(),
  ).toBe(404);
  const b = await (
    await request.get("/api/bootstrap", { headers: auth("a") })
  ).json();
  expect(b.bookings.find((x: any) => x.id === id)).toMatchObject({
    status: "confirmed",
    amount: 0,
  });
  expect(
    (
      await request.delete("/api/bookings/" + id, { headers: auth("a") })
    ).status(),
  ).toBe(200);
});
test("同時申込みでも定員4人を超えない", async ({ request }) => {
  const rs = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      request.post("/api/bookings", {
        headers: auth("race" + i),
        data: { talkId: "e2e-race" },
      }),
    ),
  );
  expect(rs.filter((r) => r.status() === 201)).toHaveLength(4);
  expect(rs.filter((r) => r.status() === 409)).toHaveLength(6);
  const b = await (await request.get("/api/bootstrap")).json();
  expect(b.talks.find((t: any) => t.id === "e2e-race").occupied).toBe(4);
});
test("同じ会員の同時無料申込みは1回のみ", async ({ request }) => {
  const rs = await Promise.all(
    ["e2e-free", "e2e-other"].map((talkId) =>
      request.post("/api/bookings", { headers: auth("b"), data: { talkId } }),
    ),
  );
  expect(rs.filter((r) => r.status() === 201)).toHaveLength(1);
  expect(rs.some((r) => [409, 503].includes(r.status()))).toBe(true);
});
test("プロフィールは許可された項目だけ更新し、管理者に昇格できない", async ({
  request,
}) => {
  const r = await request.put("/api/profile", {
    headers: auth("a"),
    data: {
      name: "保存された名前",
      bio: "紹介",
      relation: "再訪予定",
      interests: ["喫茶店"],
      visitDate: "2026-11-20",
      availability: "土日の夜",
      role: "admin",
    },
  });
  expect(r.status()).toBe(200);
  const b = await (
    await request.get("/api/bootstrap", { headers: auth("a") })
  ).json();
  expect(b.user.role).toBe("member");
  expect(b.profile.name).toBe("保存された名前");
});
test("ブロックした人の投稿はサーバー側でも表示しない", async ({ request }) => {
  expect(
    (
      await request.post("/api/blocks", {
        headers: auth("a"),
        data: { messageId: "e2e-shared-b" },
      })
    ).status(),
  ).toBe(200);
  const b = await (
    await request.get("/api/bootstrap", { headers: auth("a") })
  ).json();
  expect(JSON.stringify(b.rooms)).not.toContain(
    "共有してはいけない他の人の投稿",
  );
});
test("偽の決済通知で参加を確定できない", async ({ request }) => {
  const r = await request.post("/api/stripe/webhook", {
    data: {
      id: "evt_fake",
      type: "checkout.session.completed",
      data: { object: { payment_status: "paid" } },
    },
  });
  expect([400, 503]).toContain(r.status());
});
test("Google未接続・不正なOAuthコールバック・セッション偽造を拒否", async ({
  request,
}) => {
  expect((await request.get("/api/auth/google")).status()).toBe(503);
  expect(
    (await request.get("/api/auth/callback?state=forged&code=forged")).status(),
  ).toBe(400);
  const b = await (
    await request.get("/api/bootstrap", {
      headers: { Cookie: "machi_session=forged" },
    })
  ).json();
  expect(b.user).toBeNull();
});
test("招待・募集・メモ公開は管理者だけ", async ({ request }) => {
  for (const path of ["invitations", "talks", "notes", "providers"])
    expect(
      (
        await request.post("/api/admin/" + path, {
          headers: auth("a"),
          data: {},
        })
      ).status(),
    ).toBe(403);
  expect(
    (
      await request.post("/api/admin/invitations", {
        headers: auth("admin"),
        data: { email: "invited@example.test" },
      })
    ).status(),
  ).toBe(201);
});
test("部屋の組合せは4〜6人・同じトークの参加者のみ", async ({ request }) => {
  expect(
    (
      await request.post("/api/admin/rooms", {
        headers: auth("admin"),
        data: { bookingIds: ["one"], title: "不正な小部屋" },
      })
    ).status(),
  ).toBe(400);
});
test("ログアウト後はセッションを再利用できない", async ({ request }) => {
  expect(
    (await request.post("/api/auth/logout", { headers: auth("a") })).status(),
  ).toBe(200);
  const b = await (
    await request.get("/api/bootstrap", { headers: auth("a") })
  ).json();
  expect(b.user).toBeNull();
});
