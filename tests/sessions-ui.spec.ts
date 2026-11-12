import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const cookie = (value: string, name = "machi_session") => ({
  name,
  value,
  domain: "127.0.0.1",
  path: "/",
});
const slot = (days: number, hour: number) => {
  const d = new Date(Date.now() + days * 86400e3);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(hour)}:00`;
};

test.describe.configure({ mode: "serial" });
// Only the member UI preview flag changes; data comes from the real local Worker/D1.
async function realMode(page: Page) {
  await page.route("**/api/bootstrap", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    await route.fulfill({ response, json: { ...data, mode: "production" } });
  });
}

test.describe("有料相談：申込から承認まで", () => {
  let sessionId = "";
  test.beforeEach(async ({ page }) => realMode(page));
  test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "wait" }));
  test("申込者が申し込み、承認待ちを確認し、学校名は出ない", async ({
    page,
    context,
  }) => {
    await context.addCookies([cookie("e2e-scli")]);
    await page.goto("/people/e2e-sadv/session/new");
    await expect(
      page.getByRole("heading", { name: /に相談を申し込む/ }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("秘密大学");
    await page
      .getByLabel(/相談したいこと/)
      .fill("留学先の学校選びと費用について相談したいです。");
    await page.getByLabel("候補1").fill(slot(3, 10));
    await page.getByLabel("候補2").fill(slot(4, 11));
    await page.getByLabel("候補3").fill(slot(5, 12));
    await page.getByRole("button", { name: "支払いなしで申し込む" }).click();
    await expect(page).toHaveURL(/\/sessions\/[^/]+$/);
    sessionId = new URL(page.url()).pathname.split("/").pop()!;
    await expect(page.locator(".session-badge")).toContainText("承認待ち");
    await expect(page.locator("body")).not.toContainText("秘密大学");
  });

  test("経験者が承認し、申込者に支払うボタンとキャンセル規定が出る", async ({
    page,
    context,
  }) => {
    expect(sessionId).toBeTruthy();
    await context.addCookies([cookie("e2e-sadv")]);
    await page.goto("/sessions/" + sessionId);
    await expect(page.locator(".session-badge")).toContainText("承認待ち");
    await page.getByRole("radio").first().check();
    await page.getByLabel(/通話URL/).fill("https://meet.example.test/e2e-room");
    await page.getByRole("button", { name: "この日時で承認する" }).click();
    await expect(page.getByRole("status")).toContainText("承認しました");
    await expect(
      page.getByText("申込者のお支払いを待っています"),
    ).toBeVisible();

    await context.clearCookies();
    await context.addCookies([cookie("e2e-scli")]);
    await page.goto("/sessions/" + sessionId);
    await expect(page.getByRole("button", { name: /^支払う/ })).toBeVisible();
    await page.getByRole("button", { name: "キャンセルする" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("この相談をキャンセルしますか？");
    // Unpaid (accepted) state: no charge, so no refund rule applies yet.
    await expect(dialog).toContainText("料金は発生しません");
    await dialog.getByRole("button", { name: "やめる" }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("画面幅320pxではみ出しとアクセシビリティ違反がない", async ({
    page,
    context,
  }) => {
    test.setTimeout(120000);
    await context.addCookies([cookie("e2e-scli")]);
    await page.setViewportSize({ width: 320, height: 700 });
    for (const path of [
      "/sessions",
      "/sessions/" + sessionId,
      "/advisor/apply",
      "/legal/terms",
      "/legal/tokushoho",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading").first()).toBeVisible();
      await page.waitForTimeout(800);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        path + " overflow",
      ).toBe(true);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        result.violations
          .filter((v) => ["serious", "critical"].includes(v.impact || ""))
          .map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
        path,
      ).toEqual([]);
    }
  });
});

test.describe("有料相談：管理サイト", () => {
  test.use({ baseURL: "http://127.0.0.1:5174" });
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      cookie("e2e-admin-admin", "machi_admin_session"),
    ]);
  });
  async function open(page: Page, path: string) {
    await page.goto(path);
    await expect(page.locator("main, #root").first()).toBeVisible();
  }
  test("経験者の申請を確認して承認する", async ({ page }) => {
    await open(page, "/advisors");
    const row = page.getByRole("row").filter({ hasText: "申請中テストさん" });
    await expect(row).toBeVisible();
    await expect(row).toContainText("審査待ち");
    await expect(row.getByRole("link", { name: /書類を見る/ })).toHaveAttribute(
      "href",
      /\/api\/admin\/advisors\/e2e-spend\/document/,
    );
    await row.getByRole("button", { name: "承認", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "承認する", exact: true })
      .click();
    await expect(
      page.getByRole("row").filter({ hasText: "申請中テストさん" }),
    ).toContainText("承認済み");
  });
  for (const path of ["/payouts", "/sessions"]) {
    test(path + " が表示される", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await open(page, path);
      await page.waitForTimeout(1000);
      await expect(page.getByRole("alert")).toHaveCount(0);
      await expect(page.getByRole("heading").first()).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
});
