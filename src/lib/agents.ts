// 留学エージェントの掲載情報。画面（src）とAPI（worker）の両方で使う。
// 利用者向けの画面では「事業者」ではなく「エージェント」と表示する。

export const PROGRAMS = [
  "語学留学",
  "大学・大学院（正規留学）",
  "大学付属の語学・準備コース",
  "高校留学",
  "中学・小学生の留学",
  "ワーキングホリデー",
  "インターンシップ",
  "ボランティア",
  "親子留学",
  "社会人・キャリア留学",
  "シニア留学",
  "短期・夏休み留学",
  "オンライン留学",
] as const;
export const AUDIENCES = [
  "小中学生",
  "高校生",
  "大学生",
  "社会人",
  "親子",
  "シニア",
] as const;
export const SERVICES = [
  "国・学校選び",
  "出願手続き",
  "英語試験・出願書類の対策",
  "奨学金の案内",
  "ビザ申請のサポート",
  "滞在先の手配",
  "航空券の手配",
  "海外保険の案内",
  "出発前オリエンテーション",
  "空港出迎え",
  "現地オフィスでのサポート",
  "緊急時の対応",
  "帰国後の就職・キャリア相談",
] as const;
export const METHODS = ["オンライン", "対面", "電話", "LINE"] as const;
export const FEE_TYPES = {
  free: "手数料無料",
  partial: "一部のサービスは有料",
  paid: "サポート手数料あり",
} as const;
export const LINK_KINDS = {
  instagram: "Instagram",
  x: "X（旧Twitter）",
  youtube: "YouTube",
  tiktok: "TikTok",
  facebook: "Facebook",
  line: "LINE公式アカウント",
  note: "note・ブログ",
  other: "その他",
} as const;
export const SEMINAR_FORMATS = {
  online: "オンライン",
  offline: "会場",
  hybrid: "会場＋オンライン",
} as const;
export const MATERIAL_KINDS = {
  pdf: "PDF資料",
  slide: "説明会スライド",
  video: "動画",
  page: "ウェブページ",
} as const;

export type AgentLink = {
  kind: keyof typeof LINK_KINDS;
  url: string;
  label: string;
};
export type AgentSeminar = {
  title: string;
  date: string;
  time: string;
  format: keyof typeof SEMINAR_FORMATS;
  place: string;
  url: string;
  note: string;
};
export type AgentMaterial = {
  title: string;
  kind: keyof typeof MATERIAL_KINDS;
  url: string;
  note: string;
};
export type AgentOffice = { name: string; address: string };
export type AgentFaq = { q: string; a: string };
export type AgentDetails = {
  tagline: string;
  staffTitle: string;
  staffMessage: string;
  countries: string[];
  programs: string[];
  audiences: string[];
  services: string[];
  feeType: "" | keyof typeof FEE_TYPES;
  feeNote: string;
  methods: string[];
  hours: string;
  responseTime: string;
  languages: string;
  offices: AgentOffice[];
  localSupport: string;
  founded: string;
  track: string;
  memberships: string;
  license: string;
  website: string;
  links: AgentLink[];
  seminars: AgentSeminar[];
  materials: AgentMaterial[];
  faq: AgentFaq[];
};
export const emptyAgentDetails: AgentDetails = {
  tagline: "",
  staffTitle: "",
  staffMessage: "",
  countries: [],
  programs: [],
  audiences: [],
  services: [],
  feeType: "",
  feeNote: "",
  methods: [],
  hours: "",
  responseTime: "",
  languages: "",
  offices: [],
  localSupport: "",
  founded: "",
  track: "",
  memberships: "",
  license: "",
  website: "",
  links: [],
  seminars: [],
  materials: [],
  faq: [],
};
/** 公開ページに出すエージェント情報（相談一覧のカードと詳細ページで共通）。 */
export type PublicAgent = {
  id: string;
  name: string;
  organization: string;
  theme: string;
  bio: string;
  verified?: boolean;
  avatarUrl?: string;
  initial?: string;
  color?: string;
  details: AgentDetails;
};
export const withAgentDefaults = (d: Partial<AgentDetails> | undefined) => ({
  ...emptyAgentDetails,
  ...(d || {}),
});
/** 今日以降の説明会を日付順に返す。 */
export const upcomingSeminars = (d: AgentDetails, today = todayJST()) =>
  d.seminars
    .filter((s) => s.date >= today)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
export const todayJST = () =>
  new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
/** 外部リンクとして開いてよいURLか（javascript: などを画面に出さない）。 */
export const safeUrl = (u: string) => /^https?:\/\/[^\s]+$/i.test(u.trim());
/** 掲載情報の充実度（0〜100）。エージェントのホームで入力を促すのに使う。 */
export function completeness(a: {
  organization: string;
  name: string;
  bio: string;
  details: AgentDetails;
}) {
  const d = a.details;
  const checks = [
    !!a.organization,
    !!a.name,
    a.bio.length >= 30,
    !!d.tagline,
    d.countries.length > 0,
    d.programs.length > 0,
    d.services.length > 0,
    !!d.feeType,
    d.methods.length > 0,
    !!d.website,
    d.links.length > 0,
    d.seminars.length > 0,
    d.materials.length > 0,
    d.offices.length > 0,
    d.faq.length > 0,
    !!d.staffMessage,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
export const CONSULT_STATUS_AGENT: Record<string, string> = {
  submitted: "新着",
  accepted: "対応中",
  completed: "対応完了",
  cancelled: "お断り・終了",
};
export const CONSULT_STATUS_USER: Record<string, string> = {
  submitted: "送信済み",
  accepted: "対応中",
  completed: "相談完了",
  cancelled: "終了",
};
