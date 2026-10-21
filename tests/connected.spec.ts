import { test, expect } from "@playwright/test";
// Only the local preview FLAG is changed. Authentication, profiles, room membership,
// messages, reservations and consultations all use the real local Worker and D1.
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
test("実API：運営者がトークを募集し、原価を保存して読み直す", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "machi_session",
      value: "e2e-admin",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  await page.goto("/admin");
  await page.getByRole("button", { name: "募集・招待", exact: true }).click();
  await page
    .getByLabel("テーマ・タイトル", { exact: true })
    .fill("実接続で作成した地域トーク");
  await page
    .getByLabel("日時（日本時間）", { exact: true })
    .fill("2026-11-25T20:00");
  await page
    .getByLabel("トークの内容", { exact: true })
    .fill("運営画面から実際に登録する地域トークのテストです");
  await page.getByRole("button", { name: "募集を公開する" }).click();
  await expect(page.getByRole("status")).toContainText("保存しました");
  await page.goto("/talks");
  await expect(
    page.getByRole("heading", { name: "実接続で作成した地域トーク" }),
  ).toBeVisible();
  await page.goto("/admin");
  await page.getByRole("button", { name: "採算", exact: true }).click();
  await page.getByLabel("決済手数料").fill("100");
  await page.getByLabel("進行役への謝礼").fill("2000");
  await page.getByLabel("調整の人件費").fill("1500");
  await page.getByRole("button", { name: "原価を保存" }).click();
  await expect(page.getByRole("status")).toContainText("原価を記録しました");
  await page.reload();
  await page.getByRole("button", { name: "採算", exact: true }).click();
  await expect(page.getByLabel("進行役への謝礼")).toHaveValue("2000");
});
test("実API：他人の小部屋URLを開いても会話は表示されない", async ({ page }) => {
  await page.goto("/rooms/e2e-room-b");
  await expect(
    page.getByText("参加している小部屋が見つかりません"),
  ).toBeVisible();
  await expect(page.getByText("参加者Bだけの秘密のメモ")).toHaveCount(0);
});
