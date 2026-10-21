import { describe, it, expect } from "vitest";
import Stripe from "stripe";
import { canRefund, isSameOrigin, safeText, sha256 } from "../worker/security";
describe("料金と境界時刻", () => {
  it("24時間前は返金できる", () => {
    expect(
      canRefund(
        "2026-11-20T20:00:00+09:00",
        Date.parse("2026-11-19T20:00:00+09:00"),
      ),
    ).toBe(true);
  });
  it("24時間を1ミリ秒でも過ぎると返金不可", () => {
    expect(
      canRefund(
        "2026-11-20T20:00:00+09:00",
        Date.parse("2026-11-19T20:00:00.001+09:00"),
      ),
    ).toBe(false);
  });
});
describe("Origin・メール・トークン", () => {
  it("類似ドメインを許可しない", () => {
    expect(
      isSameOrigin(
        "https://machi.example.evil.com",
        "https://machi.example/api/profile",
        "https://machi.example",
      ),
    ).toBe(false);
    expect(
      isSameOrigin(
        null,
        "https://machi.example/api/profile",
        "https://machi.example",
      ),
    ).toBe(false);
    expect(
      isSameOrigin(
        "https://machi.example",
        "https://machi.example/api/profile",
        "https://machi.example",
      ),
    ).toBe(true);
  });
  it("メールへHTMLを差し込めない", () => {
    expect(safeText('<img onerror="alert(1)">')).toBe(
      "&lt;img onerror=&quot;alert(1)&quot;&gt;",
    );
  });
  it("セッションはSHA-256で保存する", async () => {
    expect(await sha256("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
describe("Stripe webhookの署名", () => {
  const stripe = new Stripe("sk_test_local_only");
  const payload = JSON.stringify({
    id: "evt_test",
    type: "checkout.session.completed",
    data: { object: { id: "cs_test" } },
  });
  const secret = "whsec_local_only";
  it("正しい署名を受け入れる", async () => {
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
    });
    const e = await stripe.webhooks.constructEventAsync(
      payload,
      header,
      secret,
      300,
      Stripe.createSubtleCryptoProvider(),
    );
    expect(e.id).toBe("evt_test");
  });
  it("本文改ざんを拒否する", async () => {
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
    });
    await expect(
      stripe.webhooks.constructEventAsync(
        payload + " ",
        header,
        secret,
        300,
        Stripe.createSubtleCryptoProvider(),
      ),
    ).rejects.toThrow();
  });
  it("期限切れの署名を拒否する", async () => {
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
      timestamp: Math.floor(Date.now() / 1000) - 600,
    });
    await expect(
      stripe.webhooks.constructEventAsync(
        payload,
        header,
        secret,
        300,
        Stripe.createSubtleCryptoProvider(),
      ),
    ).rejects.toThrow();
  });
});
