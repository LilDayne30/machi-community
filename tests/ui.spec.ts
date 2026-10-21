import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "地域ホーム", exact: true }),
  ).toBeVisible();
});
test("ホーム・画像・レスポンシブ・主要画面の2タップ導線", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await expect(page.locator(".region-hero img")).toBeVisible();
  await expect(page.locator(".talk-card")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/${info.project.name}-home.png`,
    fullPage: true,
  });
  for (const [path, title] of [
    ["/talks", "地域トーク"],
    ["/rooms", "マイルーム"],
    ["/consult", "プロへの相談"],
    ["/profile", "プロフィール"],
  ]) {
    await page
      .locator("nav:visible")
      .getByRole("link", {
        name: info.project.name.startsWith("mobile")
          ? (
              {
                地域トーク: "トーク",
                マイルーム: "ルーム",
                プロへの相談: "相談",
                プロフィール: "マイページ",
              } as any
            )[title]
          : title,
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(path + "$"));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
test("現地メモのテーマ絞り込み・検索・保存", async ({ page }) => {
  await page.getByRole("button", { name: "古本屋", exact: true }).click();
  await expect(page.locator(".note-card")).toHaveCount(1);
  await page.getByRole("button", { name: "地域を検索" }).click();
  await page.getByLabel("京都の話題・メモを検索").fill("見つからない語");
  await expect(page.getByText("一致するメモはありません")).toBeVisible();
  await page.getByLabel("京都の話題・メモを検索").fill("雨");
  await page.locator(".note-card").click();
  await expect(
    page.getByRole("heading", { name: "雨の日に寄りたい古本屋" }),
  ).toBeVisible();
  await expect(page.getByText("情報確認日：2026-10-17")).toBeVisible();
  await page.getByRole("button", { name: "メモを保存" }).click();
  await expect(
    page.getByRole("button", { name: "メモを保存" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "メモを保存" }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("トーク申込み・重複防止・リロード保持・キャンセル", async ({ page }) => {
  await page.locator(".talk-card").click();
  await page.getByRole("button", { name: "参加を申し込む" }).click();
  await expect(
    page.getByRole("button", { name: "参加を確定する" }),
  ).toBeDisabled();
  await page.getByLabel("開催日時・料金・キャンセル条件を確認しました").check();
  await page.getByRole("button", { name: "参加を確定する" }).click();
  await expect(
    page.getByRole("dialog", { name: "参加が確定しました" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "トーク詳細へ" }).click();
  await expect(page.locator(".booking-confirmed")).toHaveText("参加確定");
  await expect(
    page.getByRole("button", { name: "参加を申し込む" }),
  ).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "申込みをキャンセル" }).click();
  await page.getByRole("button", { name: "キャンセルを確定" }).click();
  await expect(
    page.getByRole("button", { name: "参加を申し込む" }),
  ).toBeVisible();
});
test("2回目のトーク料金を表示", async ({ page }) => {
  await page.locator(".talk-card").click();
  await page.getByRole("button", { name: "参加を申し込む" }).click();
  await page.getByLabel("開催日時・料金・キャンセル条件を確認しました").check();
  await page.getByRole("button", { name: "参加を確定する" }).click();
  await page.getByRole("button", { name: "トーク詳細へ" }).click();
  await page.goto("/talks/t2");
  await expect(page.locator(".price")).toHaveText("¥1,000");
});
test("小部屋・未読・投稿・返信・通報", async ({ page }) => {
  await page.locator(".room-preview").first().click();
  await expect(page.locator(".chat-header h1")).toHaveText(
    "京都の喫茶と、街歩き",
  );
  await page
    .getByRole("textbox", { name: "メッセージ", exact: true })
    .fill("教えてもらった喫茶店へ行きました。次の旅も楽しみです。");
  await page
    .getByRole("button", { name: "メッセージを送信", exact: true })
    .click();
  await expect(page.locator(".message.own").last()).toContainText(
    "次の旅も楽しみです",
  );
  await page
    .getByRole("button", { name: "返信する", exact: true })
    .first()
    .click();
  await expect(page.locator(".reply-bar")).toBeVisible();
  await page
    .getByRole("textbox", { name: "メッセージ", exact: true })
    .fill("朝の時間にまた訪ねたいです");
  await page
    .getByRole("button", { name: "メッセージを送信", exact: true })
    .click();
  await expect(
    page.locator(".message.own").last().locator(".reply-context"),
  ).toBeVisible();
  await page.getByRole("button", { name: "美咲の投稿メニュー" }).click();
  await page.getByRole("button", { name: "通報", exact: true }).click();
  await page
    .getByRole("combobox", { name: "理由", exact: true })
    .selectOption("誤った情報");
  await page.getByRole("button", { name: "通報を送信" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".message.own")).toHaveCount(2);
  await page.goto("/rooms");
  await expect(page.locator(".unread-badge")).toHaveCount(0);
});
test("訪問予定とステータスのフリック・プロフィール保存", async ({ page }) => {
  await page.getByRole("button", { name: "次の訪問ステータス" }).click();
  await expect(page.locator(".trip-status")).toContainText("訪問予定あり");
  await page.locator(".trip-card").evaluate((el) => {
    el.dispatchEvent(
      new TouchEvent("touchstart", {
        touches: [
          new Touch({ identifier: 1, target: el, clientX: 270, clientY: 100 }),
        ],
        bubbles: true,
      }),
    );
    el.dispatchEvent(
      new TouchEvent("touchend", {
        changedTouches: [
          new Touch({ identifier: 1, target: el, clientX: 100, clientY: 100 }),
        ],
        bubbles: true,
      }),
    );
  });
  await expect(page.locator(".trip-status")).toContainText("滞在中");
  await page.getByRole("button", { name: "訪問予定を編集" }).click();
  await page.getByLabel("訪問予定日", { exact: true }).fill("2026-11-20");
  await page.getByRole("button", { name: "保存する", exact: true }).click();
  await expect(page.locator(".trip-date")).toContainText("11月20日");
  await page.goto("/profile");
  await page
    .getByLabel("表示名", { exact: true })
    .fill("京都に再訪するテストさん");
  await page
    .getByLabel("自己紹介", { exact: true })
    .fill("古本と喫茶店が好きです");
  await page.getByLabel("京都との関わり").selectOption("再訪予定");
  await page.getByRole("button", { name: "古本屋", exact: true }).click();
  await page.getByRole("button", { name: "変更を保存" }).click();
  await page.reload();
  await expect(page.getByLabel("表示名", { exact: true })).toHaveValue(
    "京都に再訪するテストさん",
  );
  await expect(
    page.getByRole("button", { name: "古本屋", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Google認証は未接続です" }),
  ).toBeDisabled();
});
test("プロ相談・明示的な共有・送信履歴", async ({ page }) => {
  await page.locator(".room-preview").first().click();
  await page
    .getByRole("textbox", { name: "メッセージ", exact: true })
    .fill("自分の共有してよい投稿です");
  await page
    .getByRole("button", { name: "メッセージを送信", exact: true })
    .click();
  await page.goto("/consult");
  await page
    .getByRole("button", { name: "このプロに相談する" })
    .first()
    .click();
  await page
    .getByLabel("相談のタイトル", { exact: true })
    .fill("11月の喫茶店めぐり");
  await page
    .getByLabel("依頼内容", { exact: true })
    .fill("京都に再訪します。喫茶店めぐりを2人で相談したいです。");
  await page
    .getByRole("combobox", { name: "予算", exact: true })
    .selectOption("3,000〜5,000円");
  await page.getByLabel("希望日", { exact: true }).fill("2026-11-20");
  await expect(page.locator(".share-field input")).toHaveCount(1);
  await page.getByLabel("自分の共有してよい投稿です").check();
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
  await expect(page.locator(".consultation-row")).toContainText(
    "11月の喫茶店めぐり",
  );
  await page.reload();
  await expect(page.locator(".consultation-row")).toContainText("送信済み");
});
test("モーダルをEscapeで閉じる・キーボード操作", async ({ page }) => {
  await page.getByRole("button", { name: "通知を開く" }).click();
  await expect(
    page.getByRole("dialog", { name: "通知", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "通知を開く" })).toBeFocused();
});
test("管理画面の予約・通報・相談・招待フォームに到達", async ({ page }) => {
  await page.goto("/profile");
  await page.getByRole("link", { name: "運営管理", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "運営管理", exact: true }),
  ).toBeVisible();
  for (const t of ["通報", "相談", "事業者", "募集・招待", "採算"]) {
    await page.getByRole("button", { name: t, exact: true }).click();
    await expect(page.locator(".admin-panel")).toBeVisible();
  }
  await page.getByLabel("決済手数料").fill("100");
  await page.getByLabel("進行役への謝礼").fill("2000");
  await page.getByLabel("調整の人件費").fill("1000");
  await page.getByRole("button", { name: "原価を保存" }).click();
  await expect(page.getByRole("status")).toContainText("原価を記録しました");
});
test("通信中はスケルトンを表示", async ({ page }) => {
  await page.route("**/api/bootstrap", async (route) => {
    await new Promise((r) => setTimeout(r, 750));
    await route.continue();
  });
  await page.reload();
  await expect(page.getByRole("status", { name: "読み込み中" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "地域ホーム", exact: true }),
  ).toBeVisible();
});
test("未定義URLは404を表示", async ({ page }) => {
  await page.goto("/missing");
  await expect(
    page.getByRole("heading", { name: "ページが見つかりません" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "地域ホームに戻る" }).click();
  await expect(
    page.getByRole("heading", { name: "地域ホーム", exact: true }),
  ).toBeVisible();
});
test("アクセシビリティ：ホームと主要画面", async ({ page }) => {
  for (const path of ["/", "/talks", "/rooms", "/consult", "/profile"]) {
    if (path !== "/") await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("main > div").first()).toHaveCSS("opacity", "1");
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  }
});
