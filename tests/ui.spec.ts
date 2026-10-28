import { openPeopleFilters } from "./helpers";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { emptyProfile } from "../src/lib/data";
// Let intercepted responses finish before Playwright disposes the request context.
test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "wait" });
});
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
  await expect(page.locator(".home-discovery")).toBeVisible();
  await expect(page.locator(".talk-card")).toHaveCount(1);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({
    path: `test-results/${info.project.name}-home.png`,
    fullPage: true,
  });
  for (const [path, title] of [
    ["/people", "話せる人"],
    ["/rooms", "メッセージ"],
    ["/consult", "プロへの相談"],
    ["/profile", "プロフィール"],
  ]) {
    await page
      .locator("nav:visible")
      .getByRole("link", {
        name: info.project.name.startsWith("mobile")
          ? (
              {
                話せる人: "話せる人",
                メッセージ: "メッセージ",
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
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
  expect(errors).toEqual([]);
});
test("現地メモのテーマ絞り込み・検索・保存", async ({ page }) => {
  await page.getByRole("button", { name: "古本屋", exact: true }).click();
  await expect(page.locator(".note-card")).toHaveCount(1);
  await page.getByRole("button", { name: "メモを検索" }).click();
  await page.getByLabel("話題・メモを検索").fill("見つからない語");
  await expect(page.getByText("一致するメモはありません")).toBeVisible();
  await page.getByLabel("話題・メモを検索").fill("雨");
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
test("地域トークの小部屋・投稿・返信・通報", async ({ page }) => {
  await page.goto("/rooms/r1");
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
  await page.goto("/rooms?tab=group");
  await expect(page.locator(".room-card .unread-badge")).toHaveCount(0);
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
  await page
    .getByRole("combobox", { name: "現在の居住地の国・地域", exact: true })
    .selectOption("country:JP");
  await page
    .getByRole("combobox", { name: "現在の居住地の街（任意）", exact: true })
    .selectOption("city:JP:tokyo");
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
test("動きを減らす設定を即時反映し、絞り込みとキーボード操作を保つ", async ({
  page,
}) => {
  // Switch after mount as well: OS accessibility preferences can change mid-session.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter(
              (animation) =>
                animation.playState === "running" &&
                animation.effect?.getComputedTiming().iterations === Infinity,
            ).length,
      ),
    )
    .toBe(0);
  const notification = page.getByRole("button", { name: "通知を開く" });
  await notification.click();
  await expect(
    page.getByRole("dialog", { name: "通知", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(notification).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/people");
  await page.getByRole("button", { name: "写真", exact: true }).click();
  await expect(page.locator(".person-card")).toHaveCount(1);
  await expect(page.locator(".person-card")).toContainText("あかり");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(page.viewportSize()!.width);
});
test("プロフィールから別サイトの管理画面へ移動", async ({ page }) => {
  await page.goto("/profile");
  await page.getByRole("link", { name: "運営管理", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:5174/");
  await expect(
    page.getByRole("heading", { name: "概要", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".preview-bar")).toContainText(
    "実データは変更されません",
  );
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
  test.setTimeout(60000);
  for (const path of [
    "/",
    "/people",
    "/people/misaki",
    "/rooms",
    "/rooms/dm-misaki",
    "/talks",
    "/talks/t1",
    "/notes/n1",
    "/consult",
    "/profile",
  ]) {
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
    if (
      [
        "/people",
        "/people/misaki",
        "/profile",
        "/rooms",
        "/consult",
        "/talks/t1",
      ].includes(path)
    ) {
      await page.screenshot({
        path: `test-results/${test.info().project.name}-${path.slice(1).replaceAll("/", "-")}-rich.png`,
        fullPage: false,
      });
    }
  }
});

test("ホームから2タップで個人プロフィールと1対1の会話へ進む", async ({
  page,
}) => {
  await page
    .getByRole("link", { name: "美咲 日本・京都", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "美咲", level: 1, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "美咲 メッセージ", exact: true })
    .click();
  await expect(page.locator(".chat-header h1")).toHaveText("美咲");
  await expect(page.getByText("あなたと美咲だけの会話")).toBeVisible();
  await page
    .getByRole("textbox", { name: "メッセージ", exact: true })
    .fill("次は11月に再訪します。朝の喫茶店の話を聞きたいです。");
  await page
    .getByRole("button", { name: "メッセージを送信", exact: true })
    .click();
  await expect(page.locator(".message.own")).toContainText("11月に再訪");
  await page.reload();
  await expect(page.locator(".message.own")).toContainText("11月に再訪");
  await page.goto("/rooms");
  await expect(page.getByRole("tab", { name: /^1対1/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(".conversation-row")).toHaveCount(2);
  await expect(page.locator(".conversation-row .unread-badge")).toHaveCount(0);
});
test("新しい個人会話の開始・重複防止・相手ごとの履歴", async ({ page }) => {
  await page.goto("/people");
  await page
    .getByRole("button", { name: "あかり メッセージ", exact: true })
    .click();
  await expect(page.locator(".chat-header h1")).toHaveText("あかり");
  await page.getByRole("button", { name: "写真の話をする" }).click();
  await expect(
    page.getByRole("textbox", { name: "メッセージ", exact: true }),
  ).toHaveValue("はじめまして。写真についてお話ししたいです。");
  await page
    .getByRole("button", { name: "メッセージを送信", exact: true })
    .click();
  await page.goto("/people");
  await page
    .getByRole("button", { name: "あかり メッセージ", exact: true })
    .click();
  await expect(page.locator(".message.own")).toHaveCount(1);
  await page.goto("/rooms");
  await expect(page.locator(".conversation-row")).toHaveCount(3);
  await page.getByRole("tab", { name: /^地域トークの小部屋/ }).click();
  await expect(page.locator(".room-card")).toHaveCount(2);
});
test("個人会話をブロックし新しい受付を自分で選べる", async ({ page }) => {
  await page.goto("/rooms/dm-misaki");
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
  await page.goto("/people");
  await expect(
    page.getByRole("button", { name: "美咲 メッセージ" }),
  ).toHaveCount(0);
  await page.goto("/rooms/dm-misaki");
  await page.getByRole("button", { name: "会話の設定", exact: true }).click();
  await page
    .getByRole("button", { name: "ブロックを解除する", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "メッセージ", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".message:not(.own)")).toContainText(
    "次に京都に来るのは",
  );
  await page.goto("/profile");
  await page.getByLabel("新しい1対1の会話を受け付ける").check();
  await page.getByRole("button", { name: "変更を保存" }).click();
  await page.reload();
  await expect(page.getByLabel("新しい1対1の会話を受け付ける")).toBeChecked();
});

test("国籍必須・街任意・興味のある地域と写真の保存・削除", async ({ page }) => {
  await page.goto("/profile");
  const nationality = page.getByLabel("国籍（必須）", { exact: true });
  await nationality.fill("");
  await page.getByRole("button", { name: "変更を保存", exact: true }).click();
  expect(
    await nationality.evaluate(
      (input: HTMLInputElement) => input.validity.valueMissing,
    ),
  ).toBe(true);
  await nationality.fill("台湾");
  await page
    .getByRole("combobox", { name: "現在の居住地の国・地域", exact: true })
    .selectOption("");
  await page
    .getByLabel("興味のある国・地域", { exact: true })
    .fill("韓国、台湾、韓国\n北欧");
  await page
    .getByLabel("プロフィール写真を選ぶ", { exact: true })
    .setInputFiles("public/icon-192.png");
  await expect(page.locator(".profile-identity img")).toBeVisible();
  await page.getByRole("button", { name: "変更を保存", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "プロフィールを保存しました",
  );
  await page.reload();
  await expect(nationality).toHaveValue("台湾");
  await expect(
    page.getByRole("combobox", {
      name: "現在の居住地の街（任意）",
      exact: true,
    }),
  ).toHaveValue("");
  await expect(
    page.getByLabel("興味のある国・地域", { exact: true }),
  ).toHaveValue("韓国、台湾、北欧");
  await expect(page.locator(".profile-identity img")).toHaveAttribute(
    "src",
    /^data:image\/jpeg;base64,/,
  );
  await page.getByRole("button", { name: "写真を削除", exact: true }).click();
  await page.getByRole("button", { name: "変更を保存", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("保存しました");
  await page.reload();
  await expect(page.locator(".profile-identity img")).toHaveCount(0);
});
test("国籍・街・興味のある地域から相手を探し会話を始める", async ({ page }) => {
  await page.goto("/people");
  await openPeopleFilters(page);
  await page
    .getByRole("combobox", { name: "国籍で絞り込む", exact: true })
    .selectOption("カナダ");
  await page.getByLabel("名前・街・話したいこと", { exact: true }).fill("東京");
  await openPeopleFilters(page);
  await page
    .getByRole("combobox", {
      name: "興味のある国・地域で絞り込む",
      exact: true,
    })
    .selectOption("台湾");
  await expect(page.locator(".person-card")).toHaveCount(1);
  await expect(page.locator(".person-card")).toContainText("カナダ · 東京");
  await page
    .getByRole("button", { name: "絞り込みを閉じる", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "国籍で絞り込む", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "カナダの条件を解除", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "台湾に興味の条件を解除", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".person-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "悠太 メッセージ", exact: true })
    .click();
  await expect(page.locator(".chat-header h1")).toHaveText("悠太");
  await page.goto("/people/akari");
  await page.getByRole("link", { name: "北欧", exact: true }).click();
  await openPeopleFilters(page);
  await expect(
    page.getByRole("combobox", {
      name: "興味のある国・地域で絞り込む",
      exact: true,
    }),
  ).toHaveValue("北欧");
  await expect(page.locator(".person-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "あかり メッセージ", exact: true })
    .click();
  await expect(page.locator(".chat-header h1")).toHaveText("あかり");
});
test("写真の形式と元ファイルのサイズを確認し不正ファイルを保存しない", async ({
  page,
}) => {
  await page.goto("/profile");
  const input = page.getByLabel("プロフィール写真を選ぶ", { exact: true });
  await input.setInputFiles({
    name: "script.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    ),
  });
  await expect(page.getByRole("status")).toContainText(
    "JPEG・PNG・WebPの写真を選んでください",
  );
  await input.setInputFiles({
    name: "large.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  });
  await expect(page.getByRole("status")).toContainText(
    "10MB以下の写真を選んでください",
  );
  await expect(page.locator(".profile-identity img")).toHaveCount(0);
});

test("現在の居住地と過去の居住地・留学・期間を別々に保存する", async ({
  page,
}) => {
  await page.evaluate(
    (profile) =>
      localStorage.setItem("machi-preview-v1", JSON.stringify({ profile })),
    { ...emptyProfile, name: "既存の会員", nationality: "日本", city: "京都" },
  );
  await page.goto("/profile");
  await expect(page.locator(".legacy-city")).toContainText("京都");
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
  await page.getByRole("button", { name: "変更を保存", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("保存しました");
  await page.reload();
  await expect(page.locator(".legacy-city")).toContainText("京都");
  await expect(
    page.getByRole("combobox", { name: "現在の居住地の国・地域", exact: true }),
  ).toHaveValue("");
  await page
    .getByRole("combobox", { name: "現在の居住地の国・地域", exact: true })
    .selectOption("country:JP");
  await page
    .getByRole("combobox", { name: "現在の居住地の街（任意）", exact: true })
    .selectOption("city:JP:tokyo");
  await page
    .getByRole("combobox", { name: "現在の居住地での目的", exact: true })
    .selectOption("work");
  await page.getByRole("button", { name: "変更を保存", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("保存しました");
  await page.reload();
  await expect(
    page.getByRole("combobox", {
      name: "現在の居住地の街（任意）",
      exact: true,
    }),
  ).toHaveValue("city:JP:tokyo");
  await expect(
    page.getByRole("combobox", { name: "地域 1の街（任意）", exact: true }),
  ).toHaveValue("city:TW:taipei");
  await expect(
    page.getByRole("combobox", { name: "地域 1での目的", exact: true }),
  ).toHaveValue("study");
  await expect(page.getByLabel("地域 1の終了年", { exact: true })).toHaveValue(
    "2022",
  );
  await page
    .getByRole("combobox", { name: "現在の居住地の国・地域", exact: true })
    .selectOption("country:CA");
  await expect(
    page.getByRole("combobox", {
      name: "現在の居住地の街（任意）",
      exact: true,
    }),
  ).toHaveValue("");
  await page
    .getByRole("button", { name: "地域との関わり 1を削除", exact: true })
    .click();
  await page.getByRole("button", { name: "変更を保存", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("保存しました");
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "現在の居住地の国・地域", exact: true }),
  ).toHaveValue("country:CA");
  await expect(
    page.getByRole("combobox", { name: "地域 1の国・地域", exact: true }),
  ).toHaveCount(0);
});

test("居住と過去の居住を国・街に紐づけて絞り込み、地域タグから会話する", async ({
  page,
}) => {
  await page.goto("/people");
  await openPeopleFilters(page);
  await page
    .getByRole("combobox", { name: "関わりのある地域", exact: true })
    .selectOption("country:TW");
  await openPeopleFilters(page);
  await page
    .getByRole("combobox", { name: "地域との関わり", exact: true })
    .selectOption("current");
  await expect(page.locator(".person-card")).toHaveCount(1);
  await expect(page.locator(".person-card")).toContainText("あかり");
  await openPeopleFilters(page);
  await page
    .getByRole("combobox", { name: "地域との関わり", exact: true })
    .selectOption("former");
  await expect(page.locator(".person-card")).toHaveCount(1);
  await expect(page.locator(".person-card")).toContainText("美咲");
  await page.goto("/people/akari");
  await page.getByRole("link", { name: /台湾・台北.*住んでいる/ }).click();
  await openPeopleFilters(page);
  await expect(
    page.getByRole("combobox", { name: "関わりのある地域", exact: true }),
  ).toHaveValue("city:TW:taipei");
  await openPeopleFilters(page);
  await expect(
    page.getByRole("combobox", { name: "地域との関わり", exact: true }),
  ).toHaveValue("current");
  await expect(page.locator(".person-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "あかり メッセージ", exact: true })
    .click();
  await expect(page.locator(".chat-header h1")).toHaveText("あかり");
});

test("全画面からトーク・プロフィールの項目へ直接移動できる", async ({
  page,
}, info) => {
  await page.goto("/people");
  await page
    .getByRole("link", { name: "地域トークと申込み", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "地域トーク", exact: true }),
  ).toBeVisible();
  await page.goto("/profile");
  await page
    .getByRole("navigation", { name: "プロフィールの項目" })
    .getByRole("link", { name: "訪問予定", exact: true })
    .click();
  await expect(page).toHaveURL(/#profile-visit$/);
  await expect(
    page.getByRole("heading", { name: "訪問予定・話せる時間" }),
  ).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "変更を保存", exact: true }),
  ).toBeInViewport();
  await page.screenshot({
    path: `test-results/${info.project.name}-profile-sections.png`,
    fullPage: false,
  });
});

test("会話の検索・未読絞り込み・タブ状態を保持する", async ({ page }) => {
  await page.goto("/rooms");
  await page.getByLabel("会話を検索", { exact: true }).fill("美咲");
  await expect(page.locator(".conversation-row")).toHaveCount(1);
  await expect(page.locator(".conversation-row")).toContainText("美咲");
  await page.getByRole("button", { name: "未読のみ", exact: true }).click();
  await expect(page).toHaveURL(/unread=1/);
  await page.reload();
  await expect(page.getByLabel("会話を検索", { exact: true })).toHaveValue(
    "美咲",
  );
  await expect(
    page.getByRole("button", { name: "未読のみ", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("会話を検索", { exact: true }).fill("");
  await page.getByRole("tab", { name: /1対1/ }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: /地域トークの小部屋/ }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/tab=group/);
  await page.reload();
  await expect(
    page.getByRole("tab", { name: /地域トークの小部屋/ }),
  ).toHaveAttribute("aria-selected", "true");
});

test("Googleログインの失敗理由と再試行先を表示", async ({ page }) => {
  await page.goto("/profile?login=expired");
  await expect(page.getByRole("alert")).toContainText(
    "認証の有効期限が切れました",
  );
  await page.getByRole("button", { name: "ログイン通知を閉じる" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page).toHaveURL(/\/profile$/);
  await page.goto("/profile?login=not_invited");
  await expect(page.getByRole("alert")).toContainText("招待されたアカウント");
  for (const reason of ["__proto__", "constructor", "unknown"]) {
    await page.goto("/profile?login=" + reason);
    await expect(
      page.getByRole("heading", { name: "プロフィール", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  }
});
