export type Region = {
  id: string;
  name: string;
  english: string;
  parentId: string | null;
  kind: "country" | "city";
};
export type ResidenceStatus = "current" | "former" | "stay";
export type RegionConnection = {
  regionId: string;
  status: ResidenceStatus;
  purpose: "" | "work" | "study";
  since: number | null;
  until: number | null;
};
const codes =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  );
const ja = new Intl.DisplayNames(["ja"], { type: "region" }),
  en = new Intl.DisplayNames(["en"], { type: "region" });
export const countries: Region[] = codes.map((code) => ({
  id: "country:" + code,
  name: ja.of(code) || code,
  english: en.of(code) || code,
  parentId: null,
  kind: "country",
}));
const cities = [
  ["JP", "tokyo", "東京", "Tokyo"],
  ["JP", "kyoto", "京都", "Kyoto"],
  ["JP", "osaka", "大阪", "Osaka"],
  ["JP", "fukuoka", "福岡", "Fukuoka"],
  ["JP", "sapporo", "札幌", "Sapporo"],
  ["JP", "yokohama", "横浜", "Yokohama"],
  ["JP", "nagoya", "名古屋", "Nagoya"],
  ["JP", "naha", "那覇", "Naha"],
  ["TW", "taipei", "台北", "Taipei"],
  ["TW", "tainan", "台南", "Tainan"],
  ["TW", "taichung", "台中", "Taichung"],
  ["TW", "kaohsiung", "高雄", "Kaohsiung"],
  ["KR", "seoul", "ソウル", "Seoul"],
  ["KR", "busan", "釜山", "Busan"],
  ["CA", "vancouver", "バンクーバー", "Vancouver"],
  ["CA", "toronto", "トロント", "Toronto"],
  ["CA", "montreal", "モントリオール", "Montreal"],
  ["US", "new-york", "ニューヨーク", "New York"],
  ["US", "san-francisco", "サンフランシスコ", "San Francisco"],
  ["US", "los-angeles", "ロサンゼルス", "Los Angeles"],
  ["GB", "london", "ロンドン", "London"],
  ["FR", "paris", "パリ", "Paris"],
  ["DE", "berlin", "ベルリン", "Berlin"],
  ["AU", "sydney", "シドニー", "Sydney"],
  ["AU", "melbourne", "メルボルン", "Melbourne"],
  ["NZ", "auckland", "オークランド", "Auckland"],
  ["TH", "bangkok", "バンコク", "Bangkok"],
  ["TH", "chiang-mai", "チェンマイ", "Chiang Mai"],
  ["VN", "hanoi", "ハノイ", "Hanoi"],
  ["VN", "ho-chi-minh", "ホーチミン", "Ho Chi Minh City"],
  ["SG", "singapore", "シンガポール", "Singapore"],
  ["MY", "kuala-lumpur", "クアラルンプール", "Kuala Lumpur"],
  ["ID", "jakarta", "ジャカルタ", "Jakarta"],
  ["ES", "barcelona", "バルセロナ", "Barcelona"],
  ["IT", "rome", "ローマ", "Rome"],
  ["PT", "lisbon", "リスボン", "Lisbon"],
];
export const regions: Region[] = [
  ...countries,
  ...cities.map(([code, slug, name, english]) => ({
    id: `city:${code}:${slug}`,
    name,
    english,
    parentId: "country:" + code,
    kind: "city" as const,
  })),
];
const byId = new Map(regions.map((r) => [r.id, r]));
export const getRegion = (id: string) => byId.get(id);
export function regionLabel(id: string) {
  const r = getRegion(id);
  return r
    ? r.parentId
      ? `${getRegion(r.parentId)?.name}・${r.name}`
      : r.name
    : "";
}
export function withinRegion(id: string, selected: string) {
  return id === selected || getRegion(id)?.parentId === selected;
}
export const residenceLabels = {
  current: "住んでいる",
  former: "以前住んでいた",
  stay: "一時滞在中",
};
export const purposeLabels = { "": "指定なし", work: "仕事", study: "留学" };
export function connectionLabel(c: RegionConnection) {
  return `${regionLabel(c.regionId)}に${residenceLabels[c.status]}`;
}
export function connectionSearch(c: RegionConnection) {
  const r = getRegion(c.regionId);
  return `${regionLabel(c.regionId)} ${r?.english || ""} ${r?.parentId ? getRegion(r.parentId)?.english : ""} ${residenceLabels[c.status]}`;
}
export function connectionError(connections: RegionConnection[]): string {
  if (connections.length > 8) return "地域との関わりは8件まで登録できます";
  if (connections.filter((c) => c.status === "current").length > 1)
    return "現在の居住地は1件まで登録できます";
  const seen = new Set<string>();
  for (const c of connections) {
    if (!getRegion(c.regionId)) return "国・地域を候補から選んでください";
    if (
      !Object.hasOwn(residenceLabels, c.status) ||
      !Object.hasOwn(purposeLabels, c.purpose)
    )
      return "地域との関わりを確認してください";
    const key = c.regionId + ":" + c.status;
    if (seen.has(key)) return "同じ地域と関わりが重複しています";
    seen.add(key);
    if (
      [c.since, c.until].some(
        (y) => y !== null && (!Number.isInteger(y) || y < 1900 || y > 2100),
      )
    )
      return "年は1900〜2100の範囲で入力してください";
    if (c.since !== null && c.until !== null && c.until < c.since)
      return "終了年は開始年以降にしてください";
    if (c.status === "current" && c.until !== null)
      return "現在の居住地に終了年は設定できません";
  }
  return "";
}
