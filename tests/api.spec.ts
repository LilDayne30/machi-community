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

test("個人の一覧は受付中だけを表示しメールと認証情報を公開しない", async ({
  request,
}) => {
  const b = await (
    await request.get("/api/bootstrap", { headers: auth("da") })
  ).json();
  expect(b.people.some((p: any) => p.id === "e2e-db")).toBe(true);
  for (const id of ["e2e-da", "e2e-closed", "e2e-pa"])
    expect(b.people.some((p: any) => p.id === id)).toBe(false);
  expect(JSON.stringify(b.people)).not.toContain("@example.test");
  expect(JSON.stringify(b.people)).not.toContain("google_sub");
  expect(JSON.stringify(b.people)).not.toContain("acceptsMessages");
});
test("個人会話は両方向から同じ1部屋になり参加者は必ず2人", async ({
  request,
}) => {
  const first = await request.post("/api/conversations", {
    headers: auth("da"),
    data: { personId: "e2e-db" },
  });
  expect(first.status()).toBe(201);
  const { id } = await first.json();
  const reverse = await request.post("/api/conversations", {
    headers: auth("db"),
    data: { personId: "e2e-da" },
  });
  expect((await reverse.json()).id).toBe(id);
  for (const [user, peer] of [
    ["da", "個人会話B"],
    ["db", "個人会話A"],
  ]) {
    const b = await (
      await request.get("/api/bootstrap", { headers: auth(user) })
    ).json();
    const room = b.rooms.find((r: any) => r.id === id);
    expect(room).toMatchObject({ kind: "direct", members: 2, title: peer });
    expect(b.rooms.filter((r: any) => r.id === id)).toHaveLength(1);
  }
});
test("個人会話の同時開始でも同じ部屋を返す", async ({ request }) => {
  const responses = await Promise.all(
    Array.from({ length: 6 }, (_, i) =>
      request.post("/api/conversations", {
        headers: auth(i % 2 ? "da" : "dc"),
        data: { personId: i % 2 ? "e2e-dc" : "e2e-da" },
      }),
    ),
  );
  for (const r of responses) expect(r.ok()).toBe(true);
  const ids = await Promise.all(
    responses.map(async (r) => (await r.json()).id),
  );
  expect(new Set(ids).size).toBe(1);
  const b = await (
    await request.get("/api/bootstrap", { headers: auth("da") })
  ).json();
  expect(b.rooms.find((r: any) => r.id === ids[0]).members).toBe(2);
});
test("本人同士の投稿・未読・既読と第三者の非開示", async ({ request }) => {
  const { id } = await (
    await request.post("/api/conversations", {
      headers: auth("da"),
      data: { personId: "e2e-db" },
    })
  ).json();
  const sent = await request.post(`/api/rooms/${id}/messages`, {
    headers: auth("da"),
    data: { body: "この二人だけの京都の話です" },
  });
  expect(sent.status()).toBe(201);
  const messageId = (await sent.json()).id;
  const peer = await (
    await request.get("/api/bootstrap", { headers: auth("db") })
  ).json();
  expect(peer.rooms.find((r: any) => r.id === id).unread).toBeGreaterThan(0);
  expect(peer.rooms.find((r: any) => r.id === id).messages.at(-1).body).toBe(
    "この二人だけの京都の話です",
  );
  expect(
    (await request.post(`/api/rooms/${id}/read`, { headers: auth("db") })).ok(),
  ).toBe(true);
  const read = await (
    await request.get("/api/bootstrap", { headers: auth("db") })
  ).json();
  expect(read.rooms.find((r: any) => r.id === id).unread).toBe(0);
  for (const user of ["dc", "admin", "pa"]) {
    const outsider = await (
      await request.get("/api/bootstrap", { headers: auth(user) })
    ).json();
    expect(outsider.rooms.some((r: any) => r.id === id)).toBe(false);
    expect(JSON.stringify(outsider)).not.toContain(
      "この二人だけの京都の話です",
    );
    expect(
      (
        await request.post(`/api/rooms/${id}/messages`, {
          headers: auth(user),
          data: { body: "侵入" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.post(`/api/rooms/${id}/read`, { headers: auth(user) })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.post("/api/reports", {
          headers: auth(user),
          data: { messageId, reason: "その他" },
        })
      ).status(),
    ).toBe(403);
  }
});
test("未ログイン・自分自身・受付停止・事業者からの個人会話を拒否", async ({
  request,
}) => {
  expect(
    (
      await request.post("/api/conversations", {
        headers: origin,
        data: { personId: "e2e-db" },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/conversations", {
        headers: auth("da"),
        data: { personId: "e2e-da" },
      })
    ).status(),
  ).toBe(400);
  for (const [user, personId] of [
    ["da", "e2e-closed"],
    ["da", "e2e-pa"],
    ["pa", "e2e-db"],
    ["da", "not-a-user"],
  ])
    expect(
      (
        await request.post("/api/conversations", {
          headers: auth(user),
          data: { personId },
        })
      ).status(),
    ).toBe(403);
});
test("1対1のブロックは両者の送信と新規開始を止める", async ({ request }) => {
  const { id } = await (
    await request.post("/api/conversations", {
      headers: auth("da"),
      data: { personId: "e2e-db" },
    })
  ).json();
  expect(
    (
      await request.post("/api/blocks", {
        headers: auth("da"),
        data: { personId: "e2e-db" },
      })
    ).ok(),
  ).toBe(true);
  for (const [user, peer] of [
    ["da", "db"],
    ["db", "da"],
  ]) {
    expect(
      (
        await request.post(`/api/rooms/${id}/messages`, {
          headers: auth(user),
          data: { body: "ブロック後の送信" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.post("/api/conversations", {
          headers: auth(user),
          data: { personId: "e2e-" + peer },
        })
      ).status(),
    ).toBe(403);
    const b = await (
      await request.get("/api/bootstrap", { headers: auth(user) })
    ).json();
    expect(b.rooms.find((r: any) => r.id === id).blocked).toBe(true);
    expect(b.people.some((p: any) => p.id === "e2e-" + peer)).toBe(false);
  }
});

test("ブロック解除は自分の設定だけを変更し、相手のブロックは解除しない", async ({
  request,
}) => {
  const b = await (
    await request.get("/api/bootstrap", { headers: auth("da") })
  ).json();
  const room = b.rooms.find(
    (r: any) => r.kind === "direct" && r.peer.id === "e2e-db",
  );
  expect(
    (await request.delete("/api/blocks/e2e-da", { headers: auth("db") })).ok(),
  ).toBe(true);
  expect(
    (
      await request.post(`/api/rooms/${room.id}/messages`, {
        headers: auth("db"),
        data: { body: "相手側からの解除では送れない" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (await request.delete("/api/blocks/e2e-db", { headers: auth("da") })).ok(),
  ).toBe(true);
  expect(
    (
      await request.post(`/api/rooms/${room.id}/messages`, {
        headers: auth("db"),
        data: { body: "解除後はまた話せます" },
      })
    ).status(),
  ).toBe(201);
  const refreshed = await (
    await request.get("/api/bootstrap", { headers: auth("da") })
  ).json();
  expect(refreshed.rooms.find((r: any) => r.id === room.id)).toMatchObject({
    blocked: false,
    blockedByMe: false,
  });
});
