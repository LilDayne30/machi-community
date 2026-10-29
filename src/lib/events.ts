import type { Talk } from "./data";

export type EventPlan = {
  id: string;
  axis: "alumni" | "local";
  format: "online" | "onsite";
  type: string;
  title: string;
  region: string;
  regionId: string;
  language: string;
  duration: string;
  size: string;
  audience: string;
  description: string;
  topics: string[];
  agenda: { time: string; title: string; body: string }[];
  host: string;
  schedule: string;
  template: boolean;
};

export const eventPlans: EventPlan[] = [
  {
    id: "t1",
    axis: "alumni",
    format: "online",
    type: "留学相談会",
    title: "高校留学の学校生活と、最初の友達づくり",
    region: "国が未定でも参加できます",
    regionId: "",
    language: "日本語を予定",
    duration: "45分を予定",
    size: "4〜6人を予定",
    audience: "高校留学に興味がある人・留学先を検討している人",
    description:
      "帰国生の体験を聞きながら、授業や友達づくりについて少人数で質問する相談会です。希望する国が決まっていない段階の参加も想定しています。",
    topics: ["学校生活", "友達づくり", "国・留学先選び"],
    agenda: [
      {
        time: "5分",
        title: "自己紹介と、聞きたいこと",
        body: "検討していることや、気になっていることを共有します。",
      },
      {
        time: "15分",
        title: "帰国生の学校生活を聞く",
        body: "授業・休み時間・放課後の経験を聞きます。",
      },
      {
        time: "25分",
        title: "それぞれの質問を話す",
        body: "一人ずつ質問できる時間と、振り返りを設けます。",
      },
    ],
    host: "Roamigo運営・協力する帰国生を調整中",
    schedule: "日程調整中",
    template: true,
  },
  {
    id: "t2",
    axis: "local",
    format: "online",
    type: "現地交流会",
    title: "台北の学生と話す、学校生活と放課後",
    region: "台湾・台北",
    regionId: "country:TW",
    language: "開催言語を調整中",
    duration: "45分を予定",
    size: "4〜6人を予定",
    audience: "台湾への留学を考えている人・現地で交流したい学生",
    description:
      "台北の学生と、普段の学校生活や好きなことについて話す交流会です。参加する人がお互いに話したいテーマを持ち寄る形式を予定しています。",
    topics: ["学校生活", "友達づくり", "放課後・趣味"],
    agenda: [
      {
        time: "5分",
        title: "名前と、好きなこと",
        body: "話すきっかけになることを一つずつ紹介します。",
      },
      {
        time: "25分",
        title: "普段の学生生活を話す",
        body: "授業や放課後の過ごし方を、お互いに聞いてみます。",
      },
      {
        time: "15分",
        title: "気になることを聞く",
        body: "質問や感想を話し、交流を振り返ります。",
      },
    ],
    host: "Roamigo運営・現地の協力者を調整中",
    schedule: "日程調整中",
    template: true,
  },
  {
    id: "t3",
    axis: "alumni",
    format: "online",
    type: "準備ワークショップ",
    title: "カナダ留学前の準備と、ホストファミリーとの暮らし",
    region: "カナダ",
    regionId: "country:CA",
    language: "日本語を予定",
    duration: "45分を予定",
    size: "4〜6人を予定",
    audience: "カナダへの留学を検討・準備している人",
    description:
      "持ち物や日々の生活について、帰国生の経験を聞く会です。留学前に確認しておきたいことを整理しながら話す形式を予定しています。",
    topics: ["準備・持ち物", "ホストファミリー", "学校生活"],
    agenda: [
      {
        time: "5分",
        title: "準備の状況を共有",
        body: "今知りたいことを一つずつ話します。",
      },
      {
        time: "20分",
        title: "持ち物と暮らしの体験を聞く",
        body: "帰国生が経験した生活の場面について話します。",
      },
      {
        time: "20分",
        title: "質問と準備メモ",
        body: "自分が次に確認したいことを整理します。",
      },
    ],
    host: "Roamigo運営・協力する帰国生を調整中",
    schedule: "日程調整中",
    template: true,
  },
  {
    id: "t4",
    axis: "local",
    format: "onsite",
    type: "街歩き交流",
    title: "学生と歩く、バンクーバーの休日",
    region: "カナダ・バンクーバー",
    regionId: "country:CA",
    language: "開催言語を調整中",
    duration: "所要時間を調整中",
    size: "定員を調整中",
    audience: "バンクーバーで学生と交流したい人",
    description:
      "現地の学生と街を歩き、普段よく行く場所や好きなことについて話す交流の企画です。ルートや集合場所は開催に向けて調整します。",
    topics: ["街歩き", "写真", "放課後・趣味"],
    agenda: [
      {
        time: "01",
        title: "集合と自己紹介",
        body: "集合場所と当日の連絡方法は募集開始時に案内します。",
      },
      {
        time: "02",
        title: "一緒に街を歩く",
        body: "街のことや日々の過ごし方について話します。",
      },
      {
        time: "03",
        title: "振り返り",
        body: "見つけたことや印象に残ったことを共有します。",
      },
    ],
    host: "主催者・現地の協力者を調整中",
    schedule: "日程調整中",
    template: true,
  },
];

export function eventFromTalk(t: Talk): EventPlan {
  return {
    id: t.id,
    axis: t.category === "留学" ? "alumni" : "local",
    format: "online",
    type: "オンライン交流会",
    title: t.title,
    region: "開催地域の確認中",
    regionId: "",
    language: "開催言語の確認中",
    duration: `${t.duration}分`,
    size: `定員${t.capacity}人`,
    audience: "対象者の案内を準備中",
    description: t.description,
    topics: [t.category],
    agenda: [],
    host: t.host,
    schedule: `${t.date.replaceAll("-", "/")} ${t.time}（日本時間）`,
    template: false,
  };
}

export function matchesEvent(
  event: EventPlan,
  axis: string,
  format: string,
  query: string,
) {
  const text = query.normalize("NFKC").trim().toLocaleLowerCase();
  return (
    (!axis || event.axis === axis) &&
    (!format || event.format === format) &&
    (!text ||
      [event.title, event.type, event.region, event.audience, ...event.topics]
        .join(" ")
        .normalize("NFKC")
        .toLocaleLowerCase()
        .includes(text))
  );
}
