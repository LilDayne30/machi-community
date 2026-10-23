import { test, expect } from "@playwright/test";
test("本番ビルドは未認証時にロックし、サンプルやログイン入口を表示しない", async ({
  page,
}) => {
  await page.route("**/api/admin/session", (route) =>
    route.fulfill({ json: { authenticated: false, loginDeferred: true } }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "管理者ログインは保留中です" }),
  ).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.locator(".preview-bar")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Google/ })).toHaveCount(0);
});
