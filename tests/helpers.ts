import { expect, type Page } from "@playwright/test";

export async function openPeopleFilters(page: Page) {
  const toggle = page.getByRole("button", {
    name: /^絞り込みを(開く|閉じる)$/,
  });
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute("aria-expanded")) !== "true")
    await toggle.click();
}
