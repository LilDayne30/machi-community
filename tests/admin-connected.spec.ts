import { test, expect } from "@playwright/test";
test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "wait" });
});
test.beforeEach(async ({ context, page }) => {
  // Only the member UI preview flag changes. The request and its data use the actual local Worker/D1.
  await page.route("**/api/bootstrap", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    await route.fulfill({ response, json: { ...data, mode: "production" } });
  });
  await context.addCookies([
    {
      name: "machi_admin_session",
      value: "e2e-admin-admin",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
});
test("別管理サイトで実D1へ募集を公開・編集し、利用者サイトへ反映", async ({
  page,
}) => {
  await page.goto("/talks");
  await expect(page.locator(".preview-bar")).toHaveCount(0);
  await page.getByRole("button", { name: "トークを作成" }).click();
  await page
    .getByLabel("タイトル", { exact: true })
    .fill("実接続の管理サイトから募集");
  await page.getByLabel("日時（日本時間）").fill("2027-01-20T20:00");
  await page
    .getByLabel("トークの内容")
    .fill("別サイトの管理画面から登録する地域トークのテストです。");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "公開する", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("保存しました");
  const card = page
    .locator(".talk-card")
    .filter({ hasText: "実接続の管理サイトから募集" });
  await card.getByRole("button", { name: "編集", exact: true }).click();
  await page
    .getByLabel("タイトル", { exact: true })
    .fill("実接続で編集した地域トーク");
  await page.getByRole("button", { name: "変更を保存" }).click();
  await expect(
    page.getByRole("heading", { name: "実接続で編集した地域トーク" }),
  ).toBeVisible();
  await page.context().addCookies([
    {
      name: "machi_session",
      value: "e2e-ui",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  await page.goto("http://127.0.0.1:5173/talks");
  await expect(
    page.getByRole("heading", { name: "実接続で編集した地域トーク" }),
  ).toBeVisible();
});
test("実D1で原価・メモ・監査記録を保存し再読込", async ({ page }) => {
  await page.goto("/costs");
  await page.getByLabel("決済手数料").fill("100");
  await page.getByLabel("進行役への謝礼").fill("2000");
  await page.getByLabel("調整の人件費").fill("1500");
  await page.getByRole("button", { name: "原価を保存" }).click();
  await expect(page.getByRole("status")).toContainText("保存しました");
  await page.reload();
  await expect(page.getByLabel("進行役への謝礼")).toHaveValue("2000");
  await page.goto("/notes");
  await page.getByRole("button", { name: "メモを作成" }).click();
  await page
    .getByLabel("タイトル", { exact: true })
    .fill("実接続で公開した現地メモ");
  await page
    .getByLabel("メモの内容")
    .fill("実際のデータベースに保存する現地メモです。");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "公開する", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "実接続で公開した現地メモ" }),
  ).toBeVisible();
  await page.goto("/logs");
  await expect(page.locator("tbody")).toContainText("原価を保存");
  await expect(page.locator("tbody")).toContainText("メモを公開");
});
