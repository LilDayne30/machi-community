import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function go(page: Page, label: string) {
  const mobile = page.getByRole("button", { name: "管理メニューを開く" });
  if (await mobile.isVisible()) await mobile.click();
  const link = page
    .getByRole("navigation", { name: "管理メニュー" })
    .getByRole("link", { name: new RegExp("^" + label + "(?: \\d+)?$") });
  const path = await link.getAttribute("href");
  await link.click();
  await expect(page.locator(`[data-page="${path}"]`)).toHaveCSS("opacity", "1");
  await expect(
    page.getByRole("heading", { name: label, exact: true }),
  ).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "概要", exact: true }),
  ).toBeVisible();
});
test("全管理画面へ2タップ以内で移動し、はみ出しとアクセシビリティを確認", async ({
  page,
}) => {
  test.setTimeout(180000);
  for (const label of [
    "概要",
    "会員・招待",
    "トーク・小部屋",
    "予約・返金",
    "通報",
    "プロ相談",
    "事業者",
    "現地メモ",
    "メール配信",
    "採算",
    "操作履歴",
  ]) {
    await go(page, label);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      label,
    ).toEqual([]);
  }
});
test("会員を検索し、プロフィールを確認して利用を停止・再開", async ({
  page,
}) => {
  await go(page, "会員・招待");
  await page.getByLabel("この画面を検索").fill("misaki");
  await expect(
    page.getByRole("button", { name: "詳細", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "詳細", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("台北");
  await page.getByRole("button", { name: "利用を停止", exact: true }).click();
  await page.getByLabel("変更理由").fill("本人から利用停止の依頼");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "利用を停止", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("サンプルに保存");
  await expect(page.locator("tbody").first()).toContainText("利用停止");
  await page.reload();
  await page.getByLabel("状態で絞り込み").selectOption("suspended");
  await page.getByRole("button", { name: "詳細", exact: true }).click();
  await page.getByRole("button", { name: "利用を再開", exact: true }).click();
  await page.getByLabel("変更理由").fill("本人から再開を希望");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "利用を再開", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("招待を登録し、取消と検索ができる", async ({ page }) => {
  await go(page, "会員・招待");
  await page.getByRole("button", { name: "会員を招待" }).click();
  await page
    .getByLabel("Googleアカウントのメール")
    .fill("invite-ui@example.test");
  await page.getByRole("button", { name: "招待を登録", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("サンプルに保存");
  await page.getByLabel("この画面を検索").fill("invite-ui");
  await page.getByRole("button", { name: "取り消す", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "招待を取り消す", exact: true })
    .click();
  await expect(page.locator("tbody")).toContainText("期限切れ");
});
test("募集を作成・編集し、中止すると予約が返金待ちへ移る", async ({ page }) => {
  await go(page, "トーク・小部屋");
  await page.getByRole("button", { name: "トークを作成" }).click();
  await page.getByLabel("タイトル", { exact: true }).fill("ソウルの喫茶店");
  await page.getByLabel("日時（日本時間）").fill("2027-01-15T20:00");
  await page
    .getByLabel("トークの内容")
    .fill("ソウルで訪れた喫茶店の話をします。");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "公開する", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "ソウルの喫茶店" }),
  ).toBeVisible();
  const card = page
    .locator(".talk-card")
    .filter({ hasText: "台北の喫茶店を話す" });
  await card.getByRole("button", { name: "編集", exact: true }).click();
  await page.getByLabel("タイトル", { exact: true }).fill("台北の喫茶店と再訪");
  await page.getByRole("button", { name: "変更を保存" }).click();
  await page
    .locator(".talk-card")
    .filter({ hasText: "台北の喫茶店と再訪" })
    .getByRole("button", { name: "中止", exact: true })
    .click();
  await page.getByLabel("中止理由").fill("進行役の都合で開催中止");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "トークを中止", exact: true })
    .click();
  await go(page, "予約・返金");
  await page.getByLabel("状態で絞り込み").selectOption("refund_pending");
  await expect(page.locator("tbody tr")).toHaveCount(2);
});
test("通報への対応・相談の有料成立・事業者確認を記録", async ({ page }) => {
  await go(page, "通報");
  await page.getByRole("button", { name: "対応済みにする" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "対応済みにする" })
    .click();
  await expect(page.locator(".badge-resolved")).toBeVisible();
  await go(page, "プロ相談");
  await page.getByRole("button", { name: "受諾を記録" }).click();
  await page.getByRole("button", { name: "有料成立を記録" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "有料成立を記録" })
    .click();
  await expect(page.locator(".badge-completed")).toBeVisible();
  await go(page, "事業者");
  await page.getByRole("button", { name: "確認済みにする" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "確認済みにする" })
    .click();
  await expect(page.locator(".badge-verified")).toBeVisible();
});
test("原価を保存して再読込し、操作履歴を確認", async ({ page }) => {
  await go(page, "採算");
  await page.getByLabel("決済手数料").fill("100");
  await page.getByLabel("進行役への謝礼").fill("1200");
  await page.getByLabel("調整の人件費").fill("500");
  await page.getByRole("button", { name: "原価を保存" }).click();
  await expect(page.getByRole("status")).toContainText("サンプルに保存");
  await page.reload();
  await expect(page.getByLabel("進行役への謝礼")).toHaveValue("1200");
  await expect(page.locator(".cost-total")).toContainText("200");
  await go(page, "操作履歴");
  await expect(page.locator("tbody")).toContainText("原価を保存");
});
test("現地メモの編集・公開停止と、配信の再試行", async ({ page }) => {
  await go(page, "現地メモ");
  await page.getByRole("button", { name: "編集", exact: true }).click();
  await page.getByLabel("タイトル", { exact: true }).fill("更新した営業時間");
  await page.getByRole("button", { name: "変更を保存" }).click();
  await page.getByRole("button", { name: "非公開にする" }).click();
  await expect(page.locator(".badge-draft")).toBeVisible();
  await go(page, "メール配信");
  await page.getByRole("button", { name: "再試行", exact: true }).click();
  await page.getByRole("button", { name: "再試行する" }).click();
  await expect(page.getByRole("status")).toContainText("サンプルに保存");
  await expect(page.locator("tbody")).toContainText("0回");
});
test("同じトークの4人から小部屋を作成し再読込できる", async ({ page }) => {
  await go(page, "トーク・小部屋");
  await page.getByRole("button", { name: "小部屋を作成", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await page.getByLabel("小部屋名").fill("喫茶店トークの参加者");
  for (const checkbox of await dialog.getByRole("checkbox").all())
    await checkbox.check();
  await dialog
    .getByRole("button", { name: "小部屋を作成", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("サンプルに保存");
  await page.reload();
  await expect(page.locator("tbody")).toContainText("喫茶店トークの参加者");
  await expect(
    page.locator("tbody tr").filter({ hasText: "喫茶店トークの参加者" }),
  ).toContainText("5人");
});
test("モーダルのフォーカス・Escape・通信中スケルトン", async ({ page }) => {
  await go(page, "会員・招待");
  const button = page.getByRole("button", { name: "会員を招待" });
  await button.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(button).toBeFocused();
  await page.route("**/api/admin/session", async (route) => {
    await new Promise((r) => setTimeout(r, 700));
    await route.continue();
  });
  await page.reload();
  await expect(
    page.getByRole("status", { name: "管理画面を読み込み中" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "会員・招待", exact: true }),
  ).toBeVisible();
  await page.unrouteAll({ behavior: "wait" });
});
