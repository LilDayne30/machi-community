import { describe, expect, it } from "vitest";
import { communityPeople } from "../src/lib/data";
import {
  matchesMember,
  parseRegions,
  MAX_AVATAR_BYTES,
} from "../src/lib/profile";
import { readPhoto, validProfileJpeg } from "../worker/photos";
describe("国・地域から会話相手を探す", () => {
  it("読点・カンマ・改行を扱い重複と空欄を除く", () =>
    expect(parseRegions("台湾、韓国\n台湾, 北欧,　韓国　,")).toEqual([
      "台湾",
      "韓国",
      "北欧",
    ]));
  it("英字の表記差と全角を正規化して重複を除く", () =>
    expect(parseRegions("Canada,ＣＡＮＡＤＡ, canada")).toEqual(["Canada"]));
  it("国籍・街・興味のある地域を組み合わせ、違う国籍を除く", () => {
    expect(
      matchesMember(communityPeople[1], "東京", "カナダ", "台湾", "喫茶店"),
    ).toBe(true);
    expect(
      matchesMember(communityPeople[1], "東京", "日本", "台湾", "すべて"),
    ).toBe(false);
    expect(
      matchesMember(communityPeople[1], "東京", "カナダ", "北欧", "すべて"),
    ).toBe(false);
  });
});
describe("写真の入力境界", () => {
  it("拡張子に関係なくSVG・PNG・偽JPEGのバイト列を拒否", () => {
    for (const value of ["<svg/>", "PNG", "JPEG", ""])
      expect(validProfileJpeg(new TextEncoder().encode(value))).toBe(false);
    expect(
      validProfileJpeg(
        new Uint8Array([
          255, 216, 255, 192, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0, 255, 217,
        ]),
      ),
    ).toBe(false);
  });
  it("Content-Lengthがなくても読み取り中に容量制限を適用", async () => {
    let cancelled = false;
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_AVATAR_BYTES));
        controller.enqueue(new Uint8Array(1));
      },
      cancel() {
        cancelled = true;
      },
    });
    const request = new Request("https://app.test/api/profile/photo", {
      method: "PUT",
      body: stream,
      duplex: "half",
    } as RequestInit);
    await expect(readPhoto(request)).rejects.toMatchObject({ status: 413 });
    expect(cancelled).toBe(true);
  });
  it("空の写真は拒否する", async () => {
    await expect(
      readPhoto(
        new Request("https://app.test/api/profile/photo", { method: "PUT" }),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});
