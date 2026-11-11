import { expect, type Page } from "@playwright/test";

export async function openPeopleFilters(page: Page) {
  const toggle = page.getByRole("button", {
    name: /^絞り込みを(開く|閉じる)$/,
  });
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute("aria-expanded")) !== "true")
    await toggle.click();
}

// 操作領域は44×44px以上、フォームの文字は16px以上（定義書 8.1）。
// 見えている操作要素のうち、基準に満たないものを返す。
// チェックボックス等は、44px以上のlabelで囲まれていれば対象外（labelが操作領域になる）。
export function undersizedControls(page: Page) {
  return page.evaluate(() => {
    const found: string[] = [];
    const name = (el: Element) =>
      el.tagName.toLowerCase() +
      (typeof el.className === "string" && el.className.trim()
        ? "." + el.className.trim().split(/\s+/).join(".")
        : "") +
      ` "${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 24)}"`;
    for (const el of document.querySelectorAll<HTMLElement>(
      "a[href],button,input,select,textarea,summary,[role=button],[role=tab]",
    )) {
      const box = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (!box.width || !box.height || style.visibility === "hidden") continue;
      if (el.closest(".sr-only,.skip,.skip-link")) continue;
      if (
        el.matches("input[type=checkbox],input[type=radio],input[type=file]")
      ) {
        const label =
          el.closest("label") ||
          (el.id && document.querySelector(`label[for="${el.id}"]`));
        if (label && label.getBoundingClientRect().height >= 43.5) continue;
      } else if (
        el.matches("input,select,textarea") &&
        parseFloat(style.fontSize) < 16
      )
        found.push(`文字 ${style.fontSize}: ${name(el)}`);
      if (box.width < 43.5 || box.height < 43.5)
        found.push(
          `領域 ${Math.round(box.width)}×${Math.round(box.height)}: ${name(el)}`,
        );
    }
    return found;
  });
}
