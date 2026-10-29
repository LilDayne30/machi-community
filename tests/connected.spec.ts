import { openPeopleFilters } from "./helpers";
import { test, expect } from "@playwright/test";

test("実API：立場別に入力し、留学経験と現地生の両方で同じ相手を見つける", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "machi_session",
      value: "e2e-dualui",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  await page.goto("/profile");
  const editor = page.locator(".participation-editor");
  await editor.getByLabel("留学を考える・準備する", { exact: true }).check();
  await editor
    .getByRole("combobox", { name: "留学の検討状況", exact: true })
    .selectOption("comparing");
  await editor
    .getByRole("button", { name: "国・留学先選び", exact: true })
    .click();
  await editor.getByLabel("留学経験を伝える", { exact: true }).check();
  await editor
    .getByRole("button", { name: "留学経験を追加", exact: true })
    .click();
  await editor
    .getByRole("combobox", { name: "留学経験 1の国・地域", exact: true })
    .selectOption("country:CA");
  await editor.getByLabel("留学経験 1の開始年", { exact: true }).fill("2022");
  await editor.getByLabel("留学経験 1の帰国年", { exact: true }).fill("2023");
  await editor
    .getByRole("group", { name: "留学経験を伝えられる人", exact: true })
    .getByRole("button", { name: "学校生活", exact: true })
    .click();
  await editor.getByLabel("現地で交流する", { exact: true }).check();
  await editor
    .getByRole("combobox", { name: "現地での立場", exact: true })
    .selectOption("student");
  await editor
    .getByRole("combobox", { name: "交流できる地域の国・地域", exact: true })
    .selectOption("country:JP");
  await editor
    .getByRole("combobox", { name: "交流できる地域の街（任意）", exact: true })
    .selectOption("city:JP:tokyo");
  await editor.getByLabel("話せる言語", { exact: true }).fill("日本語・英語");
  await editor
    .getByLabel("現地で交流したいこと", { exact: true })
    .fill("学生生活と街歩き");
  await page.getByLabel("新しい1対1の会話を受け付ける").check();
  await page.getByRole("button", { name: "変更を保存", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("保存しました");
  await page.reload();
  await expect(
    editor.getByLabel("留学経験 1の帰国年", { exact: true }),
  ).toHaveValue("2023");
  await expect(
    editor.getByRole("combobox", { name: "現地での立場", exact: true }),
  ).toHaveValue("student");
  await context.addCookies([
    {
      name: "machi_session",
      value: "e2e-dualviewer",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  await page.goto("/people?axis=alumni&topic=学校生活&studyPlace=country%3ACA");
  await expect(page.locator(".person-card")).toHaveCount(1);
  await page.locator(".person-identity").click();
  await expect(page.locator(".member-profile")).toContainText(
    "留学経験は本人の申告です",
  );
  await expect(page.locator(".member-profile")).toContainText("現地の学生");
  await page.goto(
    "/people?axis=local&studyPlace=country%3AJP&localKind=student",
  );
  await expect(page.locator(".person-card")).toHaveCount(1);
  await expect(page.locator(".person-card")).toContainText(
    "留学経験と現地交流のテストさん",
  );
  await page
    .getByRole("button", {
      name: "留学経験と現地交流のテストさん メッセージ",
      exact: true,
    })
    .click();
  await expect(page.locator(".chat-header h1")).toHaveText(
    "留学経験と現地交流のテストさん",
  );
  await page
    .getByRole("textbox", { name: "メッセージ", exact: true })
    .fill("留学経験と今の学生生活について聞きたいです");
  await page
    .getByRole("button", { name: "メッセージを送信", exact: true })
    .click();
  await page.reload();
  await expect(page.locator(".message.own")).toContainText("今の学生生活");
});
// Only the local preview FLAG is changed. Authentication, profiles, room membership,
// messages, reservations and consultations all use the real local Worker and D1.
// Let intercepted responses finish before Playwright disposes the request context.
test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "wait" });
});
test.beforeEach(async ({ page, context }) => {
  await context.addCookies([
    { name: "machi_session", value: "e2e-ui", domain: "127.0.0.1", path: "/" },
  ]);
  await page.route("**/api/bootstrap", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    await route.fulfill({ response, json: { ...data, mode: "production" } });
  });
});
test("実API：プロフィールと小部屋の投稿が再読込後も残る", async ({ page }) => {
  await page.goto("/profile");
  await page
    .getByLabel("表示名", { exact: true })
    .fill("接続済みブラウザの会員");
  await page
    .getByLabel("自己紹介", { exact: true })
    .fill("ローカルWorkerへ保存します");
  await page.getByRole("button", { name: "変更を保存" }).click();
  await expect(page.getByRole("status")).toContainText(
    "プロフィールを保存しました",
  );
  await page.reload();
  await expect(page.getByLabel("表示名", { exact: true })).toHaveValue(
    "接続済みブラウザの会員",
  );
  await page.goto("/rooms/e2e-ui-room");
  await page
    .getByRole("textbox", { name: "メッセージ", exact: true })
    .fill("実際のD1へ保存した旅の報告です");
  await page
    .getByRole("button", { name: "メッセージを送信", exact: true })
    .click();
  await expect(page.locator(".message.own").last()).toContainText(
    "実際のD1へ保存した旅の報告です",
  );
  await page.reload();
  await expect(page.locator(".message.own").last()).toContainText(
    "実際のD1へ保存した旅の報告です",
  );
});
test("実API：無料予約からキャンセルまで", async ({ page }) => {
  await page.goto("/talks/e2e-ui");
  await page.getByRole("button", { name: "参加を申し込む" }).click();
  await page.getByLabel("開催日時・料金・キャンセル条件を確認しました").check();
  await page.getByRole("button", { name: "参加を確定する" }).click();
  await page.getByRole("button", { name: "トーク詳細へ" }).click();
  await page.reload();
  await expect(page.locator(".booking-confirmed")).toHaveText("参加確定");
  await expect(page.locator(".price")).toContainText("無料");
  await page.getByRole("button", { name: "申込みをキャンセル" }).click();
  await page.getByRole("button", { name: "キャンセルを確定" }).click();
  await expect(
    page.getByRole("button", { name: "参加を申し込む" }),
  ).toBeVisible();
});
test("実API：同意したプロ相談を保存し、宛先の事業者へ開示", async ({
  page,
  request,
}) => {
  await page.goto("/consult");
  await page
    .locator(".provider-card")
    .filter({ hasText: "実接続テストの相談先" })
    .getByRole("button", { name: "このプロに相談する" })
    .click();
  await page
    .getByLabel("相談のタイトル", { exact: true })
    .fill("接続した相談フォーム");
  await page
    .getByLabel("依頼内容", { exact: true })
    .fill("再訪の喫茶店めぐりについて相談する操作テストです");
  await page
    .getByRole("combobox", { name: "予算", exact: true })
    .selectOption("相談したい");
  await page.getByLabel("希望日", { exact: true }).fill("2026-11-20");
  await page.getByLabel("共有範囲を選べる自分の投稿です").check();
  await page
    .getByLabel(
      "相談先と運営へ上記の内容を共有することに同意します。料金は事業者の回答後に確認します。",
    )
    .check();
  await page.getByRole("button", { name: "相談を送る", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "相談を受け付けました" }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "閉じる", exact: true })
    .last()
    .click();
  await page.reload();
  await expect(page.locator(".consultation-row")).toContainText(
    "接続した相談フォーム",
  );
  const provider = await (
    await request.get("/api/bootstrap", {
      headers: { Cookie: "machi_session=e2e-uip" },
    })
  ).json();
  expect(
    provider.consultations.some((c: any) => c.title === "接続した相談フォーム"),
  ).toBe(true);
});
test("実API：他人の小部屋URLを開いても会話は表示されない", async ({ page }) => {
  await page.goto("/rooms/e2e-room-b");
  await expect(
    page.getByText("参加している会話が見つかりません"),
  ).toBeVisible();
  await expect(page.getByText("参加者Bだけの秘密のメモ")).toHaveCount(0);
});

test("実API：相手を選び1対1で往復、履歴と受付設定をD1へ保存", async ({
  page,
  context,
  request,
}) => {
  await context.addCookies([
    { name: "machi_session", value: "e2e-dui", domain: "127.0.0.1", path: "/" },
  ]);
  await page.goto("/people");
  await page
    .getByRole("button", {
      name: "会話相手のテストさん メッセージ",
      exact: true,
    })
    .click();
  await expect(page.locator(".chat-header h1")).toHaveText(
    "会話相手のテストさん",
  );
  const conversationUrl = page.url();
  await page
    .getByRole("textbox", { name: "メッセージ", exact: true })
    .fill("また京都に行きます。喫茶店の話をしませんか");
  await page
    .getByRole("button", { name: "メッセージを送信", exact: true })
    .click();
  await expect(page.locator(".message.own")).toContainText(
    "また京都に行きます",
  );
  await context.addCookies([
    {
      name: "machi_session",
      value: "e2e-dpeer",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  await page.reload();
  await expect(page.locator(".message:not(.own)").last()).toContainText(
    "また京都に行きます",
  );
  await page
    .getByRole("textbox", { name: "メッセージ", exact: true })
    .fill("もちろんです。次の訪問はいつですか");
  await page
    .getByRole("button", { name: "メッセージを送信", exact: true })
    .click();
  await expect(page.locator(".message.own")).toContainText(
    "次の訪問はいつですか",
  );
  await context.addCookies([
    { name: "machi_session", value: "e2e-dui", domain: "127.0.0.1", path: "/" },
  ]);
  await page.reload();
  await expect(page.locator(".message:not(.own)").last()).toContainText(
    "次の訪問はいつですか",
  );
  const roomId = new URL(conversationUrl).pathname.split("/").at(-1);
  expect(
    (
      await request.post("/api/rooms/" + roomId + "/messages", {
        headers: {
          Cookie: "machi_session=e2e-dpeer",
          Origin: "http://127.0.0.1:5173",
        },
        data: { body: "再読込なしで届くメッセージです" },
      })
    ).ok(),
  ).toBe(true);
  await expect(page.locator(".message:not(.own)").last()).toContainText(
    "再読込なしで届く",
    { timeout: 15000 },
  );
  await page.goto("/people");
  await page
    .getByRole("button", {
      name: "会話相手のテストさん メッセージ",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(conversationUrl);
  await page.goto("/profile");
  await page.getByLabel("新しい1対1の会話を受け付ける").uncheck();
  await page.getByRole("button", { name: "変更を保存" }).click();
  await expect(page.getByRole("status")).toContainText("保存しました");
  const peer = await (
    await request.get("/api/bootstrap", {
      headers: { Cookie: "machi_session=e2e-dpeer" },
    })
  ).json();
  expect(peer.people.some((p: any) => p.id === "e2e-dui")).toBe(false);
  expect(
    peer.rooms.some((r: any) => r.kind === "direct" && r.peer.id === "e2e-dui"),
  ).toBe(true);
  await page.goto(conversationUrl);
  await page.getByRole("button", { name: "会話の設定", exact: true }).click();
  await page
    .getByRole("button", { name: "相手をブロックする", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "メッセージ", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "メッセージ", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "会話の設定", exact: true }).click();
  await page
    .getByRole("button", { name: "ブロックを解除する", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "メッセージ", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".message:not(.own)").last()).toContainText(
    "再読込なしで届く",
  );
});

test("実API：国籍・街・興味・写真を登録し、その情報で見つけて会話する", async ({
  page,
  context,
  request,
}) => {
  await context.addCookies([
    { name: "machi_session", value: "e2e-pui", domain: "127.0.0.1", path: "/" },
  ]);
  await page.goto("/profile");
  await page.getByLabel("国籍（必須）", { exact: true }).fill("台湾");
  await page
    .getByRole("combobox", { name: "現在の居住地の国・地域", exact: true })
    .selectOption("country:TW");
  await page
    .getByRole("combobox", { name: "現在の居住地の街（任意）", exact: true })
    .selectOption("city:TW:taipei");
  await page
    .getByLabel("興味のある国・地域", { exact: true })
    .fill("日本、京都、韓国");
  await page
    .getByLabel("プロフィール写真を選ぶ", { exact: true })
    .setInputFiles("public/icon-192.png");
  await page.getByLabel("新しい1対1の会話を受け付ける").check();
  await page.getByRole("button", { name: "変更を保存", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("保存しました");
  await page.reload();
  await expect(page.getByLabel("国籍（必須）", { exact: true })).toHaveValue(
    "台湾",
  );
  await expect(page.locator(".profile-identity img")).toHaveAttribute(
    "src",
    /^\/api\/avatars\/e2e-pui\?v=/,
  );
  const imageUrl = await page
    .locator(".profile-identity img")
    .getAttribute("src");
  const imageResponse = await request.get(imageUrl!, {
    headers: { Cookie: "machi_session=e2e-pui" },
  });
  expect(imageResponse.headers()["content-type"]).toBe("image/jpeg");
  expect((await imageResponse.body()).byteLength).toBeLessThan(192 * 1024);
  await context.addCookies([
    { name: "machi_session", value: "e2e-dc", domain: "127.0.0.1", path: "/" },
  ]);
  await page.goto("/people");
  await openPeopleFilters(page);
  await page
    .getByRole("combobox", { name: "国籍で絞り込む", exact: true })
    .selectOption("台湾");
  await page.getByLabel("名前・街・話したいこと", { exact: true }).fill("台北");
  await openPeopleFilters(page);
  await page
    .getByRole("combobox", {
      name: "興味のある国・地域で絞り込む",
      exact: true,
    })
    .selectOption("京都");
  await expect(page.locator(".person-card")).toHaveCount(1);
  await expect(page.locator(".person-card img")).toBeVisible();
  await page
    .getByRole("button", {
      name: "写真と地域のテストさん メッセージ",
      exact: true,
    })
    .click();
  await expect(page.locator(".chat-header h1")).toHaveText(
    "写真と地域のテストさん",
  );
  await expect(page.locator(".chat-header img")).toBeVisible();
  await page
    .getByRole("textbox", { name: "メッセージ", exact: true })
    .fill("台湾と日本の街歩きについて話したいです");
  await page
    .getByRole("button", { name: "メッセージを送信", exact: true })
    .click();
  await expect(page.locator(".message.own")).toContainText("台湾と日本");
});

test("実API：居住地域と過去の留学を保存し、経験のある相手として見つけて話す", async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: "machi_session", value: "e2e-rui", domain: "127.0.0.1", path: "/" },
  ]);
  await page.goto("/profile");
  await page
    .getByRole("combobox", { name: "現在の居住地の国・地域", exact: true })
    .selectOption("country:JP");
  await page
    .getByRole("combobox", { name: "現在の居住地の街（任意）", exact: true })
    .selectOption("city:JP:tokyo");
  await page
    .getByRole("button", { name: "過去の居住地・滞在先を追加", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "地域 1の国・地域", exact: true })
    .selectOption("country:TW");
  await page
    .getByRole("combobox", { name: "地域 1の街（任意）", exact: true })
    .selectOption("city:TW:taipei");
  await page
    .getByRole("combobox", { name: "地域 1での目的", exact: true })
    .selectOption("study");
  await page.getByLabel("地域 1の開始年", { exact: true }).fill("2019");
  await page.getByLabel("地域 1の終了年", { exact: true }).fill("2022");
  await page
    .getByRole("combobox", { name: "次の訪問先の国・地域", exact: true })
    .selectOption("country:KR");
  await page
    .getByRole("combobox", { name: "次の訪問先の街（任意）", exact: true })
    .selectOption("city:KR:seoul");
  await page.getByLabel("新しい1対1の会話を受け付ける").check();
  await page.getByRole("button", { name: "変更を保存", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("保存しました");
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "地域 1の街（任意）", exact: true }),
  ).toHaveValue("city:TW:taipei");
  const saved = await (await context.request.get("/api/bootstrap")).json();
  expect(saved.profile.connections).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ regionId: "city:JP:tokyo", status: "current" }),
      {
        regionId: "city:TW:taipei",
        status: "former",
        purpose: "study",
        since: 2019,
        until: 2022,
      },
    ]),
  );
  expect(saved.profile.city).toBe("東京");
  expect(saved.profile.visitRegionId).toBe("city:KR:seoul");
  await context.addCookies([
    { name: "machi_session", value: "e2e-dc", domain: "127.0.0.1", path: "/" },
  ]);
  await page.goto("/people");
  await openPeopleFilters(page);
  await page
    .getByRole("combobox", { name: "関わりのある地域", exact: true })
    .selectOption("country:TW");
  await openPeopleFilters(page);
  await page
    .getByRole("combobox", { name: "地域との関わり", exact: true })
    .selectOption("former");
  await expect(page.locator(".person-card")).toHaveCount(1);
  await expect(page.locator(".person-card")).toContainText("地域のテストさん");
  await expect(page.locator(".person-card")).toContainText("以前住んでいた");
  await page
    .getByRole("button", { name: "地域のテストさん メッセージ", exact: true })
    .click();
  await expect(page.locator(".chat-header h1")).toHaveText("地域のテストさん");
  await page
    .getByRole("textbox", { name: "メッセージ", exact: true })
    .fill("台北に留学したときの街の話を聞きたいです");
  await page
    .getByRole("button", { name: "メッセージを送信", exact: true })
    .click();
  await expect(page.locator(".message.own")).toContainText("台北に留学");
});
