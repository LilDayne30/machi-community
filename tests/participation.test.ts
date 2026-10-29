import { describe, expect, it } from "vitest";
import {
  emptyParticipation,
  matchesParticipation,
  participationError,
  participationOf,
  participationSearch,
  publicParticipation,
  type StudyExperience,
} from "../src/lib/participation";
import { participationSchema } from "../worker/participation";

const experience: StudyExperience = {
  regionId: "country:CA",
  level: "high_school",
  format: "exchange",
  startYear: 2022,
  endYear: 2023,
  months: 10,
  topics: ["学校生活"],
};
function dual() {
  return {
    ...emptyParticipation(["explorer", "alumni", "local"]),
    questions: ["友達づくり"],
    experiences: [{ ...experience }],
    local: {
      kind: "student" as const,
      regionId: "city:JP:tokyo",
      languages: "日本語・英語",
      topics: "写真",
    },
  };
}
describe("立場ごとのプロフィール", () => {
  it("希望先が未定の検討者でも登録できる", () => {
    const p = { ...emptyParticipation(), questions: ["国・留学先選び"] };
    expect(participationSchema.safeParse(p).success).toBe(true);
  });
  it("経験者・検討者・現地生を同時に選べる", () => {
    expect(participationError(dual())).toBe("");
    expect(participationSchema.parse(dual()).roles).toHaveLength(3);
  });
  it("経験者には有効な留学先が必要", () => {
    expect(participationError(emptyParticipation(["alumni"]))).toContain(
      "1〜5件",
    );
    expect(
      participationError({
        ...dual(),
        experiences: [{ ...experience, regionId: "country:unknown" }],
      }),
    ).toContain("国・地域");
  });
  it("年・期間・重複・上限をサーバーでも検証する", () => {
    for (const patch of [
      { startYear: new Date().getUTCFullYear() + 1 },
      { endYear: 2021 },
      { months: 0 },
      { months: 121 },
      { topics: ["学校生活", "学校生活"] },
    ])
      expect(
        participationSchema.safeParse({
          ...dual(),
          experiences: [{ ...experience, ...patch }],
        }).success,
      ).toBe(false);
    expect(
      participationSchema.safeParse({ ...dual(), roles: ["local", "local"] })
        .success,
    ).toBe(false);
    expect(
      participationSchema.safeParse({ ...dual(), roles: [] }).success,
    ).toBe(false);
    expect(
      participationSchema.safeParse({
        ...dual(),
        experiences: Array.from({ length: 6 }, () => experience),
      }).success,
    ).toBe(false);
  });
  it("非選択の経験は入力途中の期間も保持でき、公開する際に再検証する", () => {
    const draft = {
      ...dual(),
      roles: ["explorer" as const],
      experiences: [{ ...experience, endYear: 2021, months: 0 }],
    };
    expect(participationSchema.safeParse(draft).success).toBe(true);
    expect(publicParticipation(draft).experiences).toEqual([]);
    expect(participationError({ ...draft, roles: ["alumni"] })).toContain(
      "帰国年",
    );
  });
  it("認証済み・管理者などの偽の属性を受け付けない", () => {
    expect(
      participationSchema.safeParse({ ...dual(), verified: true }).success,
    ).toBe(false);
    expect(
      participationSchema.safeParse({
        ...dual(),
        experiences: [{ ...experience, verified: true }],
      }).success,
    ).toBe(false);
  });
  it("非選択の立場のデータは公開・検索されず、元データは残る", () => {
    const p = { ...dual(), roles: ["explorer" as const] };
    const visible = publicParticipation(p);
    expect(visible.experiences).toEqual([]);
    expect(visible.local.languages).toBe("");
    expect(participationSearch({ participation: p })).not.toContain("カナダ");
    expect(participationSearch({ participation: p })).not.toContain("写真");
    expect(participationSearch({ participation: p })).toContain("友達づくり");
    expect(p.experiences).toHaveLength(1);
    expect(p.local.languages).toBe("日本語・英語");
    const alumniOnly = publicParticipation({
      ...dual(),
      roles: ["alumni"],
      stage: "preparing",
      destinations: ["country:TW"],
    });
    expect(alumniOnly.stage).toBe("curious");
    expect(alumniOnly.destinations).toEqual([]);
    expect(alumniOnly.questions).toEqual([]);
  });
  it("従来の会話受付会員は現地交流を維持し、学生とは推測しない", () => {
    expect(participationOf({ acceptsMessages: true }).roles).toEqual(["local"]);
    expect(participationOf({}, true).local.kind).toBe("resident");
    expect(participationOf({}).roles).toEqual(["explorer"]);
  });
});
describe("2つの軸で相手を探す", () => {
  const person = {
    participation: dual(),
    connections: [{ regionId: "city:JP:tokyo", status: "current" }],
  };
  it("同じ人が留学経験と現地交流の両方で見つかる", () => {
    expect(
      matchesParticipation(person, "alumni", "学校生活", "country:CA"),
    ).toBe(true);
    expect(
      matchesParticipation(person, "local", "", "country:JP", "student"),
    ).toBe(true);
    expect(matchesParticipation(person, "local", "", "country:CA")).toBe(false);
  });
  it("国が未定でもテーマから経験者を探せる", () => {
    expect(matchesParticipation(person, "alumni", "学校生活")).toBe(true);
    expect(matchesParticipation(person, "alumni", "ホストファミリー")).toBe(
      false,
    );
  });
  it("留学国とテーマは同じ経験レコードで一致する必要がある", () => {
    const other = {
      ...person,
      participation: {
        ...dual(),
        experiences: [
          experience,
          {
            ...experience,
            regionId: "country:TW",
            topics: ["ホストファミリー"],
          },
        ],
      },
    };
    expect(
      matchesParticipation(other, "alumni", "ホストファミリー", "country:CA"),
    ).toBe(false);
    expect(
      matchesParticipation(other, "alumni", "ホストファミリー", "country:TW"),
    ).toBe(true);
  });
  it("交流地域未入力なら現在地のみ使い、以前の居住地を使わない", () => {
    const p = dual();
    p.local.regionId = "";
    const other = {
      participation: p,
      connections: [
        { regionId: "city:JP:tokyo", status: "current" },
        { regionId: "city:TW:taipei", status: "former" },
      ],
    };
    expect(matchesParticipation(other, "local", "", "country:JP")).toBe(true);
    expect(matchesParticipation(other, "local", "", "country:TW")).toBe(false);
    expect(
      matchesParticipation(other, "local", "", "", "studying_abroad"),
    ).toBe(false);
  });
  it("その立場を外すと該当する軸に表示しない", () => {
    const other = {
      ...person,
      participation: { ...dual(), roles: ["explorer" as const] },
    };
    expect(matchesParticipation(other, "local")).toBe(false);
    expect(matchesParticipation(other, "alumni")).toBe(false);
  });
});
