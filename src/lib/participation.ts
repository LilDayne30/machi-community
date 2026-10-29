import { getRegion, regionLabel, withinRegion } from "./regions";

export const participationRoles = {
  explorer: "留学を考える・準備する",
  alumni: "留学経験を伝える",
  local: "現地で交流する",
} as const;
export const studyStages = {
  curious: "興味がある",
  comparing: "国や留学形式を比較中",
  preparing: "渡航準備中",
  abroad: "留学中",
  returned: "帰国後",
} as const;
export const studyTopics = [
  "学校生活",
  "英語・言語",
  "友達づくり",
  "ホストファミリー",
  "準備・持ち物",
  "国・留学先選び",
] as const;
export const studyLevels = {
  high_school: "高校留学",
  university: "大学留学",
  language: "語学留学",
  other: "その他",
} as const;
export const studyFormats = {
  exchange: "交換留学",
  direct: "学校への直接入学",
  short: "短期プログラム",
  other: "その他",
} as const;
export const localKinds = {
  student: "現地の学生",
  studying_abroad: "現地に留学中",
  resident: "現地の住民",
} as const;
export type ParticipationRole = keyof typeof participationRoles;
export type StudyExperience = {
  regionId: string;
  level: keyof typeof studyLevels;
  format: keyof typeof studyFormats;
  startYear: number | null;
  endYear: number | null;
  months: number | null;
  topics: string[];
};
export type Participation = {
  roles: ParticipationRole[];
  stage: keyof typeof studyStages;
  destinations: string[];
  questions: string[];
  experiences: StudyExperience[];
  local: {
    kind: keyof typeof localKinds;
    regionId: string;
    languages: string;
    topics: string;
  };
};
export function emptyParticipation(
  roles: ParticipationRole[] = ["explorer"],
): Participation {
  return {
    roles,
    stage: "curious",
    destinations: [],
    questions: [],
    experiences: [],
    local: { kind: "resident", regionId: "", languages: "", topics: "" },
  };
}
export function participationOf(
  person: { participation?: Participation; acceptsMessages?: boolean },
  publicMember = false,
): Participation {
  // Existing members retain the regional discovery they opted into. Student status is never inferred.
  return (
    person.participation ||
    emptyParticipation(
      publicMember || person.acceptsMessages ? ["local"] : ["explorer"],
    )
  );
}
export function publicParticipation(value: Participation): Participation {
  const hidden = emptyParticipation(value.roles);
  return {
    ...hidden,
    ...(value.roles.includes("explorer")
      ? {
          stage: value.stage,
          destinations: value.destinations,
          questions: value.questions,
        }
      : {}),
    experiences: value.roles.includes("alumni") ? value.experiences : [],
    local: value.roles.includes("local") ? value.local : hidden.local,
  };
}
export function participationError(p: Participation): string {
  if (
    !p.roles.length ||
    p.roles.length > 3 ||
    new Set(p.roles).size !== p.roles.length ||
    p.roles.some((r) => !Object.hasOwn(participationRoles, r))
  )
    return "参加する立場を1つ以上選んでください";
  if (!Object.hasOwn(studyStages, p.stage))
    return "留学の検討状況を確認してください";
  if (
    p.destinations.length > 5 ||
    new Set(p.destinations).size !== p.destinations.length ||
    p.destinations.some((id) => !getRegion(id))
  )
    return "希望する国・地域を候補から5件まで選んでください";
  if (
    p.questions.length > 6 ||
    new Set(p.questions).size !== p.questions.length ||
    p.questions.some(
      (t) => !studyTopics.includes(t as (typeof studyTopics)[number]),
    )
  )
    return "知りたいテーマを候補から選んでください";
  if (
    p.experiences.length > 5 ||
    (p.roles.includes("alumni") && !p.experiences.length)
  )
    return "留学経験を1〜5件登録してください";
  for (const e of p.experiences) {
    if ((p.roles.includes("alumni") || e.regionId) && !getRegion(e.regionId))
      return "留学経験の国・地域を選んでください";
    if (
      !Object.hasOwn(studyLevels, e.level) ||
      !Object.hasOwn(studyFormats, e.format)
    )
      return "留学の種類・形式を確認してください";
    if (
      p.roles.includes("alumni") &&
      [e.startYear, e.endYear].some(
        (y) =>
          y !== null &&
          (!Number.isInteger(y) || y < 1900 || y > new Date().getUTCFullYear()),
      )
    )
      return "留学経験の年は1900年から今年までで入力してください";
    if (
      p.roles.includes("alumni") &&
      e.startYear !== null &&
      e.endYear !== null &&
      e.endYear < e.startYear
    )
      return "帰国年は開始年以降にしてください";
    if (
      p.roles.includes("alumni") &&
      e.months !== null &&
      (!Number.isInteger(e.months) || e.months < 1 || e.months > 120)
    )
      return "留学期間は1〜120ヶ月で入力してください";
    if (
      e.topics.length > 6 ||
      new Set(e.topics).size !== e.topics.length ||
      e.topics.some(
        (t) => !studyTopics.includes(t as (typeof studyTopics)[number]),
      )
    )
      return "相談できるテーマを候補から選んでください";
  }
  if (
    !Object.hasOwn(localKinds, p.local.kind) ||
    (p.local.regionId && !getRegion(p.local.regionId))
  )
    return "現地で交流する立場と地域を確認してください";
  if (p.local.languages.length > 120 || p.local.topics.length > 240)
    return "話せる言語は120文字、交流したいことは240文字以内で入力してください";
  return "";
}
export function experienceLabel(e: StudyExperience): string {
  return [
    regionLabel(e.regionId),
    studyLevels[e.level],
    e.months ? `${e.months}ヶ月` : "",
    e.endYear ? `${e.endYear}年帰国` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
export function matchesParticipation(
  person: {
    participation?: Participation;
    connections: { regionId: string; status: string }[];
  },
  axis: string,
  topic = "",
  regionId = "",
  localKind = "",
): boolean {
  const p = participationOf(person, true);
  if (axis === "alumni")
    return (
      p.roles.includes("alumni") &&
      p.experiences.some(
        (e) =>
          (!topic || e.topics.includes(topic)) &&
          (!regionId || withinRegion(e.regionId, regionId)),
      )
    );
  if (axis === "local") {
    if (!p.roles.includes("local") || (localKind && p.local.kind !== localKind))
      return false;
    const location =
      p.local.regionId ||
      person.connections.find((c) => c.status === "current")?.regionId;
    return !regionId || (!!location && withinRegion(location, regionId));
  }
  return true;
}
export function participationSearch(person: {
  participation?: Participation;
}): string {
  if (!person.participation) return "";
  const p = publicParticipation(person.participation);
  return [
    ...p.roles.map((r) => participationRoles[r]),
    ...p.experiences.map(
      (e) =>
        `${experienceLabel(e)} ${studyFormats[e.format]} ${e.topics.join(" ")}`,
    ),
    p.roles.includes("local")
      ? `${localKinds[p.local.kind]} ${regionLabel(p.local.regionId)} ${p.local.languages} ${p.local.topics}`
      : "",
    ...p.questions,
    ...p.destinations.map(regionLabel),
  ].join(" ");
}
