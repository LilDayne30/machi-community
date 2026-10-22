export type Person = {
  name: string;
  role: "住んでいる" | "最近訪れた" | "事業者" | "進行役";
  color: string;
  initial: string;
  avatarUrl?: string;
};
export type Talk = {
  id: string;
  title: string;
  category: string;
  date: string;
  time: string;
  duration: number;
  capacity: number;
  occupied: number;
  price: number;
  image: string;
  host: string;
  description: string;
  participants: Person[];
};
export type Note = {
  id: string;
  title: string;
  body: string;
  image: string;
  author: string;
  role: Person["role"];
  verifiedAt: string;
  category: string;
  relation: string;
  avatarUrl?: string;
};
export type Message = {
  id: string;
  author: string;
  body: string;
  time: string;
  own: boolean;
  replyTo?: string;
  avatarUrl?: string;
};
export type CommunityMember = {
  id: string;
  name: string;
  bio: string;
  relation: string;
  interests: string[];
  availability: string;
  visitDate: string;
  color?: string;
  nationality: string;
  city: string;
  interestedRegions: string[];
  avatarUrl?: string;
};
export type Room = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  members: number;
  unread: number;
  messages: Message[];
  kind?: "direct" | "group";
  peer?: CommunityMember;
  blocked?: boolean;
  blockedByMe?: boolean;
};
export type Booking = {
  id: string;
  talkId: string;
  status:
    | "confirmed"
    | "pending"
    | "cancelled"
    | "attended"
    | "refund_pending"
    | "refunded";
  amount: number;
};
export type Consultation = {
  id: string;
  title: string;
  provider: string;
  budget: string;
  date: string;
  body: string;
  shareMessageIds: string[];
  status: "submitted" | "accepted" | "completed" | "cancelled";
};
export type Profile = {
  name: string;
  bio: string;
  relation: string;
  interests: string[];
  visitDate: string;
  visitStatus?: number;
  availability: string;
  acceptsMessages?: boolean;
  nationality: string;
  city: string;
  interestedRegions: string[];
  avatarUrl?: string;
};
export type Bootstrap = {
  mode: "preview" | "production";
  user: null | { id: string; name: string; role: string };
  profile: Profile;
  talks: Talk[];
  notes: Note[];
  rooms: Room[];
  people: CommunityMember[];
  bookings: Booking[];
  consultations: Consultation[];
  providers?: {
    id: string;
    name: string;
    theme: string;
    bio: string;
    price: string;
    initial?: string;
    color?: string;
  }[];
  configured: { google: boolean; stripe: boolean };
};
export const photos = {
  kyoto:
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1600&q=85",
  coffee:
    "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1000&q=85",
  books:
    "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=900&q=85",
  street:
    "https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=1000&q=85",
  cafe: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=900&q=85",
};
export const people: Person[] = [
  { name: "美咲", role: "住んでいる", color: "#e3d8c7", initial: "美" },
  { name: "悠太", role: "最近訪れた", color: "#dce4d9", initial: "悠" },
  { name: "あかり", role: "進行役", color: "#ebdfd5", initial: "あ" },
  { name: "直樹", role: "最近訪れた", color: "#d7e3e8", initial: "直" },
];
export const communityPeople: CommunityMember[] = [
  {
    id: "misaki",
    nationality: "日本",
    city: "京都",
    interestedRegions: ["台湾", "韓国"],
    name: "美咲",
    bio: "京都に住んでいます。朝の喫茶店と、鴨川沿いの散歩が好きです。お店の話から気軽にどうぞ。",
    relation: "住んでいる",
    interests: ["喫茶店", "街歩き"],
    availability: "土日の夜",
    visitDate: "",
    color: "#e3d8c7",
  },
  {
    id: "yuta",
    nationality: "カナダ",
    city: "東京",
    interestedRegions: ["日本", "台湾"],
    name: "悠太",
    bio: "年に何度か京都へ。本とコーヒーのある場所を、ゆっくり探しています。次の旅の話もできたら。",
    relation: "再訪予定",
    interests: ["古本屋", "喫茶店"],
    availability: "平日の夜",
    visitDate: "2026-11-20",
    color: "#dce4d9",
  },
  {
    id: "akari",
    nationality: "韓国",
    city: "京都",
    interestedRegions: ["日本", "北欧"],
    name: "あかり",
    bio: "京都で暮らしながら写真を撮っています。東山の小道や、静かな朝の時間について話せます。",
    relation: "住んでいる",
    interests: ["写真", "街歩き"],
    availability: "不定期・都度相談",
    visitDate: "",
    color: "#ebdfd5",
  },
];
export const talks: Talk[] = [
  {
    id: "t1",
    title: "いつもの喫茶店と、京都の朝",
    category: "喫茶店",
    date: "2026-10-24",
    time: "20:00",
    duration: 45,
    capacity: 6,
    occupied: 4,
    price: 1000,
    image: photos.coffee,
    host: "あかり",
    description:
      "京都の朝に立ち寄る喫茶店や、コーヒーのあとの散歩道について話します。訪れたことのあるお店や、次に気になっている場所をひとつ持ち寄ってください。初めての方も進行役が会話をサポートします。",
    participants: people,
  },
  {
    id: "t2",
    title: "古本屋をめぐる、秋の街歩き",
    category: "街歩き",
    date: "2026-10-31",
    time: "20:00",
    duration: 45,
    capacity: 6,
    occupied: 3,
    price: 1000,
    image: photos.books,
    host: "あかり",
    description:
      "古本屋で見つけた一冊と、その周辺の街の話。京都に住む人と再訪する人で、お気に入りの歩き方を交換します。",
    participants: people.slice(0, 3),
  },
  {
    id: "t3",
    title: "鴨川のそばで過ごす休日",
    category: "街歩き",
    date: "2026-11-07",
    time: "20:00",
    duration: 45,
    capacity: 6,
    occupied: 2,
    price: 1000,
    image: photos.street,
    host: "あかり",
    description:
      "鴨川周辺の散歩や喫茶店の話をする少人数のオンライン会です。再訪予定や旅の報告も歓迎します。",
    participants: people.slice(0, 2),
  },
];
export const notes: Note[] = [
  {
    id: "n1",
    title: "朝の一杯は、出町柳で",
    body: "商店街を歩いたあと、小さな喫茶店でひと休み。朝の時間は落ち着いて過ごせました。営業日や営業時間は訪問前にお店へ確認してください。",
    image: photos.cafe,
    author: "美咲",
    role: "住んでいる",
    verifiedAt: "2026-10-19",
    category: "喫茶店",
    relation: "お店との利害関係なし",
  },
  {
    id: "n2",
    title: "雨の日に寄りたい古本屋",
    body: "棚をゆっくり眺めていると、気づけば一時間。街の歴史の本に出会いました。お店の情報は訪問前に確認を。",
    image: photos.books,
    author: "悠太",
    role: "最近訪れた",
    verifiedAt: "2026-10-17",
    category: "古本屋",
    relation: "お店との利害関係なし",
  },
  {
    id: "n3",
    title: "朝の東山、静かな散歩道",
    body: "朝の東山を歩きました。住宅街では声の大きさに気をつけながら、混雑を避けてゆっくり。歩きやすい靴がおすすめです。",
    image: photos.street,
    author: "美咲",
    role: "住んでいる",
    verifiedAt: "2026-10-20",
    category: "街歩き",
    relation: "お店との利害関係なし",
  },
];
export const rooms: Room[] = [
  {
    id: "dm-misaki",
    kind: "direct",
    peer: communityPeople[0],
    title: "美咲",
    subtitle: "喫茶店・街歩き",
    image: "",
    members: 2,
    unread: 1,
    messages: [
      {
        id: "dm-m1",
        author: "美咲",
        body: "次に京都に来るのはいつごろですか？この前話した喫茶店、朝の時間が気持ちよかったです ☕",
        time: "10:24",
        own: false,
      },
    ],
  },
  {
    id: "dm-yuta",
    kind: "direct",
    peer: communityPeople[1],
    title: "悠太",
    subtitle: "古本屋・喫茶店",
    image: "",
    members: 2,
    unread: 0,
    messages: [
      {
        id: "dm-y1",
        author: "悠太",
        body: "教えてもらった古本屋へ行ってきました。今度また、見つけた本の話をしたいです。",
        time: "昨日",
        own: false,
      },
    ],
  },
  {
    id: "r1",
    title: "京都の喫茶と、街歩き",
    subtitle: "10月の地域トークの小部屋",
    image: photos.cafe,
    members: 5,
    unread: 2,
    messages: [
      {
        id: "m1",
        author: "美咲",
        body: "この前話した出町柳の喫茶店、今朝も寄ってきました。窓際の席が気持ちよかったです ☕",
        time: "10:24",
        own: false,
      },
      {
        id: "m2",
        author: "悠太",
        body: "教えてもらったお店、先週の旅で行ってきました！次は朝に行ってみたいです。",
        time: "11:08",
        own: false,
      },
      {
        id: "m3",
        author: "あかり",
        body: "また京都へ来る予定が決まったら、ぜひここで教えてくださいね。",
        time: "12:30",
        own: false,
      },
    ],
  },
  {
    id: "r2",
    title: "本とコーヒーのある休日",
    subtitle: "9月の地域トークの小部屋",
    image: photos.books,
    members: 4,
    unread: 0,
    messages: [
      {
        id: "m4",
        author: "悠太",
        body: "来月また京都に行く予定です。みなさんの最近見つけたお店も聞きたいです。",
        time: "昨日",
        own: false,
      },
    ],
  },
];
export const emptyProfile: Profile = {
  nationality: "",
  city: "",
  interestedRegions: [],
  avatarUrl: "",
  name: "",
  bio: "",
  relation: "最近訪れた",
  interests: ["喫茶店", "街歩き"],
  visitDate: "",
  visitStatus: 0,
  availability: "土日の夜",
  acceptsMessages: false,
};
export const providers = [
  {
    id: "p1",
    name: "高橋 まどか",
    initial: "ま",
    theme: "喫茶店・街歩き",
    bio: "京都在住12年。喫茶店と路地歩きの個別相談・案内。",
    price: "相談 ¥2,000〜 / 案内 ¥6,000〜",
    color: "#e5dbce",
  },
  {
    id: "p2",
    name: "小林 直人",
    initial: "直",
    theme: "古本屋・文化",
    bio: "京都在住8年。古本屋めぐりと文化散歩の個別案内。",
    price: "相談 ¥2,000〜 / 案内 ¥5,000〜",
    color: "#dce4d9",
  },
];
export const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date(date + "T12:00:00+09:00"));
export const yen = (n: number) =>
  n === 0 ? "無料" : `¥${n.toLocaleString("ja-JP")}`;
