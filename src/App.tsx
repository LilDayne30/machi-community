import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bookmark,
  CalendarDays,
  Camera,
  Globe2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Coffee,
  Compass,
  Flag,
  Home as HomeIcon,
  Leaf,
  LockKeyhole,
  LogOut,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  Video,
  X,
} from "lucide-react";
import { api, saveProfile, useApp } from "./lib/store";
import { matchesMember, normalizePlace, parseRegions } from "./lib/profile";
import { photoDataUrl, prepareProfilePhoto } from "./lib/photo";
import {
  dateLabel,
  emptyProfile,
  photos,
  providers,
  yen,
  type Booking,
  type Consultation,
  type CommunityMember,
  type Profile,
  type Talk,
} from "./lib/data";
import {
  Avatar,
  CheckChip,
  Empty,
  Heading,
  Modal,
  People,
  SectionTitle,
  Skeleton,
  TalkCard,
} from "./components/ui";
const nav = [
  { to: "/", label: "地域ホーム", icon: HomeIcon },
  { to: "/people", label: "話せる人", icon: Users },
  { to: "/rooms", label: "メッセージ", icon: MessageCircle },
  { to: "/consult", label: "プロへの相談", icon: Compass },
  { to: "/profile", label: "プロフィール", icon: Settings2 },
];
export default function App() {
  const { data, loading, error, notify } = useApp(),
    location = useLocation(),
    [transition, setTransition] = useState(false),
    [notifications, setNotifications] = useState(false),
    [help, setHelp] = useState(false);
  useEffect(() => {
    document.title = `${nav.find((n) => n.to !== "/" && location.pathname.startsWith(n.to))?.label || "地域ホーム"} | machi`;
    setTransition(true);
    window.scrollTo(0, 0);
    const t = setTimeout(() => setTransition(false), 180);
    return () => clearTimeout(t);
  }, [location.pathname]);
  return (
    <div className="app-shell">
      <a className="skip" href="#main">
        コンテンツへ
      </a>
      <aside className="sidebar glass">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            m<span />
          </span>
          <span>
            machi<span className="brand-dot">.</span>
          </span>
        </Link>
        <div className="sidebar-region">
          <span className="region-icon">
            <MapPin size={18} />
          </span>
          <div>
            <strong>京都</strong>
            <small>喫茶店と街歩き</small>
          </div>
          <LockKeyhole size={13} />
        </div>
        <nav aria-label="メインナビゲーション">
          {nav.map((n) => (
            <NavLink
              end={n.to === "/"}
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                isActive ? "nav-item active" : "nav-item"
              }
            >
              <n.icon size={19} />
              <span>{n.label}</span>
              {n.to === "/rooms" && data.rooms.some((r) => r.unread > 0) && (
                <span className="nav-dot" />
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="invite-tag">
            <span className="live-dot" /> 招待制コミュニティ
          </div>
          <button onClick={() => setHelp(true)} className="help-link">
            <CircleHelp size={17} />
            使い方・サポート
            <ArrowUpRight size={14} />
          </button>
          <Link to="/profile" className="sidebar-user">
            <Avatar
              name={data.profile.name || "ゲスト"}
              src={data.profile.avatarUrl}
              small
            />
            <span>
              {data.profile.name || "ゲスト"}
              <small>
                {data.user
                  ? "アカウント設定"
                  : data.mode === "preview"
                    ? "プレビュー中"
                    : "Googleでログイン"}
              </small>
            </span>
            <MoreHorizontal size={18} />
          </Link>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>コミュニティ</span>
            <ChevronRight size={13} />
            <span>京都</span>
          </div>
          <Link to="/" className="mobile-brand">
            machi<span>.</span>
          </Link>
          <div className="topbar-right">
            <span className="community-tag">
              <span className="live-dot" />
              京都コミュニティ
            </span>
            <button
              className="icon-button notification-button"
              aria-label="通知を開く"
              onClick={() => setNotifications(true)}
            >
              <Bell size={19} />
              {data.rooms.some((r) => r.unread > 0) && <i />}
            </button>
            <Link to="/profile" aria-label="プロフィールを開く">
              <Avatar
                name={data.profile.name || "ゲスト"}
                src={data.profile.avatarUrl}
                small
              />
            </Link>
          </div>
        </header>
        {data.mode === "preview" && !loading && (
          <div className="preview-label">
            <span>プレビュー</span>サンプルデータ · 変更はこの端末に保存
          </div>
        )}
        <main id="main">
          {error ? (
            <div className="empty glass">
              <h2>読み込めませんでした</h2>
              <p>{error}</p>
              <button
                className="button primary"
                onClick={() => window.location.reload()}
              >
                再読み込み
              </button>
            </div>
          ) : loading || transition ? (
            <Skeleton />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28 }}
              >
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/talks" element={<Talks />} />
                  <Route path="/talks/:id" element={<TalkDetail />} />
                  <Route path="/rooms" element={<Rooms />} />
                  <Route path="/rooms/:id" element={<RoomDetail />} />
                  <Route path="/people" element={<Members />} />
                  <Route path="/people/:id" element={<MemberDetail />} />
                  <Route path="/notes/:id" element={<NoteDetail />} />
                  <Route path="/consult" element={<Consult />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route
                    path="*"
                    element={
                      <div className="empty">
                        <h1>ページが見つかりません</h1>
                        <Link to="/">地域ホームに戻る</Link>
                      </div>
                    }
                  />
                </Routes>
              </motion.div>
            </AnimatePresence>
          )}
          <footer className="page-footer">
            <span>
              machi<span className="brand-dot">.</span>
            </span>
            <small>京都・喫茶店と街歩き</small>
            <span className="footer-status">
              <span className="live-dot" />
              招待制
            </span>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav glass" aria-label="モバイルナビゲーション">
        {nav.map((n) => (
          <NavLink
            key={n.to}
            end={n.to === "/"}
            to={n.to}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <n.icon size={20} />
            <span>
              {n.label === "プロフィール"
                ? "マイページ"
                : n.label === "プロへの相談"
                  ? "相談"
                  : n.label === "地域ホーム"
                    ? "ホーム"
                    : n.label}
            </span>
          </NavLink>
        ))}
      </nav>
      <AnimatePresence>
        {notify && (
          <motion.div
            key="toast"
            role="status"
            className="toast glass"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <Check size={18} />
            {notify}
          </motion.div>
        )}
      </AnimatePresence>
      {notifications && (
        <Modal title="通知" onClose={() => setNotifications(false)}>
          {data.rooms
            .filter((r) => r.unread)
            .map((r) => (
              <Link
                className="notification-item"
                key={r.id}
                to={"/rooms/" + r.id}
                onClick={() => setNotifications(false)}
              >
                <MessageCircle size={20} />
                <div>
                  <strong>{r.title}</strong>
                  <p>新しいメッセージが{r.unread}件あります</p>
                </div>
                <ArrowUpRight size={18} />
              </Link>
            ))}
          {!data.rooms.some((r) => r.unread) && (
            <p className="muted">新しい通知はありません</p>
          )}
        </Modal>
      )}
      {help && (
        <Modal title="使い方・サポート" onClose={() => setHelp(false)}>
          <div className="prose">
            <p>
              「話せる人」から相手を選んで、1対1でメッセージを送れます。同じ相手との会話は、次の旅でも続けられます。地域トークはホームから申し込めます。
            </p>
            <p>
              旅のステータスは左右にフリックするか、矢印ボタンで切り替えます。
            </p>
            <p>
              気になる投稿は「通報」から運営へお知らせください。プロへの依頼は自分で内容と共有範囲を選んで送信できます。
            </p>
            <p>
              初回トークは無料、2回目から1回1,000円。キャンセル条件は各トーク詳細で確認できます。
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
function Home() {
  const { data } = useApp(),
    [filter, setFilter] = useState("すべて"),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(false);
  const list = data.notes.filter(
    (n) =>
      (filter === "すべて" || n.category === filter) &&
      (!query || (n.title + n.body + n.author).includes(query)),
  );
  return (
    <>
      <Heading eyebrow="YOUR COMMUNITY" title="地域ホーム">
        <button
          className="button subtle small-button"
          onClick={() => setSearch(!search)}
        >
          <Search size={16} />
          <span>地域を検索</span>
        </button>
      </Heading>
      {search && (
        <div className="search-panel glass">
          <label htmlFor="local-search">京都の話題・メモを検索</label>
          <div className="search-input">
            <Search size={17} />
            <input
              id="local-search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="喫茶店、街歩き…"
            />
            <button
              aria-label="検索を閉じる"
              onClick={() => {
                setSearch(false);
                setQuery("");
              }}
            >
              <X size={17} />
            </button>
          </div>
          <small>初期コミュニティは京都のみです。</small>
        </div>
      )}
      <section className="region-hero">
        <img
          src={photos.kyoto}
          alt="京都・東山の街並み"
          className="hero-image"
        />
        <div className="hero-shade" />
        <div className="hero-meta">
          <span className="hero-chip">
            <MapPin size={13} /> 京都府 京都市
          </span>
          <span className="hero-chip transparent">
            <LockKeyhole size={12} />
            招待制
          </span>
        </div>
        <div className="hero-bottom">
          <div>
            <div className="hero-kicker">KYOTO</div>
            <h2>
              京都<span>喫茶店と街歩き</span>
            </h2>
            <div className="hero-members">
              <People people={data.talks[0]?.participants || []} />
              <span>再訪する人と、この街に暮らす人</span>
            </div>
          </div>
          <Link
            className="hero-action glass"
            to="/people"
            aria-label="京都で話せる人を見る"
          >
            <ArrowUpRight size={23} />
          </Link>
        </div>
        <span className="hero-credit">HIGASHIYAMA, KYOTO</span>
      </section>
      <section className="home-people">
        <SectionTitle title="話せる人" to="/people" />
        <div className="people-grid">
          {data.people.slice(0, 3).map((person) => (
            <MemberCard key={person.id} person={person} />
          ))}
        </div>
        {!data.people.length && (
          <Empty>
            {data.user
              ? "新しい会話を受け付けている人はまだいません。"
              : "ログインすると、話せる人を見られます。"}
            <Link to="/profile">プロフィールを開く</Link>
          </Empty>
        )}
      </section>
      <div className="home-grid">
        <div className="home-main">
          <section>
            <SectionTitle
              title="会話のつづき"
              to="/rooms"
              label="メッセージへ"
            />
            <div className="room-preview-list">
              {data.rooms
                .filter((r) => r.kind === "direct")
                .slice(0, 2)
                .map((r) => (
                  <Link
                    className="room-preview glass"
                    key={r.id}
                    to={"/rooms/" + r.id}
                  >
                    <div className="room-cover">
                      <Avatar
                        name={r.title}
                        color={r.peer?.color}
                        src={r.peer?.avatarUrl}
                      />
                      {r.unread > 0 && <span className="unread-dot" />}
                    </div>
                    <div className="room-preview-text">
                      <h3>{r.title}</h3>
                      <p>{r.messages.at(-1)?.body || "会話を始めましょう"}</p>
                      <small>
                        <LockKeyhole size={12} />
                        1対1<span>·</span>
                        {r.messages.at(-1)?.time || ""}
                      </small>
                    </div>
                    {r.unread > 0 ? (
                      <span className="unread-badge">{r.unread}</span>
                    ) : (
                      <ChevronRight size={17} />
                    )}
                  </Link>
                ))}
            </div>
            {data.mode === "production" && !data.user && (
              <Link className="text-link" to="/profile">
                ログインしてメッセージを見る
                <ArrowUpRight size={15} />
              </Link>
            )}
            {!data.rooms.some((r) => r.kind === "direct") && data.user && (
              <Empty>
                会話を始めると、ここに表示されます。
                <Link to="/people">話せる人を見る</Link>
              </Empty>
            )}
          </section>
          <section>
            <SectionTitle title="次の地域トーク" to="/talks" />
            {data.talks[0] ? (
              <TalkCard talk={data.talks[0]} compact />
            ) : (
              <Empty>募集中のトークはありません</Empty>
            )}
          </section>
        </div>
        <aside className="home-side">
          <TripCard />
          <div className="community-info glass">
            <div className="inline">
              <span className="soft-icon">
                <Leaf size={19} />
              </span>
              <h3>このコミュニティについて</h3>
            </div>
            <p>
              喫茶店と街歩きをテーマに、京都の住民と再訪者が交流する小さなコミュニティです。
            </p>
            <div>
              <span>
                <Users size={14} />
                少人数・進行役あり
              </span>
              <span>
                <Video size={14} />
                旅行前からオンラインで
              </span>
            </div>
          </div>
        </aside>
      </div>
      <section className="notes-section">
        <SectionTitle
          title="現地のメモ"
          count={String(data.notes.length).padStart(2, "0")}
        />
        <div className="filter-row" role="group" aria-label="現地メモのテーマ">
          {["すべて", "喫茶店", "古本屋", "街歩き"].map((f) => (
            <CheckChip
              key={f}
              selected={filter === f}
              onClick={() => setFilter(f)}
            >
              {f === "喫茶店" && <Coffee size={14} />}
              {f}
            </CheckChip>
          ))}
          <span className="filter-hint">確認日つきの地域情報</span>
        </div>
        {list.length ? (
          <div className="notes-grid">
            {list.map((n) => (
              <Link
                to={"/notes/" + n.id}
                className="note-card glass"
                key={n.id}
              >
                <div className="note-photo">
                  <img src={n.image} alt="" loading="lazy" />
                  <span>{n.category}</span>
                </div>
                <div className="note-content">
                  <h3>{n.title}</h3>
                  <div className="note-author">
                    <Avatar name={n.author} src={n.avatarUrl} small />
                    <span>
                      {n.author}
                      <small>{n.role}</small>
                    </span>
                    <ArrowUpRight size={17} />
                  </div>
                  <div className="verified">
                    <ShieldCheck size={12} />
                    {n.verifiedAt.replaceAll("-", ".")} 確認
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Empty>一致するメモはありません</Empty>
        )}
      </section>
    </>
  );
}
const stages = ["訪問を計画中", "訪問予定あり", "滞在中", "旅のあと"];
function TripCard() {
  const { data, setData, toast, guard } = useApp(),
    [stage, setStage] = useState(() =>
      data.mode === "preview"
        ? Number(localStorage.getItem("machi-trip-stage") || 0)
        : data.profile.visitStatus || 0,
    ),
    [editing, setEditing] = useState(false),
    [date, setDate] = useState(data.profile.visitDate),
    start = useRef(0);
  async function move(delta: number) {
    if (!guard()) return;
    const s = (stage + delta + 4) % 4;
    setStage(s);
    try {
      const p = { ...data.profile, visitStatus: s };
      await saveProfile(p, data.mode);
      setData((d) => ({ ...d, profile: p }));
      if (data.mode === "preview")
        localStorage.setItem("machi-trip-stage", String(s));
      toast("旅のステータス：" + stages[s]);
    } catch (e) {
      setStage(stage);
      toast((e as Error).message);
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!guard()) return;
    try {
      const p = { ...data.profile, visitDate: date };
      await saveProfile(p, data.mode);
      setData((d) => ({ ...d, profile: p }));
      setEditing(false);
      toast("訪問予定を保存しました");
    } catch (e) {
      toast((e as Error).message);
    }
  }
  return (
    <div
      className="trip-card glass"
      onTouchStart={(e) => (start.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - start.current;
        if (Math.abs(dx) > 45) move(dx < 0 ? 1 : -1);
      }}
    >
      <div className="trip-card-top">
        <span>MY NEXT VISIT</span>
        <MapPin size={17} />
      </div>
      <div className="trip-city">
        京都<small>次の訪問</small>
      </div>
      <div className="trip-date">
        {data.profile.visitDate
          ? dateLabel(data.profile.visitDate)
          : "日程を考え中"}
      </div>
      <div className="trip-status">
        <button aria-label="前の訪問ステータス" onClick={() => move(-1)}>
          <ChevronLeft size={17} />
        </button>
        <AnimatePresence mode="wait">
          <motion.span
            key={stage}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
          >
            <span className="live-dot" />
            {stages[stage]}
          </motion.span>
        </AnimatePresence>
        <button aria-label="次の訪問ステータス" onClick={() => move(1)}>
          <ChevronRight size={17} />
        </button>
      </div>
      <div className="stage-dots">
        {stages.map((s, i) => (
          <button
            key={s}
            aria-label={s}
            aria-pressed={stage === i}
            className={stage === i ? "active" : ""}
            onClick={() => void move(i - stage)}
          />
        ))}
      </div>
      <button className="button full subtle" onClick={() => setEditing(true)}>
        <Plus size={15} />
        訪問予定を編集
      </button>
      {editing && (
        <Modal title="次の訪問予定" onClose={() => setEditing(false)}>
          <form onSubmit={submit}>
            <label className="field">
              訪問予定日
              <input
                type="date"
                required
                min="2026-10-21"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <button className="button primary full" type="submit">
              保存する
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
function Talks() {
  const { data } = useApp();
  const [filter, setFilter] = useState("すべて");
  return (
    <>
      <Heading eyebrow="COMMUNITY TALKS" title="地域トーク">
        <span className="pill">
          <Video size={14} />
          オンライン・45分
        </span>
      </Heading>
      <div className="filter-row">
        {["すべて", "喫茶店", "街歩き"].map((f) => (
          <CheckChip
            key={f}
            selected={filter === f}
            onClick={() => setFilter(f)}
          >
            {f}
          </CheckChip>
        ))}
      </div>
      <div className="talks-grid">
        {data.talks
          .filter((t) => filter === "すべて" || filter === t.category)
          .map((t) => (
            <TalkCard key={t.id} talk={t} />
          ))}
      </div>
      <div className="info-strip glass">
        <ShieldCheck size={20} />
        <p>
          初回は無料、2回目から1回1,000円。すべてのトークに進行役が参加します。
        </p>
      </div>
      <Bookings />
    </>
  );
}
function Bookings() {
  const { data } = useApp();
  return (
    <section className="booking-section">
      <SectionTitle title="自分の申込み" />
      {data.bookings.length ? (
        <div className="booking-list">
          {data.bookings.map((b) => {
            const t = data.talks.find((t) => t.id === b.talkId);
            return (
              <Link
                key={b.id}
                className="booking-row glass"
                to={"/talks/" + b.talkId}
              >
                <Ticket size={20} />
                <div>
                  <strong>{t?.title}</strong>
                  <small>
                    {t && dateLabel(t.date)} {t?.time}
                  </small>
                </div>
                <span className="pill">{bookingLabel(b.status)}</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <Empty>まだ申込みはありません</Empty>
      )}
    </section>
  );
}
function bookingLabel(s: Booking["status"]) {
  return {
    confirmed: "参加確定",
    pending: "入金待ち",
    cancelled: "キャンセル済み",
    attended: "参加済み",
    refund_pending: "返金手続き中",
    refunded: "返金済み",
  }[s];
}
function TalkDetail() {
  const { id } = useParams(),
    { data, setData, toast, guard, refresh } = useApp(),
    [confirm, setConfirm] = useState(false),
    [cancel, setCancel] = useState(false),
    [busy, setBusy] = useState(false),
    [agreed, setAgreed] = useState(false),
    [failure, setFailure] = useState(""),
    [booked, setBooked] = useState(false);
  const t = data.talks.find((t) => t.id === id),
    booking = data.bookings.find(
      (b) => b.talkId === id && !["cancelled", "refunded"].includes(b.status),
    ),
    paidBefore = data.bookings.some((b) =>
      ["attended", "pending", "confirmed", "refunded"].includes(b.status),
    ),
    price = booking ? booking.amount : paidBefore ? t?.price || 1000 : 0;
  useEffect(() => {
    if (new URLSearchParams(location.search).get("payment") === "success")
      toast("決済結果を確認中です。入金通知の受信後に参加が確定します。");
  }, []);
  if (!t) return <Empty>トークが見つかりません</Empty>;
  async function reserve() {
    if (!guard() || !agreed || !t) return;
    setBusy(true);
    setFailure("");
    try {
      if (data.mode === "preview") {
        if (
          data.bookings.some(
            (b) =>
              b.talkId === id && !["cancelled", "refunded"].includes(b.status),
          )
        )
          throw new Error("このトークには申込み済みです");
        setData((d) => ({
          ...d,
          bookings: [
            ...d.bookings,
            {
              id: crypto.randomUUID(),
              talkId: t.id,
              status: "confirmed",
              amount: price,
            },
          ],
          talks: d.talks.map((x) =>
            x.id === t.id ? { ...x, occupied: x.occupied + 1 } : x,
          ),
        }));
        setBooked(true);
        setConfirm(false);
        toast("参加を確定しました（プレビュー）");
      } else {
        const r = await api<{ url?: string }>("/bookings", {
          method: "POST",
          body: JSON.stringify({ talkId: t.id }),
        });
        if (r.url) location.assign(r.url);
        else {
          await refresh();
          setConfirm(false);
          setBooked(true);
          toast("参加が確定しました");
        }
      }
    } catch (e) {
      setFailure((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function cancelBooking() {
    if (!booking) return;
    setBusy(true);
    try {
      if (data.mode === "production") {
        await api("/bookings/" + booking.id, { method: "DELETE" });
        await refresh();
      } else
        setData((d) => ({
          ...d,
          bookings: d.bookings.map((b) =>
            b.id === booking.id
              ? { ...b, status: b.amount ? "refund_pending" : "cancelled" }
              : b,
          ),
          talks: d.talks.map((x) =>
            x.id === id ? { ...x, occupied: Math.max(0, x.occupied - 1) } : x,
          ),
        }));
      setCancel(false);
      toast(
        booking.amount
          ? "キャンセルしました。返金を受け付けました"
          : "キャンセルしました",
      );
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="back-link" to="/talks">
        <ArrowLeft size={16} />
        地域トーク
      </Link>
      <div className="detail-photo">
        <img src={t.image} alt="喫茶店のコーヒー" />
        <span className="photo-badge">
          <Video size={14} />
          オンライン地域トーク
        </span>
      </div>
      <div className="detail-grid">
        <article>
          <div className="eyebrow">KYOTO · {t.category}</div>
          <h1 className="detail-title">{t.title}</h1>
          <div className="detail-chips">
            <span>
              <CalendarDays size={16} />
              {dateLabel(t.date)}
            </span>
            <span>{t.time}〜（日本時間）</span>
            <span>{t.duration}分</span>
          </div>
          <div className="prose">
            <h2>話すこと</h2>
            <p>{t.description}</p>
            <h2>参加する人</h2>
            <div className="participant-list">
              {t.participants.map((p) => (
                <div key={p.name}>
                  <Avatar name={p.name} color={p.color} src={p.avatarUrl} />
                  <span>
                    {p.name}
                    <small>{p.role}</small>
                  </span>
                  {p.role === "進行役" && <ShieldCheck size={16} />}
                </div>
              ))}
            </div>
            <h2>当日の流れ</h2>
            <ol>
              <li>自己紹介と、最近の京都の話</li>
              <li>テーマについて少人数で話す</li>
              <li>次の訪問や、旅のあとも小部屋で会話を続ける</li>
            </ol>
            <h2>参加・キャンセルについて</h2>
            <p>
              定員{t.capacity}
              人・進行役あり。会議リンクは参加確定後、開催前に登録メールへ送ります。
            </p>
            <p>
              開始24時間前までのキャンセルは全額返金。それ以降は返金できません。運営都合の中止は全額返金します。
            </p>
          </div>
        </article>
        <aside className="booking-panel glass">
          <span className="eyebrow">参加費</span>
          <div className="price">
            {yen(price)}
            {price === 0 && <span>初回参加</span>}
          </div>
          <p>2回目から {yen(t.price)} / 回</p>
          <div className="capacity-bar">
            <span
              style={{
                width: Math.min(100, (t.occupied / t.capacity) * 100) + "%",
              }}
            />
          </div>
          <div className="capacity-label">
            <span>
              {t.occupied} / {t.capacity}人
            </span>
            <strong>残り{Math.max(0, t.capacity - t.occupied)}席</strong>
          </div>
          {booking ? (
            <>
              <div className="booking-confirmed">
                <Check size={18} />
                {bookingLabel(booking.status)}
              </div>
              {booking.status === "pending" && (
                <button
                  className="button primary full"
                  onClick={async () => {
                    try {
                      const r = await api<{ url: string }>(
                        "/bookings/" + booking.id + "/checkout",
                        { method: "POST" },
                      );
                      location.assign(r.url);
                    } catch (e) {
                      toast((e as Error).message);
                    }
                  }}
                >
                  支払いを再開
                </button>
              )}
              {["confirmed", "pending"].includes(booking.status) && (
                <button
                  className="button subtle full"
                  onClick={() => setCancel(true)}
                >
                  申込みをキャンセル
                </button>
              )}
            </>
          ) : (
            <button
              disabled={t.occupied >= t.capacity}
              className="button primary full"
              onClick={() => {
                if (guard()) setConfirm(true);
              }}
            >
              {t.occupied >= t.capacity ? "満席です" : "参加を申し込む"}
              <ArrowRight size={17} />
            </button>
          )}
          <div className="booking-security">
            <LockKeyhole size={13} />
            招待制・少人数の交流
          </div>
        </aside>
      </div>
      {confirm && (
        <Modal
          title="参加内容の確認"
          onClose={() => !busy && setConfirm(false)}
        >
          <div className="confirmation-summary">
            <h3>{t.title}</h3>
            <p>
              {dateLabel(t.date)} {t.time}〜 / {t.duration}分
            </p>
            <strong>
              {yen(price)}
              {data.mode === "preview" ? "（プレビュー・請求なし）" : ""}
            </strong>
          </div>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>開催日時・料金・キャンセル条件を確認しました</span>
          </label>
          {failure && (
            <p role="alert" className="error-text">
              {failure}
            </p>
          )}
          <button
            className="button primary full"
            disabled={!agreed || busy}
            onClick={reserve}
          >
            {busy
              ? "処理中…"
              : price > 0 && data.mode === "production"
                ? "Stripeで支払う"
                : "参加を確定する"}
          </button>
        </Modal>
      )}
      {cancel && (
        <Modal title="申込みのキャンセル" onClose={() => setCancel(false)}>
          <p className="prose">
            {t.title}
            の申込みをキャンセルします。開始24時間前までなら全額返金されます。
          </p>
          <button
            className="button danger full"
            disabled={busy}
            onClick={cancelBooking}
          >
            {busy ? "処理中…" : "キャンセルを確定"}
          </button>
        </Modal>
      )}
      {booked && (
        <Modal title="参加が確定しました" onClose={() => setBooked(false)}>
          <div className="success-icon">
            <Check size={28} />
          </div>
          <p className="prose">
            {data.mode === "preview"
              ? "これは端末内のプレビュー予約です。実際の予約や請求は発生していません。"
              : "開催前にメールで会議リンクをお知らせします。"}
          </p>
          <button
            className="button primary full"
            onClick={() => setBooked(false)}
          >
            トーク詳細へ
          </button>
        </Modal>
      )}
    </>
  );
}
function ConversationButton({
  person,
  blocked = false,
}: {
  person: CommunityMember;
  blocked?: boolean;
}) {
  const { startConversation, toast, data } = useApp(),
    navigate = useNavigate(),
    [busy, setBusy] = useState(false);
  return (
    <button
      className="button primary"
      aria-label={
        person.name +
        " " +
        (blocked ? "送信できません" : busy ? "開いています…" : "メッセージ")
      }
      disabled={busy || blocked}
      onClick={async () => {
        if (!data.profile.nationality.trim()) {
          toast("国籍を登録すると会話を始められます");
          navigate("/profile");
          return;
        }
        setBusy(true);
        try {
          const id = await startConversation(person);
          if (id) navigate("/rooms/" + id);
        } catch (error) {
          toast((error as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <MessageCircle size={16} />
      {blocked ? "送信できません" : busy ? "開いています…" : "メッセージ"}
      <ArrowUpRight size={15} />
    </button>
  );
}
function MemberCard({ person }: { person: CommunityMember }) {
  return (
    <motion.article
      className="person-card glass"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Link
        to={"/people/" + person.id}
        className="person-identity"
        title={person.name + "のプロフィール"}
      >
        <Avatar
          name={person.name}
          color={person.color}
          src={person.avatarUrl}
        />
        <div>
          <h3>{person.name}</h3>
          <span>
            <MapPin size={12} />
            {person.relation}
          </span>
        </div>
        <ChevronRight size={16} />
      </Link>
      <div className="person-location">
        <Globe2 size={13} />
        <span>
          {person.nationality || "国籍未登録"}
          {person.city && " · " + person.city}
        </span>
      </div>
      <div className="person-interests">
        {person.interests.map((interest) => (
          <span key={interest}>{interest}</span>
        ))}
      </div>
      <div className="person-regions">
        <span>興味のある国・地域</span>
        <RegionLinks regions={person.interestedRegions.slice(0, 3)} />
      </div>
      <p>{person.bio || "自己紹介はまだありません"}</p>
      <small>
        <CalendarDays size={13} />
        {person.availability}
      </small>
      <ConversationButton person={person} />
    </motion.article>
  );
}
function RegionLinks({ regions }: { regions: string[] }) {
  return (
    <div className="region-links">
      {regions.map((region) => (
        <Link
          key={region}
          to={"/people?region=" + encodeURIComponent(region)}
          title={region + "に興味のある人を見る"}
        >
          {region}
          <ArrowUpRight size={12} />
        </Link>
      ))}
    </div>
  );
}
function Members() {
  const { data } = useApp(),
    [query, setQuery] = useState(""),
    [theme, setTheme] = useState("すべて"),
    [params, setParams] = useSearchParams();
  const nationality = params.get("nationality") || "",
    region = params.get("region") || "";
  const countries = [
    ...new Set(data.people.map((p) => p.nationality).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "ja"));
  const regions = [
    ...new Set(data.people.flatMap((p) => p.interestedRegions)),
  ].sort((a, b) => a.localeCompare(b, "ja"));
  function filter(key: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  }
  const list = data.people.filter((p) =>
    matchesMember(p, query, nationality, region, theme),
  );
  return (
    <>
      <Heading eyebrow="PEOPLE IN KYOTO" title="話せる人">
        <span className="pill">
          <MessageCircle size={14} />
          1対1の会話
        </span>
      </Heading>
      <div className="people-tools glass">
        <label className="field">
          名前・街・話したいこと
          <input
            type="search"
            value={query}
            placeholder="台北、京都、喫茶店…"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="form-row discovery-filters">
          <label className="field">
            国籍で絞り込む
            <select
              value={nationality}
              onChange={(e) => filter("nationality", e.target.value)}
            >
              <option value="">すべての国籍</option>
              {countries.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="field">
            興味のある国・地域で絞り込む
            <select
              value={region}
              onChange={(e) => filter("region", e.target.value)}
            >
              <option value="">すべての国・地域</option>
              {region && !regions.includes(region) && <option>{region}</option>}
              {regions.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        {data.profile.interestedRegions.length > 0 && (
          <div className="my-region-filters">
            <span>あなたの興味から探す</span>
            <div className="filter-row">
              {data.profile.interestedRegions.map((s) => (
                <CheckChip
                  key={s}
                  selected={normalizePlace(region) === normalizePlace(s)}
                  onClick={() => filter("region", region === s ? "" : s)}
                >
                  {s}
                </CheckChip>
              ))}
            </div>
          </div>
        )}
        <div className="filter-row">
          {["すべて", "喫茶店", "街歩き", "古本屋", "写真", "留学"].map((s) => (
            <CheckChip
              key={s}
              selected={theme === s}
              onClick={() => setTheme(s)}
            >
              {s}
            </CheckChip>
          ))}
        </div>
        <div className="people-result-count">
          <span>{list.length}人</span>
          {(query || nationality || region || theme !== "すべて") && (
            <button
              onClick={() => {
                setQuery("");
                setTheme("すべて");
                setParams({});
              }}
            >
              絞り込みを解除
              <X size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="people-grid">
        {list.map((p) => (
          <MemberCard key={p.id} person={p} />
        ))}
      </div>
      {!list.length && (
        <Empty>
          {data.mode === "production" && !data.user
            ? "ログインすると、話せる人を見られます。"
            : "条件に合う人はまだいません。"}
          <Link to="/profile">自分のプロフィールへ</Link>
        </Empty>
      )}
      <div className="info-strip glass">
        <LockKeyhole size={18} />
        <p>
          新しい会話を受け付けている人だけが表示されます。受付はプロフィールで選べます。
        </p>
      </div>
    </>
  );
}
function MemberDetail() {
  const { id } = useParams(),
    { data } = useApp();
  const conversation = data.rooms.find(
    (r) => r.kind === "direct" && r.peer?.id === id,
  );
  const person = data.people.find((p) => p.id === id) || conversation?.peer;
  if (!person)
    return (
      <Empty>
        プロフィールが見つかりません<Link to="/people">話せる人へ</Link>
      </Empty>
    );
  return (
    <>
      <Link to="/people" className="back-link">
        <ArrowLeft size={16} />
        話せる人
      </Link>
      <article className="member-profile glass">
        <div className="member-profile-top">
          <Avatar
            name={person.name}
            color={person.color}
            src={person.avatarUrl}
          />
          <span className="pill">
            <MapPin size={13} />
            京都・{person.relation}
          </span>
        </div>
        <h1>{person.name}</h1>
        <div className="person-location">
          <Globe2 size={15} />
          {person.nationality || "国籍未登録"}
          {person.city && (
            <>
              <span>·</span>
              <MapPin size={14} />
              {person.city}
            </>
          )}
        </div>
        <p className="member-bio">{person.bio || "自己紹介はまだありません"}</p>
        <div className="person-interests">
          {person.interests.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <section className="member-regions">
          <h2>興味のある国・地域</h2>
          {person.interestedRegions.length ? (
            <RegionLinks regions={person.interestedRegions} />
          ) : (
            <p className="muted">まだ登録されていません</p>
          )}
        </section>
        <dl>
          <dt>国籍</dt>
          <dd>{person.nationality || "未登録"}</dd>
          {person.city && (
            <>
              <dt>街</dt>
              <dd>{person.city}</dd>
            </>
          )}
          <dt>話せる時間</dt>
          <dd>{person.availability}</dd>
          {person.visitDate && (
            <>
              <dt>次の訪問</dt>
              <dd>{dateLabel(person.visitDate)}</dd>
            </>
          )}
        </dl>
        <ConversationButton person={person} blocked={conversation?.blocked} />
        <small>
          <LockKeyhole size={13} />
          メッセージはあなたと相手だけに届きます
        </small>
      </article>
    </>
  );
}
function Rooms() {
  const { data } = useApp(),
    location = useLocation(),
    [tab, setTab] = useState(
      location.search.includes("group") ? "group" : "direct",
    );
  const direct = data.rooms.filter((r) => r.kind === "direct"),
    groups = data.rooms.filter((r) => r.kind !== "direct");
  return (
    <>
      <Heading eyebrow="YOUR CONVERSATIONS" title="メッセージ">
        <Link className="button subtle small-button" to="/people">
          <Plus size={16} />
          相手を探す
        </Link>
      </Heading>
      <div className="conversation-tabs" role="tablist" aria-label="会話の種類">
        <button
          role="tab"
          id="direct-tab"
          aria-controls="conversations-panel"
          aria-selected={tab === "direct"}
          onClick={() => setTab("direct")}
          className={tab === "direct" ? "active" : ""}
        >
          1対1<span>{direct.length}</span>
        </button>
        <button
          role="tab"
          id="group-tab"
          aria-controls="conversations-panel"
          aria-selected={tab === "group"}
          onClick={() => setTab("group")}
          className={tab === "group" ? "active" : ""}
        >
          地域トークの小部屋<span>{groups.length}</span>
        </button>
      </div>
      <div
        id="conversations-panel"
        role="tabpanel"
        aria-labelledby={tab === "direct" ? "direct-tab" : "group-tab"}
      >
        {tab === "direct" ? (
          <div className="conversation-list">
            {direct.map((r) => (
              <Link
                className="conversation-row glass"
                key={r.id}
                to={"/rooms/" + r.id}
              >
                <Avatar
                  name={r.title}
                  color={r.peer?.color}
                  src={r.peer?.avatarUrl}
                />
                <div className="conversation-copy">
                  <div>
                    <h2>{r.title}</h2>
                    <time>{r.messages.at(-1)?.time}</time>
                  </div>
                  <p>
                    {r.blocked
                      ? "送信できません"
                      : r.messages.at(-1)?.body || "最初のメッセージを送る"}
                  </p>
                  <small>{r.peer?.interests.join("・") || "1対1の会話"}</small>
                </div>
                {r.unread > 0 ? (
                  <span className="unread-badge">{r.unread}</span>
                ) : (
                  <ChevronRight size={17} />
                )}
              </Link>
            ))}
            {!direct.length && (
              <Empty>
                まだ会話はありません<Link to="/people">話せる人を探す</Link>
              </Empty>
            )}
          </div>
        ) : (
          <div className="rooms-grid">
            {groups.map((r) => (
              <Link
                key={r.id}
                className="room-card glass"
                to={"/rooms/" + r.id}
              >
                <div className="room-card-image">
                  <img src={r.image} alt="" />
                  <span className="photo-badge">
                    <Users size={13} />
                    {r.members}人
                  </span>
                </div>
                <div className="room-card-body">
                  <div className="room-card-header">
                    <h2>{r.title}</h2>
                    {r.unread > 0 && (
                      <span className="unread-badge">{r.unread}</span>
                    )}
                  </div>
                  <p>{r.subtitle}</p>
                  <blockquote>{r.messages.at(-1)?.body}</blockquote>
                  <div className="text-link">
                    会話を開く
                    <ArrowRight size={16} />
                  </div>
                </div>
              </Link>
            ))}
            {!groups.length && (
              <Empty>
                地域トーク参加後の小部屋が表示されます。
                <Link to="/talks">地域トークを見る</Link>
              </Empty>
            )}
          </div>
        )}
      </div>
      <div className="info-strip glass">
        <LockKeyhole size={18} />
        <p>
          {tab === "direct"
            ? "1対1の会話を読めるのは、あなたと相手だけです。"
            : "小部屋の会話は、その参加者だけが読めます。"}
        </p>
      </div>
    </>
  );
}
function RoomDetail() {
  const { id } = useParams(),
    { data, setData, toast, guard, refresh } = useApp(),
    [body, setBody] = useState(""),
    [reply, setReply] = useState(""),
    [report, setReport] = useState(""),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [menu, setMenu] = useState(""),
    [details, setDetails] = useState(false),
    end = useRef<HTMLDivElement>(null);
  const room = data.rooms.find((r) => r.id === id);
  const direct = room?.kind === "direct";
  async function blockPeer() {
    if (!room?.peer || !guard()) return;
    setBusy(true);
    try {
      if (data.mode === "production") {
        await api("/blocks", {
          method: "POST",
          body: JSON.stringify({ personId: room.peer.id }),
        });
        await refresh();
      } else
        setData((d) => ({
          ...d,
          people: d.people.filter((p) => p.id !== room.peer!.id),
          rooms: d.rooms.map((r) =>
            r.id === id
              ? {
                  ...r,
                  blocked: true,
                  blockedByMe: true,
                }
              : r,
          ),
        }));
      setDetails(false);
      toast("相手をブロックしました");
    } catch (error) {
      toast((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function unblockPeer() {
    if (!room?.peer || !guard()) return;
    setBusy(true);
    try {
      if (data.mode === "production") {
        await api("/blocks/" + encodeURIComponent(room.peer.id), {
          method: "DELETE",
        });
        await refresh();
      } else
        setData((d) => ({
          ...d,
          people: d.people.some((p) => p.id === room.peer!.id)
            ? d.people
            : [...d.people, room.peer!],
          rooms: d.rooms.map((r) =>
            r.id === id ? { ...r, blocked: false, blockedByMe: false } : r,
          ),
        }));
      setDetails(false);
      toast("ブロックを解除しました");
    } catch (error) {
      toast((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (room?.unread) {
      if (data.mode === "production")
        void api("/rooms/" + id + "/read", { method: "POST" })
          .then(refresh)
          .catch(() => {});
      else
        setData((d) => ({
          ...d,
          rooms: d.rooms.map((r) => (r.id === id ? { ...r, unread: 0 } : r)),
        }));
    }
  }, [id, room?.unread]);
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || room?.blocked || !guard()) return;
    if (!data.profile.nationality.trim()) {
      toast("プロフィールに国籍を登録してください");
      return;
    }
    setBusy(true);
    try {
      if (data.mode === "production") {
        await api("/rooms/" + id + "/messages", {
          method: "POST",
          body: JSON.stringify({
            body: body.trim(),
            replyTo: reply || undefined,
          }),
        });
        await refresh();
      } else {
        const message = {
          id: crypto.randomUUID(),
          author: data.profile.name || "あなた",
          avatarUrl: data.profile.avatarUrl,
          body: body.trim(),
          time: new Intl.DateTimeFormat("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Tokyo",
          }).format(new Date()),
          own: true,
          replyTo: reply,
        };
        setData((d) => ({
          ...d,
          rooms: d.rooms.map((r) =>
            r.id === id ? { ...r, messages: [...r.messages, message] } : r,
          ),
        }));
      }
      setBody("");
      setReply("");
      setTimeout(
        () =>
          end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
        80,
      );
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submitReport(e: FormEvent) {
    e.preventDefault();
    if (!guard()) return;
    setBusy(true);
    try {
      if (data.mode === "production")
        await api("/reports", {
          method: "POST",
          body: JSON.stringify({ messageId: report, reason }),
        });
      else {
        const rs = JSON.parse(localStorage.getItem("machi-reports") || "[]");
        localStorage.setItem(
          "machi-reports",
          JSON.stringify([
            ...rs,
            {
              id: crypto.randomUUID(),
              messageId: report,
              reason,
              status: "open",
              at: new Date().toISOString(),
            },
          ]),
        );
      }
      setReport("");
      setReason("");
      toast(
        "通報を運営へ送りました" +
          (data.mode === "preview" ? "（プレビュー）" : ""),
      );
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!room) return <Empty>参加している会話が見つかりません</Empty>;
  return (
    <>
      <Link to="/rooms" className="back-link">
        <ArrowLeft size={16} />
        メッセージ
      </Link>
      <div className="chat-panel glass">
        <div className="chat-header">
          <div className="room-cover">
            {direct ? (
              <Link
                to={"/people/" + room.peer?.id}
                aria-label={room.title + "のプロフィール"}
              >
                <Avatar
                  name={room.title}
                  color={room.peer?.color}
                  src={room.peer?.avatarUrl}
                />
              </Link>
            ) : (
              <img src={room.image} alt="" />
            )}
          </div>
          <div>
            <h1>{room.title}</h1>
            <p>
              {direct ? <MessageCircle size={13} /> : <Users size={13} />}
              {direct ? "1対1の会話" : room.members + "人"} <span>·</span>
              <LockKeyhole size={12} />
              {direct ? "ふたりだけ" : "参加者のみ"}
            </p>
          </div>
          <button
            className="icon-button"
            aria-label={direct ? "会話の設定" : "小部屋の情報"}
            onClick={() =>
              direct
                ? setDetails(true)
                : toast(room.subtitle + " · 参加者だけが会話を読めます")
            }
          >
            <CircleHelp size={19} />
          </button>
        </div>
        <div className="chat-messages">
          <div className="chat-date">
            {direct ? (
              <>
                <LockKeyhole size={12} />
                あなたと{room.title}だけの会話
              </>
            ) : (
              "京都・喫茶店と街歩き"
            )}
          </div>
          {direct && !room.messages.length && !room.blocked && (
            <div className="conversation-start">
              <Avatar
                name={room.title}
                color={room.peer?.color}
                src={room.peer?.avatarUrl}
              />
              <h2>{room.title}との会話</h2>
              <p>話したいテーマ：{room.peer?.interests.join("・")}</p>
              <small>{room.peer?.availability}</small>
              {room.peer?.interests.slice(0, 2).map((interest) => (
                <button
                  className="button subtle"
                  key={interest}
                  onClick={() =>
                    setBody(
                      "はじめまして。" +
                        interest +
                        "についてお話ししたいです。",
                    )
                  }
                >
                  {interest}の話をする
                  <ArrowUpRight size={14} />
                </button>
              ))}
            </div>
          )}
          {room.messages
            .filter((m) => !direct || !room.blockedByMe || m.own)
            .map((m) => (
              <div className={"message " + (m.own ? "own" : "")} key={m.id}>
                {!m.own && <Avatar name={m.author} src={m.avatarUrl} small />}
                <div className="message-main">
                  <div className="message-author">
                    {m.own ? "あなた" : m.author}
                    <time>{m.time}</time>
                  </div>
                  {m.replyTo && (
                    <div className="reply-context">
                      ↳{" "}
                      {room.messages
                        .find((x) => x.id === m.replyTo)
                        ?.body.slice(0, 50) || "メッセージへの返信"}
                    </div>
                  )}
                  <div className="message-bubble">{m.body}</div>
                  <div className="message-actions">
                    <button onClick={() => setReply(m.id)}>返信する</button>
                    <button
                      aria-label={m.author + "の投稿メニュー"}
                      onClick={() => setMenu(menu === m.id ? "" : m.id)}
                    >
                      <MoreHorizontal size={15} />
                    </button>
                    {menu === m.id && (
                      <>
                        <button
                          onClick={() => {
                            setReport(m.id);
                            setMenu("");
                          }}
                        >
                          <Flag size={12} />
                          通報
                        </button>
                        {!m.own && (
                          <button
                            onClick={async () => {
                              if (direct) {
                                setMenu("");
                                setDetails(true);
                                return;
                              }
                              if (!guard()) return;
                              try {
                                if (data.mode === "production")
                                  await api("/blocks", {
                                    method: "POST",
                                    body: JSON.stringify({ messageId: m.id }),
                                  });
                                setData((d) => ({
                                  ...d,
                                  rooms: d.rooms.map((r) => ({
                                    ...r,
                                    messages: r.messages.filter(
                                      (x) => x.author !== m.author,
                                    ),
                                  })),
                                }));
                                setMenu("");
                                toast(m.author + "の投稿を非表示にしました");
                              } catch (e) {
                                toast((e as Error).message);
                              }
                            }}
                          >
                            {direct ? "ブロック" : "非表示にする"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          <div ref={end} />
        </div>
        <form className="chat-composer" onSubmit={send}>
          {reply && (
            <div className="reply-bar">
              <span>
                返信：
                {room.messages.find((m) => m.id === reply)?.body.slice(0, 45)}
              </span>
              <button
                type="button"
                onClick={() => setReply("")}
                aria-label="返信を取り消す"
              >
                <X size={15} />
              </button>
            </div>
          )}
          <div className="compose-row">
            <textarea
              aria-label="メッセージ"
              placeholder="近況や、次の旅のことを…"
              rows={1}
              maxLength={2000}
              disabled={room.blocked}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void send(e);
                }
              }}
            />
            <button
              className="send-button"
              aria-label="メッセージを送信"
              disabled={!body.trim() || busy || room.blocked}
            >
              <Send size={18} />
            </button>
          </div>
          <small>
            {room.blocked
              ? "この会話にはメッセージを送信できません"
              : direct
                ? "メッセージは相手だけに届きます"
                : "この小部屋の参加者に共有されます"}
          </small>
        </form>
      </div>
      {details && direct && (
        <Modal title="会話の設定" onClose={() => setDetails(false)}>
          <p className="prose">
            {room.title}
            との1対1の会話です。ブロックすると、お互いにメッセージを送れなくなります。
          </p>
          <Link className="button subtle full" to={"/people/" + room.peer?.id}>
            相手のプロフィール
          </Link>
          <button
            className="button danger full"
            disabled={busy || (!!room.blocked && !room.blockedByMe)}
            onClick={room.blockedByMe ? unblockPeer : blockPeer}
          >
            {room.blockedByMe
              ? "ブロックを解除する"
              : room.blocked
                ? "送信できません"
                : "相手をブロックする"}
          </button>
        </Modal>
      )}
      {report && (
        <Modal title="投稿を通報する" onClose={() => setReport("")}>
          <form onSubmit={submitReport}>
            <label className="field">
              理由
              <select
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="">選んでください</option>
                <option>営業・勧誘</option>
                <option>迷惑行為・不適切な内容</option>
                <option>誤った情報</option>
                <option>その他</option>
              </select>
            </label>
            <p className="muted">
              運営が確認します。通報したことは投稿者へ通知されません。
            </p>
            <button className="button primary full" disabled={!reason || busy}>
              通報を送信
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function NoteDetail() {
  const { id } = useParams(),
    { data, toast } = useApp(),
    [saved, setSaved] = useState(
      () =>
        JSON.parse(
          localStorage.getItem("machi-saved-notes") || "[]",
        ) as string[],
    );
  const n = data.notes.find((n) => n.id === id);
  if (!n) return <Empty>メモが見つかりません</Empty>;
  return (
    <>
      <Link to="/" className="back-link">
        <ArrowLeft size={16} />
        現地のメモ
      </Link>
      <div className="note-detail glass">
        <img className="note-detail-photo" src={n.image} alt={n.title} />
        <article>
          <div className="eyebrow">KYOTO · {n.category}</div>
          <h1>{n.title}</h1>
          <div className="note-detail-author">
            <Avatar name={n.author} src={n.avatarUrl} />
            <div>
              <strong>{n.author}</strong>
              <span className="pill">{n.role}</span>
            </div>
            <button
              className={"icon-button " + (saved.includes(n.id) ? "saved" : "")}
              aria-label="メモを保存"
              aria-pressed={saved.includes(n.id)}
              onClick={() => {
                const s = saved.includes(n.id)
                  ? saved.filter((x) => x !== n.id)
                  : [...saved, n.id];
                setSaved(s);
                localStorage.setItem("machi-saved-notes", JSON.stringify(s));
                toast(
                  s.includes(n.id)
                    ? "メモを保存しました"
                    : "保存を解除しました",
                );
              }}
            >
              <Bookmark size={20} />
            </button>
          </div>
          <p className="note-body">{n.body}</p>
          <div className="info-strip">
            <ShieldCheck size={20} />
            <div>
              <strong>情報確認日：{n.verifiedAt}</strong>
              <p>{n.relation}</p>
            </div>
          </div>
          {data.mode === "preview" && (
            <small className="muted">
              プレビュー用の架空のメモです。店舗情報の提供ではありません。
            </small>
          )}
        </article>
      </div>
    </>
  );
}
function Consult() {
  const { data, setData, toast, guard } = useApp(),
    [selected, setSelected] = useState(""),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [budget, setBudget] = useState(""),
    [date, setDate] = useState(""),
    [shares, setShares] = useState<string[]>([]),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!guard()) return;
    setBusy(true);
    try {
      const c: Consultation = {
        id: crypto.randomUUID(),
        title,
        provider: selected,
        budget,
        date,
        body,
        shareMessageIds: shares,
        status: "submitted",
      };
      if (data.mode === "production") {
        await api("/consultations", {
          method: "POST",
          body: JSON.stringify({ ...c, consent }),
        });
        await useRefresh();
      } else setData((d) => ({ ...d, consultations: [...d.consultations, c] }));
      setSuccess(true);
      setSelected("");
      setTitle("");
      setBody("");
      setBudget("");
      setDate("");
      setShares([]);
      setConsent(false);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function useRefresh() {
    const b = await api<typeof data>("/bootstrap");
    setData(() => b);
  }
  return (
    <>
      <Heading eyebrow="LOCAL PROFESSIONALS" title="プロへの相談" />
      <div className="info-strip glass">
        <ShieldCheck size={20} />
        <p>
          あなたが依頼したときだけ、選んだ事業者に相談が届きます。サービス代金は事業者へ直接お支払いください。
        </p>
      </div>
      {data.mode === "production" && !data.providers?.length && (
        <Empty>相談を受付中の事業者はいません</Empty>
      )}
      <div className="providers-grid">
        {(data.mode === "preview" ? providers : data.providers || []).map(
          (p) => (
            <div className="provider-card glass" key={p.id}>
              <div className="provider-head">
                <Avatar name={p.initial || p.name} color={p.color} />
                <div>
                  <h2>{p.name}</h2>
                  <span className="provider-badge">
                    <ShieldCheck size={12} />
                    確認済み事業者
                  </span>
                </div>
              </div>
              <div className="tags">
                <span>{p.theme}</span>
              </div>
              <p>{p.bio}</p>
              <div className="provider-price">{p.price}</div>
              <button
                className={
                  "button full " + (selected === p.id ? "primary" : "subtle")
                }
                onClick={() => {
                  if (guard()) setSelected(p.id);
                }}
              >
                {selected === p.id ? (
                  <>
                    <Check size={16} />
                    選択中
                  </>
                ) : (
                  <>
                    このプロに相談する
                    <ArrowUpRight size={16} />
                  </>
                )}
              </button>
            </div>
          ),
        )}
      </div>
      {selected && (
        <form className="consult-form glass" onSubmit={submit}>
          <SectionTitle title="相談内容" />
          <label className="field">
            相談先
            <input
              value={
                (data.mode === "preview"
                  ? providers
                  : data.providers || []
                ).find((p) => p.id === selected)?.name
              }
              readOnly
            />
          </label>
          <label className="field">
            相談のタイトル
            <input
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：再訪時の喫茶店めぐりについて"
            />
          </label>
          <label className="field">
            依頼内容
            <textarea
              required
              minLength={10}
              maxLength={3000}
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="相談したいこと、人数、ご希望など"
            />
          </label>
          <div className="form-row">
            <label className="field">
              予算
              <select
                value={budget}
                required
                onChange={(e) => setBudget(e.target.value)}
              >
                <option value="">選んでください</option>
                {[
                  "3,000円以内",
                  "3,000〜5,000円",
                  "5,000〜10,000円",
                  "10,000円以上",
                  "相談したい",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="field">
              希望日
              <input
                required
                type="date"
                min="2026-10-21"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>
          <fieldset className="share-field">
            <legend>共有してよい自分の投稿（任意）</legend>
            <small>相手のメッセージや会話全体は共有しません。</small>
            {data.rooms
              .flatMap((r) => r.messages.filter((m) => m.own))
              .map((m) => (
                <label className="checkbox-field" key={m.id}>
                  <input
                    type="checkbox"
                    checked={shares.includes(m.id)}
                    onChange={(e) =>
                      setShares((s) =>
                        e.target.checked
                          ? [...s, m.id]
                          : s.filter((x) => x !== m.id),
                      )
                    }
                  />
                  {m.body.slice(0, 100)}
                </label>
              ))}
            {!data.rooms.some((r) => r.messages.some((m) => m.own)) && (
              <p className="muted">共有できる自分の投稿はありません。</p>
            )}
          </fieldset>
          <label className="checkbox-field">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              相談先と運営へ上記の内容を共有することに同意します。料金は事業者の回答後に確認します。
            </span>
          </label>
          <button className="button primary" disabled={busy || !consent}>
            {busy ? "送信中…" : "相談を送る"}
            <Send size={16} />
          </button>
        </form>
      )}
      <section className="booking-section">
        <SectionTitle title="送信した相談" />
        {data.consultations.length ? (
          data.consultations.map((c) => (
            <div className="consultation-row glass" key={c.id}>
              <Compass size={20} />
              <div>
                <strong>{c.title}</strong>
                <p>
                  {
                    (data.mode === "preview"
                      ? providers
                      : data.providers || []
                    ).find((p) => p.id === c.provider)?.name
                  }{" "}
                  · {c.budget} · {c.date}
                </p>
              </div>
              <span className="pill">
                {
                  {
                    submitted: "送信済み",
                    accepted: "受諾",
                    completed: "有料成立",
                    cancelled: "取消",
                  }[c.status]
                }
              </span>
            </div>
          ))
        ) : (
          <Empty>送信した相談はありません</Empty>
        )}
      </section>
      {success && (
        <Modal title="相談を受け付けました" onClose={() => setSuccess(false)}>
          <div className="success-icon">
            <Check size={28} />
          </div>
          <p className="prose">
            {data.mode === "preview"
              ? "端末内のプレビューとして保存しました。事業者へは送信されていません。"
              : "運営が内容を確認し、事業者との日程調整を進めます。"}
          </p>
          <button
            className="button primary full"
            onClick={() => setSuccess(false)}
          >
            閉じる
          </button>
        </Modal>
      )}
    </>
  );
}
function ProfilePage() {
  const { data, setData, toast, guard, refresh } = useApp(),
    [p, setP] = useState<Profile>(data.profile || emptyProfile),
    [busy, setBusy] = useState(false),
    [reset, setReset] = useState(false),
    [regionsText, setRegionsText] = useState(
      data.profile.interestedRegions.join("、"),
    ),
    [photo, setPhoto] = useState<Blob | null>(null),
    [photoPreview, setPhotoPreview] = useState(""),
    [removePhoto, setRemovePhoto] = useState(false),
    [processingPhoto, setProcessingPhoto] = useState(false);
  useEffect(() => {
    if (!photo) {
      setPhotoPreview("");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!guard()) return;
    const interestedRegions = parseRegions(regionsText);
    if (!p.nationality.trim()) {
      toast("国籍を入力してください");
      return;
    }
    if (
      interestedRegions.length > 12 ||
      interestedRegions.some((s) => s.length > 60)
    ) {
      toast("興味のある国・地域は1つ60文字以内、12件までです");
      return;
    }
    setBusy(true);
    try {
      let next = {
        ...p,
        nationality: p.nationality.trim(),
        city: p.city.trim(),
        interestedRegions,
      };
      await saveProfile(next, data.mode);
      if (photo) {
        const avatarUrl =
          data.mode === "preview"
            ? await photoDataUrl(photo)
            : (
                await api<{ avatarUrl: string }>("/profile/photo", {
                  method: "PUT",
                  headers: { "Content-Type": "image/jpeg" },
                  body: photo,
                })
              ).avatarUrl;
        next = { ...next, avatarUrl };
      } else if (removePhoto) {
        if (data.mode === "production")
          await api("/profile/photo", { method: "DELETE" });
        next = { ...next, avatarUrl: "" };
      }
      setP(next);
      setPhoto(null);
      setRemovePhoto(false);
      setData((d) => ({
        ...d,
        profile: next,
        rooms:
          d.mode === "preview"
            ? d.rooms.map((r) => ({
                ...r,
                messages: r.messages.map((m) =>
                  m.own
                    ? { ...m, author: next.name, avatarUrl: next.avatarUrl }
                    : m,
                ),
              }))
            : d.rooms,
      }));
      if (data.mode === "production") await refresh();
      toast("プロフィールを保存しました");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading eyebrow="YOUR PROFILE" title="プロフィール" />
      {!data.user && (
        <div className="login-card glass">
          <div className="inline">
            <span className="soft-icon">
              <LockKeyhole size={21} />
            </span>
            <div>
              <h2>Googleでログイン</h2>
              <p>招待されたGoogleアカウントを使用します。</p>
            </div>
          </div>
          {data.configured.google ? (
            <a href="/api/auth/google" className="button primary">
              Googleで続ける
              <ArrowRight size={17} />
            </a>
          ) : (
            <>
              <button className="button subtle" disabled>
                Google認証は未接続です
              </button>
              <small>設定完了後にログインできます。</small>
            </>
          )}
        </div>
      )}
      <form className="profile-form glass" onSubmit={submit}>
        <div className="profile-identity">
          <Avatar
            name={p.name || "旅"}
            color="#dce5dc"
            src={photo ? photoPreview : removePhoto ? "" : p.avatarUrl}
          />
          <div>
            <h2>{p.name || "プロフィール設定"}</h2>
            <span className="pill">京都コミュニティ</span>
          </div>
        </div>
        <div className="profile-photo-controls">
          <input
            className="photo-input"
            id="profile-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={processingPhoto || busy}
            onChange={async (e) => {
              const file = e.currentTarget.files?.[0];
              e.currentTarget.value = "";
              if (!file) return;
              setProcessingPhoto(true);
              try {
                setPhoto(await prepareProfilePhoto(file));
                setRemovePhoto(false);
              } catch (error) {
                toast((error as Error).message);
              } finally {
                setProcessingPhoto(false);
              }
            }}
          />
          <label className="button subtle small-button" htmlFor="profile-photo">
            <Camera size={16} />
            {processingPhoto ? "写真を準備中…" : "プロフィール写真を選ぶ"}
          </label>
          {(photo || (!removePhoto && p.avatarUrl)) && (
            <button
              type="button"
              className="button text-button small-button"
              onClick={() => {
                setPhoto(null);
                setRemovePhoto(true);
              }}
            >
              写真を削除
            </button>
          )}
          <small>
            JPEG・PNG・WebP、10MBまで。正方形に整え、「変更を保存」で反映します。
          </small>
        </div>
        <label className="field">
          表示名
          <input
            required
            maxLength={40}
            value={p.name}
            onChange={(e) => setP({ ...p, name: e.target.value })}
          />
        </label>
        <div className="form-row profile-location-fields">
          <label className="field">
            国籍（必須）
            <input
              required
              maxLength={60}
              value={p.nationality}
              placeholder="例：日本"
              onChange={(e) => setP({ ...p, nationality: e.target.value })}
            />
          </label>
          <label className="field">
            街（任意）
            <input
              maxLength={80}
              value={p.city}
              placeholder="例：京都、台北"
              onChange={(e) => setP({ ...p, city: e.target.value })}
            />
          </label>
        </div>
        <label className="field">
          興味のある国・地域
          <textarea
            aria-label="興味のある国・地域"
            rows={2}
            maxLength={800}
            value={regionsText}
            placeholder="例：台湾、韓国、北欧"
            onChange={(e) => setRegionsText(e.target.value)}
            aria-describedby="profile-regions-help"
          />
          <small id="profile-regions-help">
            カンマ・読点・改行で区切って、12件まで書けます。
          </small>
        </label>
        <label className="field">
          自己紹介
          <textarea
            aria-label="自己紹介"
            rows={3}
            maxLength={500}
            value={p.bio}
            onChange={(e) => setP({ ...p, bio: e.target.value })}
            placeholder="好きなことや、この街との思い出"
          />
        </label>
        <label className="field">
          京都との関わり
          <select
            value={p.relation}
            onChange={(e) => setP({ ...p, relation: e.target.value })}
          >
            {["住んでいる", "最近訪れた", "再訪予定", "留学している"].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </select>
        </label>
        <div className="field">
          <span>興味・話せるテーマ</span>
          <div className="filter-row">
            {["喫茶店", "街歩き", "古本屋", "写真", "文化", "留学"].map((s) => (
              <CheckChip
                key={s}
                selected={p.interests.includes(s)}
                onClick={() =>
                  setP({
                    ...p,
                    interests: p.interests.includes(s)
                      ? p.interests.filter((i) => i !== s)
                      : [...p.interests, s],
                  })
                }
              >
                {s}
              </CheckChip>
            ))}
          </div>
        </div>
        <div className="form-row">
          <label className="field">
            次の訪問予定
            <input
              type="date"
              value={p.visitDate}
              min="2026-10-21"
              onChange={(e) => setP({ ...p, visitDate: e.target.value })}
            />
          </label>
          <label className="field">
            話せる時間
            <select
              value={p.availability}
              onChange={(e) => setP({ ...p, availability: e.target.value })}
            >
              {["土日の夜", "平日の夜", "平日の昼", "不定期・都度相談"].map(
                (s) => (
                  <option key={s}>{s}</option>
                ),
              )}
            </select>
          </label>
        </div>
        <label className="conversation-opt-in">
          <input
            type="checkbox"
            checked={!!p.acceptsMessages}
            onChange={(e) => setP({ ...p, acceptsMessages: e.target.checked })}
          />
          <span>
            <strong>新しい1対1の会話を受け付ける</strong>
            <small>
              オンにすると、国籍・街・興味のある国や地域・写真を含むプロフィールが会員の「話せる人」に表示されます。オフにしても、始めた会話は続けられます。
            </small>
          </span>
        </label>
        <button className="button primary" disabled={busy || processingPhoto}>
          {busy ? "保存中…" : "変更を保存"}
          <Check size={16} />
        </button>
      </form>
      <div className="account-actions">
        {(data.mode === "preview" || data.user?.role === "admin") && (
          <Link to="/admin" className="button subtle">
            <ShieldCheck size={17} />
            運営管理
          </Link>
        )}
        {data.user && (
          <button
            className="button subtle"
            onClick={async () => {
              await api("/auth/logout", { method: "POST" });
              await refresh();
              toast("ログアウトしました");
            }}
          >
            <LogOut size={17} />
            ログアウト
          </button>
        )}
        {data.mode === "preview" && (
          <button className="button text-button" onClick={() => setReset(true)}>
            プレビューをリセット
          </button>
        )}
      </div>
      {reset && (
        <Modal title="プレビューをリセット" onClose={() => setReset(false)}>
          <p className="prose">
            この端末のサンプル投稿・申込み・プロフィールを初期状態に戻します。
          </p>
          <button
            className="button danger full"
            onClick={() => {
              [
                "machi-preview-v1",
                "machi-trip-stage",
                "machi-reports",
                "machi-saved-notes",
                "machi-costs",
              ].forEach((k) => localStorage.removeItem(k));
              window.location.assign("/");
            }}
          >
            リセットする
          </button>
        </Modal>
      )}
    </>
  );
}
function Admin() {
  const { data, setData, toast } = useApp(),
    [tab, setTab] = useState("予約"),
    [admin, setAdmin] = useState<{
      bookings: any[];
      reports: any[];
      consultations: any[];
      metrics: any;
      providers: any[];
      costs?: { fees: number; reward: number; labor: number };
    }>({
      bookings: [],
      reports: [],
      consultations: [],
      metrics: {},
      providers: [],
    }),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [classifying, setClassifying] = useState(false),
    [classification, setClassification] = useState(""),
    [meeting, setMeeting] = useState(""),
    [groups, setGroups] = useState<Record<string, string[]>>({}),
    [attendees, setAttendees] = useState<string[]>([]);
  async function load() {
    try {
      if (data.mode === "production") setAdmin(await api("/admin"));
      else
        setAdmin({
          bookings: data.bookings,
          reports: JSON.parse(localStorage.getItem("machi-reports") || "[]"),
          consultations: data.consultations,
          providers: providers.map((p) => ({ ...p, verified: 1 })),
          metrics: {},
        });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  if (data.mode === "production" && data.user?.role !== "admin")
    return <Empty>運営アカウントでログインしてください</Empty>;
  async function act(kind: string, id: string, status: string) {
    try {
      if (data.mode === "production") {
        await api("/admin/" + kind + "/" + id, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        await load();
      } else {
        if (kind === "reports") {
          const rs = admin.reports.map((r) =>
            r.id === id ? { ...r, status } : r,
          );
          localStorage.setItem("machi-reports", JSON.stringify(rs));
          setAdmin((a) => ({ ...a, reports: rs }));
        } else if (kind === "consultations") {
          setData((d) => ({
            ...d,
            consultations: d.consultations.map((c) =>
              c.id === id
                ? { ...c, status: status as Consultation["status"] }
                : c,
            ),
          }));
          setAdmin((a) => ({
            ...a,
            consultations: a.consultations.map((c) =>
              c.id === id ? { ...c, status } : c,
            ),
          }));
        } else if (kind === "providers")
          setAdmin((a) => ({
            ...a,
            providers: a.providers.map((p) =>
              p.id === id
                ? { ...p, verified: status === "verified" ? 1 : 0 }
                : p,
            ),
          }));
        else
          setAdmin((a) => ({
            ...a,
            bookings: a.bookings.map((b) =>
              b.id === id ? { ...b, status } : b,
            ),
          }));
      }
      toast("対応状況を更新しました");
    } catch (e) {
      toast((e as Error).message);
    }
  }
  return (
    <>
      <Heading eyebrow="OPERATIONS" title="運営管理">
        <span className="pill">
          <ShieldCheck size={14} />
          {data.mode === "preview" ? "管理プレビュー" : "運営者"}
        </span>
      </Heading>
      <div className="metrics-grid">
        {[
          [
            "申込み",
            data.mode === "preview"
              ? data.bookings.length
              : admin.metrics.bookings || 0,
          ],
          [
            "再接点",
            data.mode === "preview" ? "—" : admin.metrics.reconnections || 0,
          ],
          [
            "相談",
            data.mode === "preview"
              ? data.consultations.length
              : admin.metrics.consultations || 0,
          ],
          [
            "売上",
            yen(
              data.mode === "preview"
                ? data.bookings
                    .filter((b) => ["confirmed", "attended"].includes(b.status))
                    .reduce((s, b) => s + b.amount, 0)
                : admin.metrics.revenue || 0,
            ),
          ],
        ].map(([label, value]) => (
          <div className="metric glass" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="filter-row">
        {[
          "予約",
          "通報",
          "相談",
          "参加者の組合せ",
          "事業者",
          "開催・メール",
          "募集・招待",
          "採算",
        ].map((t) => (
          <CheckChip key={t} selected={tab === t} onClick={() => setTab(t)}>
            {t}
          </CheckChip>
        ))}
      </div>
      {loading ? (
        <Skeleton />
      ) : error ? (
        <p role="alert">{error}</p>
      ) : (
        <div className="admin-panel glass">
          {tab === "予約" && (
            <>
              <h2>予約・参加・返金</h2>
              {!admin.bookings.length && (
                <p className="muted">予約はありません</p>
              )}
              {admin.bookings.map((b) => (
                <div className="admin-row" key={b.id}>
                  <div>
                    <strong>
                      {data.talks.find((t) => t.id === b.talkId)?.title ||
                        b.talk_id}
                    </strong>
                    <p>
                      {b.name || "参加者"} · {yen(b.amount || 0)} ·{" "}
                      {bookingLabel(b.status)}
                    </p>
                  </div>
                  {b.status === "confirmed" && (
                    <button
                      className="button subtle"
                      onClick={() => act("bookings", b.id, "attended")}
                    >
                      参加を記録
                    </button>
                  )}
                  {b.status === "refund_pending" && (
                    <button
                      className="button subtle"
                      onClick={() => act("bookings", b.id, "refunded")}
                    >
                      返金を実行
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
          {tab === "通報" && (
            <>
              <h2>通報対応</h2>
              {!admin.reports.length && (
                <p className="muted">対応待ちの通報はありません</p>
              )}
              {admin.reports.map((r) => (
                <div className="admin-row" key={r.id}>
                  <div>
                    <strong>{r.reason}</strong>
                    <p>
                      {r.body || r.messageId} ·{" "}
                      {r.status === "resolved" ? "対応済み" : "対応待ち"}
                    </p>
                  </div>
                  {r.status !== "resolved" && (
                    <button
                      className="button subtle"
                      onClick={() => act("reports", r.id, "resolved")}
                    >
                      対応済みにする
                    </button>
                  )}
                </div>
              ))}
              <button
                className="button subtle"
                disabled={classifying || data.mode === "preview"}
                onClick={async () => {
                  setClassifying(true);
                  try {
                    const r = await api<{ result: unknown }>(
                      "/admin/classify",
                      { method: "POST" },
                    );
                    setClassification(JSON.stringify(r.result));
                  } catch (e) {
                    toast((e as Error).message);
                  } finally {
                    setClassifying(false);
                  }
                }}
              >
                <Sparkles size={16} />
                {classifying ? "分類中…" : "Workers AIで確認を補助"}
              </button>
              {data.mode === "preview" && (
                <p className="muted">
                  AI分類はWorkers
                  AI接続後に利用できます。判断は運営者が行います。
                </p>
              )}
              {classification && (
                <pre className="ai-result">{classification}</pre>
              )}
            </>
          )}
          {tab === "相談" && (
            <>
              <h2>相談・成立状況</h2>
              {!admin.consultations.length && (
                <p className="muted">相談はありません</p>
              )}
              {admin.consultations.map((c) => (
                <div className="admin-row" key={c.id}>
                  <div>
                    <strong>{c.title}</strong>
                    <p>
                      {c.status} · {c.budget}
                    </p>
                  </div>
                  <select
                    aria-label="相談の対応状況"
                    value={c.status}
                    onChange={(e) => act("consultations", c.id, e.target.value)}
                  >
                    <option value="submitted">送信済み</option>
                    <option value="accepted">受諾</option>
                    <option value="completed">有料成立</option>
                    <option value="cancelled">取消</option>
                  </select>
                </div>
              ))}
            </>
          )}
          {tab === "事業者" && (
            <>
              <h2>事業者確認</h2>
              {admin.providers.map((p) => (
                <div className="admin-row" key={p.id}>
                  <div>
                    <strong>{p.name}</strong>
                    <p>{p.verified ? "確認済み" : "未確認"}</p>
                  </div>
                  <button
                    className="button subtle"
                    onClick={() =>
                      act(
                        "providers",
                        p.id,
                        p.verified ? "unverified" : "verified",
                      )
                    }
                  >
                    {p.verified ? "確認を解除" : "本人・事業を確認済みにする"}
                  </button>
                </div>
              ))}
            </>
          )}
          {tab === "開催・メール" && (
            <>
              <h2>開催リンクを送る</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    if (!data.talks[0])
                      throw new Error("トークを先に募集してください");
                    if (data.mode === "production") {
                      await api("/admin/meeting", {
                        method: "POST",
                        body: JSON.stringify({
                          talkId: data.talks[0].id,
                          url: meeting,
                        }),
                      });
                      toast("参加確定者へメールを送信しました");
                    } else
                      toast(
                        "送信をプレビューしました。メールは送られていません",
                      );
                  } catch (e) {
                    toast((e as Error).message);
                  }
                }}
              >
                <p className="muted">
                  {data.talks[0]?.title || "トークを先に募集してください"}
                  の参加確定者へ送信
                </p>
                <label className="field">
                  会議URL
                  <input
                    required
                    type="url"
                    value={meeting}
                    placeholder="https://meet.google.com/…"
                    onChange={(e) => setMeeting(e.target.value)}
                  />
                </label>
                <button className="button primary">参加者にメールを送る</button>
              </form>
            </>
          )}
          {tab === "参加者の組合せ" && (
            <>
              <h2>参加者を小部屋へ割り当て</h2>
              <p className="muted">
                参加を確認した予約から4〜6人を選んで小部屋を作成します。
              </p>
              {admin.bookings
                .filter((b) => ["confirmed", "attended"].includes(b.status))
                .map((b) => (
                  <label className="checkbox-field" key={b.id}>
                    <input
                      type="checkbox"
                      checked={attendees.includes(b.id)}
                      onChange={(e) =>
                        setAttendees((a) =>
                          e.target.checked
                            ? [...a, b.id]
                            : a.filter((x) => x !== b.id),
                        )
                      }
                    />
                    {b.name || b.id}
                  </label>
                ))}
              <button
                disabled={attendees.length < 4 || attendees.length > 6}
                className="button primary"
                onClick={async () => {
                  try {
                    if (data.mode === "production") {
                      await api("/admin/rooms", {
                        method: "POST",
                        body: JSON.stringify({
                          bookingIds: attendees,
                          title: "京都の喫茶と、街歩き",
                        }),
                      });
                      toast("小部屋を作成しました");
                    } else {
                      setGroups((g) => ({
                        ...g,
                        [crypto.randomUUID()]: attendees,
                      }));
                      toast("小部屋の組合せをプレビューしました");
                    }
                    setAttendees([]);
                  } catch (e) {
                    toast((e as Error).message);
                  }
                }}
              >
                小部屋を作成
              </button>
              {Object.keys(groups).length > 0 && (
                <p>{Object.keys(groups).length}組をプレビュー済み</p>
              )}
            </>
          )}
          {tab === "募集・招待" && <AdminSetup />}
          {tab === "採算" && (
            <Costs
              costs={admin.costs}
              revenue={
                data.mode === "preview" ? undefined : admin.metrics.gross
              }
              refunds={
                data.mode === "preview" ? undefined : admin.metrics.refunds
              }
            />
          )}
        </div>
      )}
    </>
  );
}
function Costs({
  revenue,
  refunds,
  costs,
}: {
  revenue?: number;
  refunds?: number;
  costs?: { fees: number; reward: number; labor: number };
}) {
  const { data, toast } = useApp();
  let initial: Record<string, number | string> = costs || {};
  if (data.mode === "preview")
    try {
      initial = JSON.parse(localStorage.getItem("machi-costs") || "{}");
    } catch {
      /* use default values */
    }
  const [fees, setFees] = useState(String(initial.fees || 0)),
    [reward, setReward] = useState(String(initial.reward || 0)),
    [labor, setLabor] = useState(String(initial.labor || 0));
  const rev =
    revenue ??
    data.bookings
      .filter((b) =>
        ["confirmed", "attended", "refund_pending", "refunded"].includes(
          b.status,
        ),
      )
      .reduce((s, b) => s + b.amount, 0);
  const refundAmount =
    refunds ??
    data.bookings
      .filter((b) => b.status === "refunded")
      .reduce((s, b) => s + b.amount, 0);
  return (
    <>
      <h2>運営採算</h2>
      <p className="muted">
        参加費から返金・決済費・謝礼・調整人件費を引いた金額を記録します。返金済みの金額は予約から自動集計します。
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            if (data.mode === "production")
              await api("/admin/costs", {
                method: "POST",
                body: JSON.stringify({
                  fees: Number(fees),
                  reward: Number(reward),
                  labor: Number(labor),
                }),
              });
            else
              localStorage.setItem(
                "machi-costs",
                JSON.stringify({ fees, reward, labor }),
              );
            toast("原価を記録しました");
          } catch (e) {
            toast((e as Error).message);
          }
        }}
      >
        {[
          ["決済手数料", fees, setFees],
          ["進行役への謝礼", reward, setReward],
          ["調整の人件費", labor, setLabor],
        ].map(([label, v, set]) => (
          <label className="field" key={label as string}>
            {label as string}
            <input
              type="number"
              min="0"
              required
              value={v as string}
              onChange={(e) => (set as (s: string) => void)(e.target.value)}
            />
          </label>
        ))}
        <p className="muted">
          参加費入金：{yen(rev)} / 返金済み：{yen(refundAmount)}
        </p>
        <p>
          見込み差額：
          <strong>
            {yen(
              rev -
                refundAmount -
                Number(fees) -
                Number(reward) -
                Number(labor),
            )}
          </strong>
        </p>
        <button className="button primary">原価を保存</button>
      </form>
    </>
  );
}
function AdminSetup() {
  const { data, toast, refresh } = useApp(),
    [email, setEmail] = useState(""),
    [title, setTitle] = useState(""),
    [date, setDate] = useState(""),
    [description, setDescription] = useState(""),
    [category, setCategory] = useState("喫茶店"),
    [providerName, setProviderName] = useState(""),
    [providerEmail, setProviderEmail] = useState(""),
    [providerPrice, setProviderPrice] = useState(""),
    [noteTitle, setNoteTitle] = useState(""),
    [noteBody, setNoteBody] = useState(""),
    [verifiedAt, setVerifiedAt] = useState(""),
    [relation, setRelation] = useState("お店との利害関係なし"),
    [busy, setBusy] = useState(false);
  async function save(path: string, body: unknown) {
    setBusy(true);
    try {
      if (data.mode === "production") {
        await api("/admin/" + path, {
          method: "POST",
          body: JSON.stringify(body),
        });
        await refresh();
        toast("保存しました");
      } else
        toast("保存をプレビューしました。実際の募集・招待は行われていません");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-setup">
      <h2>招待する</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save("invitations", { email });
        }}
      >
        <label className="field">
          Googleアカウントのメール
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@gmail.com"
          />
        </label>
        <button className="button primary" disabled={busy}>
          30日間有効の招待を登録
        </button>
        <p className="muted">
          招待メールの自動送信は行いません。登録後、アプリのURLを本人へ共有してください。
        </p>
      </form>
      <h2>地域トークを募集する</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save("talks", {
            title,
            category,
            startsAt: new Date(date + "+09:00").toISOString(),
            duration: 45,
            capacity: 6,
            price: 1000,
            image: photos.coffee,
            host: data.profile.name || "運営",
            description,
          });
        }}
      >
        <label className="field">
          テーマ・タイトル
          <input
            required
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <div className="form-row">
          <label className="field">
            日時（日本時間）
            <input
              type="datetime-local"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="field">
            分類
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>喫茶店</option>
              <option>街歩き</option>
              <option>古本屋</option>
            </select>
          </label>
        </div>
        <label className="field">
          トークの内容
          <textarea
            required
            minLength={10}
            maxLength={2000}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <p className="muted">
          6人・45分・初回無料、2回目から1,000円で公開します。
        </p>
        <button className="button primary" disabled={busy}>
          募集を公開する
        </button>
      </form>
      <h2>事業者を登録する</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save("providers", {
            name: providerName,
            email: providerEmail,
            theme: "喫茶店・街歩き",
            bio: providerName + "の個別相談・案内",
            price: providerPrice,
          });
        }}
      >
        <label className="field">
          事業者名
          <input
            required
            value={providerName}
            onChange={(e) => setProviderName(e.target.value)}
          />
        </label>
        <label className="field">
          登録済み会員のメール
          <input
            type="email"
            required
            value={providerEmail}
            onChange={(e) => setProviderEmail(e.target.value)}
          />
        </label>
        <label className="field">
          料金の表示
          <input
            required
            placeholder="相談2,000円〜、案内6,000円〜"
            value={providerPrice}
            onChange={(e) => setProviderPrice(e.target.value)}
          />
        </label>
        <p className="muted">
          登録後、「事業者」タブで確認済みにしてください。
        </p>
        <button className="button primary" disabled={busy}>
          事業者を登録
        </button>
      </form>
      <h2>現地のメモを公開する</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save("notes", {
            title: noteTitle,
            body: noteBody,
            verifiedAt,
            relation,
            category: "喫茶店",
            image: photos.cafe,
          });
        }}
      >
        <label className="field">
          タイトル
          <input
            required
            maxLength={100}
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
          />
        </label>
        <label className="field">
          メモの内容
          <textarea
            required
            maxLength={3000}
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
          />
        </label>
        <label className="field">
          情報確認日
          <input
            required
            type="date"
            value={verifiedAt}
            onChange={(e) => setVerifiedAt(e.target.value)}
          />
        </label>
        <label className="field">
          お店・事業との関係
          <input
            required
            maxLength={200}
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
          />
        </label>
        <button className="button primary" disabled={busy}>
          メモを公開
        </button>
      </form>
    </div>
  );
}
