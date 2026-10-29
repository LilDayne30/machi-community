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
  DiscoveryAxes,
  ParticipationEditor,
  ParticipationSummary,
} from "./components/participation";
import {
  localKinds,
  matchesParticipation,
  participationError,
  participationOf,
  studyTopics,
} from "./lib/participation";
import {
  EventsPage as Talks,
  EventDetailPage as TalkDetail,
} from "./components/events";
import { Home } from "./components/home";
import { VisitStatus } from "./components/visit-status";
import { useGlassEffects } from "./components/useGlassEffects";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Bookmark,
  CalendarDays,
  Camera,
  Globe2,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Coffee,
  Footprints,
  GraduationCap,
  Compass,
  Flag,
  Home as HomeIcon,
  LockKeyhole,
  LogOut,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings2,
  SlidersHorizontal,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { api, saveProfile, useApp } from "./lib/store";
import { matchesMember, normalizePlace, parseRegions } from "./lib/profile";
import { photoDataUrl, prepareProfilePhoto } from "./lib/photo";
import {
  getRegion,
  regionLabel,
  regions as regionCatalog,
  residenceLabels,
  connectionError,
  connectionLabel,
} from "./lib/regions";
import {
  RegionPicker,
  ResidenceEditor,
  ResidenceLinks,
} from "./components/regions";
import {
  dateLabel,
  emptyProfile,
  photos,
  providers,
  type Consultation,
  type CommunityMember,
  type Profile,
} from "./lib/data";
import {
  Avatar,
  CheckChip,
  Empty,
  Heading,
  Modal,
  SectionTitle,
  Skeleton,
} from "./components/ui";
const nav = [
  { to: "/", label: "ホーム", icon: HomeIcon },
  { to: "/people", label: "話せる人", icon: Users },
  { to: "/rooms", label: "メッセージ", icon: MessageCircle },
  { to: "/consult", label: "プロへの相談", icon: Compass },
  { to: "/profile", label: "プロフィール", icon: Settings2 },
];
export default function App() {
  const effectsRef = useGlassEffects();
  const { data, loading, error, notify } = useApp(),
    location = useLocation(),
    [transition, setTransition] = useState(false),
    [notifications, setNotifications] = useState(false),
    [help, setHelp] = useState(false);
  const pageTitle =
    [
      ...nav.filter((n) => n.to !== "/"),
      { to: "/talks", label: "イベント" },
      { to: "/notes", label: "現地のメモ" },
      { to: "/admin", label: "運営管理" },
    ].find((n) => location.pathname.startsWith(n.to))?.label || "ホーム";
  useEffect(() => {
    document.title = `${pageTitle} | Roamigo`;
    setTransition(true);
    window.scrollTo(0, 0);
    const t = setTimeout(() => setTransition(false), 180);
    return () => clearTimeout(t);
  }, [location.pathname]);
  return (
    <div className="app-shell" ref={effectsRef}>
      <div className="ambient-light" aria-hidden="true">
        <span />
        <span />
      </div>
      <a className="skip" href="#main">
        コンテンツへ
      </a>
      <aside className="sidebar glass">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            R<span />
          </span>
          <span>
            Roamigo<span className="brand-dot">.</span>
          </span>
        </Link>
        <Link to="/people" className="sidebar-region">
          <span className="region-icon">
            <MapPin size={18} />
          </span>
          <div>
            <strong>話せる人</strong>
            <small>国・地域から探す</small>
          </div>
          <ArrowUpRight size={15} />
        </Link>
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
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      className="sidebar-nav-active"
                      aria-hidden="true"
                      layoutId="sidebar-navigation-surface"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 32,
                      }}
                    />
                  )}
                  <n.icon size={19} />
                  <span>{n.label}</span>
                  {n.to === "/rooms" &&
                    data.rooms.some((r) => r.unread > 0) && (
                      <span className="nav-dot" />
                    )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <NavLink
          to="/talks"
          className={({ isActive }) =>
            "nav-item secondary-nav " + (isActive ? "active" : "")
          }
        >
          <CalendarDays size={19} />
          <span>イベント</span>
        </NavLink>
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
            <span aria-current="page">{pageTitle}</span>
          </div>
          <Link to="/" className="mobile-brand">
            Roamigo<span>.</span>
          </Link>
          <div className="topbar-right">
            <span className="community-tag">
              <span className="live-dot" />
              招待制コミュニティ
            </span>
            <Link
              to="/talks"
              className="icon-button talks-shortcut"
              aria-label="イベントを開く"
              title="イベントを開く"
            >
              <CalendarDays size={20} />
            </Link>
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
                className="page-scene"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
              >
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/talks" element={<Talks />} />
                  <Route path="/talks/:id" element={<TalkDetail />} />
                  <Route path="/rooms" element={<Rooms />} />
                  <Route path="/rooms/:id" element={<RoomDetail />} />
                  <Route path="/people" element={<Members />} />
                  <Route path="/people/:id" element={<MemberDetail />} />
                  <Route path="/notes" element={<NotesPage />} />
                  <Route path="/notes/:id" element={<NoteDetail />} />
                  <Route path="/consult" element={<Consult />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/admin/*" element={<AdminRedirect />} />
                  <Route
                    path="*"
                    element={
                      <div className="empty">
                        <h1>ページが見つかりません</h1>
                        <Link to="/">ホームに戻る</Link>
                      </div>
                    }
                  />
                </Routes>
              </motion.div>
            </AnimatePresence>
          )}
          <footer className="page-footer">
            <span>
              Roamigo<span className="brand-dot">.</span>
            </span>
            <small>地域と1対1の会話</small>
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
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    className="bottom-nav-active"
                    aria-hidden="true"
                    layoutId="mobile-navigation-surface"
                    transition={{
                      type: "spring",
                      stiffness: 430,
                      damping: 34,
                      mass: 0.75,
                    }}
                  />
                )}
                <n.icon size={20} />
                <span>
                  {n.label === "プロフィール"
                    ? "マイページ"
                    : n.label === "プロへの相談"
                      ? "相談"
                      : n.label}
                </span>
              </>
            )}
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
              「話せる人」から相手を選んで、1対1でメッセージを送れます。同じ相手との会話は、次の旅でも続けられます。イベントの企画はホームから確認できます。
            </p>
            <p>
              訪問ステータスはプロフィールの「訪問予定」で、左右にフリックするか矢印ボタンで切り替え、変更を保存します。
            </p>
            <p>
              気になる投稿は「通報」から運営へお知らせください。プロへの依頼は自分で内容と共有範囲を選んで送信できます。
            </p>
            <p>
              イベントは開催準備中です。日時・参加費・キャンセル条件は募集開始時にご案内します。
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
function NotesPage() {
  const { data } = useApp();
  const [params, setParams] = useSearchParams();
  const filter = params.get("category") || "すべて";
  const query = params.get("q") || "";
  function update(key: string, value: string) {
    const next = new URLSearchParams(window.location.search);
    if (!value || value === "すべて") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: key === "q", preventScrollReset: true });
  }
  const list = data.notes.filter(
    (n) =>
      (filter === "すべて" || n.category === filter) &&
      (!query ||
        (n.title + n.body + n.author)
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase())),
  );
  return (
    <div className="notes-library">
      <Heading eyebrow="NOTES" title="現地のメモ" />
      <div className="search-panel glass">
        <label htmlFor="local-search">話題・メモを検索</label>
        <div className="search-input">
          <Search size={18} aria-hidden="true" />
          <input
            id="local-search"
            value={query}
            onChange={(e) => update("q", e.target.value)}
            placeholder="テーマ、場所、投稿者…"
          />
          {query && (
            <button aria-label="検索をクリア" onClick={() => update("q", "")}>
              <X size={17} />
            </button>
          )}
        </div>
      </div>
      <section className="notes-section">
        <div className="filter-row" role="group" aria-label="現地メモのテーマ">
          {["すべて", "喫茶店", "古本屋", "街歩き"].map((f) => (
            <CheckChip
              key={f}
              selected={filter === f}
              onClick={() => update("category", f)}
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
                  <img
                    src={n.image}
                    alt=""
                    width={640}
                    height={400}
                    loading="lazy"
                  />
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
    </div>
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
function memberTone(id: string) {
  return ["sage", "apricot", "sky"][
    Array.from(id).reduce((sum, c) => sum + c.charCodeAt(0), 0) % 3
  ];
}
function RegionCover({ person }: { person: CommunityMember }) {
  const connection =
    person.connections.find((c) => c.status === "current") ||
    person.connections[0];
  const region = connection && getRegion(connection.regionId);
  const country = region?.parentId ? getRegion(region.parentId) : region;
  return (
    <div className="person-cover" aria-hidden="true">
      <span className="cover-country">
        <Globe2 size={13} />
        {country?.name || "Roamigo"}
      </span>
      <Globe2 className="cover-globe" strokeWidth={0.55} />
      <span className="cover-city">{region?.english || "Roamigo"}</span>
      <span className="cover-pearl">
        <MapPin size={23} strokeWidth={1.4} />
      </span>
    </div>
  );
}
function InterestIcon({ topic }: { topic: string }) {
  const Icon =
    topic === "喫茶店"
      ? Coffee
      : topic === "街歩き"
        ? Footprints
        : topic === "古本屋"
          ? BookOpen
          : topic === "写真"
            ? Camera
            : topic === "留学"
              ? GraduationCap
              : Globe2;
  return <Icon size={13} aria-hidden="true" />;
}
function MemberCard({
  person,
  index = 0,
}: {
  person: CommunityMember;
  index?: number;
}) {
  return (
    <motion.article
      className="person-card glass"
      data-tone={memberTone(person.id)}
      initial={{ opacity: 0, y: 20, scale: 0.975 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 28,
        delay: Math.min(index, 4) * 0.055,
      }}
      whileHover={{
        y: -5,
        transition: { type: "spring", stiffness: 350, damping: 28 },
      }}
      whileTap={{ scale: 0.993 }}
    >
      <RegionCover person={person} />
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
            {regionLabel(
              person.connections.find((c) => c.status === "current")
                ?.regionId || "",
            ) || "地域未登録"}
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
      <ParticipationSummary person={person} compact />
      <ResidenceLinks connections={person.connections} compact />
      <div className="person-interests">
        {person.interests.map((interest) => (
          <span key={interest}>
            <InterestIcon topic={interest} />
            {interest}
          </span>
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
    [showFilters, setShowFilters] = useState(false),
    [params, setParams] = useSearchParams();
  const axis = params.get("axis") || "",
    studyTopic = params.get("topic") || "",
    studyPlace = params.get("studyPlace") || "",
    localKind = params.get("localKind") || "";
  const nationality = params.get("nationality") || "",
    region = params.get("region") || "",
    place = params.get("place") || "",
    status = params.get("status") || "";
  const placeIds = new Set(
    data.people.flatMap((p) =>
      p.connections.flatMap((c) =>
        [c.regionId, getRegion(c.regionId)?.parentId].filter(
          (s): s is string => !!s,
        ),
      ),
    ),
  );
  const places = regionCatalog.filter((r) => placeIds.has(r.id));
  const appliedFilters = [
    { key: "nationality", value: nationality, label: nationality },
    { key: "region", value: region, label: region + "に興味" },
    { key: "place", value: place, label: regionLabel(place) },
    {
      key: "status",
      value: status,
      label: residenceLabels[status as keyof typeof residenceLabels] || status,
    },
  ].filter((item) => item.value);
  const countries = [
    ...new Set(data.people.map((p) => p.nationality).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "ja"));
  const regions = [
    ...new Set(data.people.flatMap((p) => p.interestedRegions)),
  ].sort((a, b) => a.localeCompare(b, "ja"));
  function filter(key: string, value: string) {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }
  const list = data.people.filter(
    (p) =>
      matchesMember(p, query, nationality, region, theme, place, status) &&
      matchesParticipation(p, axis, studyTopic, studyPlace, localKind),
  );
  return (
    <>
      <Heading eyebrow="PEOPLE" title="話せる人">
        <span className="pill">
          <MessageCircle size={14} />
          1対1の会話
        </span>
      </Heading>
      <DiscoveryAxes
        axis={axis}
        onChange={(next) => {
          setParams(next ? { axis: next } : {});
          setQuery("");
          setTheme("すべて");
        }}
      />
      <div className="people-tools glass">
        <div className="people-query-row">
          <label className="field">
            {axis === "alumni"
              ? "名前・留学経験・相談テーマ"
              : "名前・街・話したいこと"}
            <input
              type="search"
              value={query}
              placeholder={
                axis === "alumni"
                  ? "高校留学、学校生活、カナダ…"
                  : "台北、京都、喫茶店…"
              }
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button
            className="button subtle filter-toggle"
            aria-label={showFilters ? "絞り込みを閉じる" : "絞り込みを開く"}
            aria-expanded={showFilters}
            aria-controls="people-advanced-filters"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={17} />
            <span>絞り込み</span>
            {appliedFilters.length > 0 && (
              <span className="filter-count" aria-hidden="true">
                {appliedFilters.length}
              </span>
            )}
            <ChevronDown size={14} className={showFilters ? "is-open" : ""} />
          </button>
        </div>
        {appliedFilters.length > 0 && (
          <div className="applied-filters">
            {appliedFilters.map((item) => (
              <button
                key={item.key}
                aria-label={item.label + "の条件を解除"}
                onClick={() => filter(item.key, "")}
              >
                {item.label}
                <X size={12} />
              </button>
            ))}
          </div>
        )}
        <div id="people-advanced-filters">
          <AnimatePresence initial={false}>
            {showFilters && (
              <motion.div
                className="people-advanced-filters"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.2, 0.75, 0.25, 1] }}
              >
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
                      {region && !regions.includes(region) && (
                        <option>{region}</option>
                      )}
                      {regions.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="form-row discovery-filters residence-discovery">
                  <label className="field">
                    関わりのある地域
                    <select
                      value={place}
                      onChange={(e) => filter("place", e.target.value)}
                    >
                      <option value="">すべての地域</option>
                      {places.map((r) => (
                        <option key={r.id} value={r.id}>
                          {regionLabel(r.id)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    地域との関わり
                    <select
                      value={status}
                      onChange={(e) => filter("status", e.target.value)}
                    >
                      <option value="">すべての関わり</option>
                      {Object.entries(residenceLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {axis !== "alumni" && data.profile.interestedRegions.length > 0 && (
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
        {axis && (
          <div className="form-row axis-filter-panel">
            <label className="field">
              {axis === "alumni" ? "留学経験の国・地域" : "交流したい国・地域"}
              <select
                value={studyPlace}
                onChange={(e) => filter("studyPlace", e.target.value)}
              >
                <option value="">国は未定・すべて</option>
                {regionCatalog
                  .filter((r) => r.kind === "country")
                  .sort((a, b) => a.name.localeCompare(b.name, "ja"))
                  .map((r) => (
                    <option value={r.id} key={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </label>
            {axis === "alumni" ? (
              <label className="field">
                相談したいこと
                <select
                  value={studyTopic}
                  onChange={(e) => filter("topic", e.target.value)}
                >
                  <option value="">すべての相談テーマ</option>
                  {studyTopics.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="field">
                交流する相手
                <select
                  value={localKind}
                  onChange={(e) => filter("localKind", e.target.value)}
                >
                  <option value="">現地の人すべて</option>
                  {Object.entries(localKinds).map(([v, l]) => (
                    <option value={v} key={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
        {axis === "alumni" && (
          <p className="axis-help">
            <GraduationCap size={16} />
            留学した場所で探せます。経験は本人の申告です。
          </p>
        )}
        <div className="filter-row">
          {(axis === "alumni"
            ? []
            : ["すべて", "喫茶店", "街歩き", "古本屋", "写真", "留学"]
          ).map((s) => (
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
          {(query ||
            nationality ||
            region ||
            place ||
            status ||
            theme !== "すべて" ||
            studyTopic ||
            studyPlace ||
            localKind) && (
            <button
              onClick={() => {
                setQuery("");
                setTheme("すべて");
                setParams(axis ? { axis } : {});
              }}
            >
              絞り込みを解除
              <X size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="people-grid">
        {list.map((p, index) => (
          <MemberCard key={p.id} person={p} index={index} />
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
      <article
        className="member-profile glass"
        data-tone={memberTone(person.id)}
      >
        <RegionCover person={person} />
        <div className="member-profile-top">
          <Avatar
            name={person.name}
            color={person.color}
            src={person.avatarUrl}
          />
          <span className="pill">
            <MapPin size={13} />
            {person.connections[0]
              ? connectionLabel(
                  person.connections.find((c) => c.status === "current") ||
                    person.connections[0],
                )
              : "地域未登録"}
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
        <ParticipationSummary person={person} />
        <section className="member-regions">
          <h2>地域との関わり</h2>
          {person.connections.length ? (
            <ResidenceLinks connections={person.connections} />
          ) : (
            <p className="muted">まだ登録されていません</p>
          )}
        </section>
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
              <dd>
                {regionLabel(person.visitRegionId)}{" "}
                {dateLabel(person.visitDate)}
              </dd>
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
    [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "group" ? "group" : "direct";
  function setTab(next: string) {
    const nextParams = new URLSearchParams(params);
    if (next === "group") nextParams.set("tab", "group");
    else nextParams.delete("tab");
    setParams(nextParams);
  }
  function onTabKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const next =
      e.key === "Home"
        ? "direct"
        : e.key === "End"
          ? "group"
          : tab === "direct"
            ? "group"
            : "direct";
    setTab(next);
    document.getElementById(next + "-tab")?.focus();
  }
  const query = params.get("q") || "",
    onlyUnread = params.get("unread") === "1";
  function filterParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }
  const direct = data.rooms.filter((r) => r.kind === "direct"),
    groups = data.rooms.filter((r) => r.kind !== "direct");
  const matches = (r: (typeof data.rooms)[number]) =>
    (!onlyUnread || r.unread > 0) &&
    (!query ||
      `${r.title} ${r.messages.at(-1)?.body || ""}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()));
  const visibleDirect = direct.filter(matches),
    visibleGroups = groups.filter(matches);
  return (
    <>
      <Heading eyebrow="YOUR CONVERSATIONS" title="メッセージ">
        <Link className="button subtle small-button" to="/people">
          <Plus size={16} />
          相手を探す
        </Link>
      </Heading>
      <div
        className="conversation-tabs"
        role="tablist"
        aria-label="会話の種類"
        onKeyDown={onTabKey}
      >
        <button
          role="tab"
          id="direct-tab"
          aria-controls="conversations-panel"
          aria-selected={tab === "direct"}
          tabIndex={tab === "direct" ? 0 : -1}
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
          tabIndex={tab === "group" ? 0 : -1}
          onClick={() => setTab("group")}
          className={tab === "group" ? "active" : ""}
        >
          イベントの小部屋<span>{groups.length}</span>
        </button>
      </div>
      <div className="conversation-tools">
        <label className="field">
          <span className="sr-only">会話を検索</span>
          <input
            name="conversation-search"
            type="search"
            value={query}
            autoComplete="off"
            onChange={(e) => filterParam("q", e.target.value)}
            placeholder="名前・メッセージを検索…"
          />
        </label>
        <CheckChip
          selected={onlyUnread}
          onClick={() => filterParam("unread", onlyUnread ? "" : "1")}
        >
          <Bell size={15} />
          未読のみ
        </CheckChip>
      </div>
      <div
        id="conversations-panel"
        role="tabpanel"
        aria-labelledby={tab === "direct" ? "direct-tab" : "group-tab"}
      >
        {tab === "direct" ? (
          <div className="conversation-list">
            {visibleDirect.map((r) => (
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
            {!visibleDirect.length && direct.length > 0 && (
              <Empty>条件に合う会話はありません</Empty>
            )}
            {!direct.length && (
              <Empty>
                まだ会話はありません<Link to="/people">話せる人を探す</Link>
              </Empty>
            )}
          </div>
        ) : (
          <div className="rooms-grid">
            {visibleGroups.map((r) => (
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
            {!visibleGroups.length && groups.length > 0 && (
              <Empty>条件に合う小部屋はありません</Empty>
            )}
            {!groups.length && (
              <Empty>
                イベント参加後の小部屋が表示されます。
                <Link to="/talks">イベントを見る</Link>
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
              "イベントの小部屋"
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
      <Link to="/notes" className="back-link">
        <ArrowLeft size={16} />
        現地のメモ
      </Link>
      <div className="note-detail glass">
        <img
          className="note-detail-photo"
          src={n.image}
          alt={n.title}
          width={1200}
          height={600}
        />
        <article>
          <div className="eyebrow">{n.category}</div>
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
    [success, setSuccess] = useState(false),
    formHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (selected) {
      formHeading.current?.focus({ preventScroll: true });
      formHeading.current?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    }
  }, [selected]);
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
          あなたが依頼したときだけ、選んだ事業者に相談が届きます。
        </p>
      </div>
      {data.mode === "production" && !data.providers?.length && (
        <Empty>相談を受付中の事業者はいません</Empty>
      )}
      <div className="providers-grid" aria-label="相談できるプロ">
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
                aria-pressed={selected === p.id}
                onClick={() => {
                  if (guard()) {
                    setSelected(p.id);
                    if (selected === p.id)
                      formHeading.current?.scrollIntoView({
                        block: "start",
                        behavior: "smooth",
                      });
                  }
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
        <form
          className="consult-form glass"
          onSubmit={submit}
          id="consult-request"
        >
          <div className="form-section-heading">
            <span className="action-icon">
              <Compass size={22} />
            </span>
            <div>
              <h2 ref={formHeading} tabIndex={-1}>
                相談内容
              </h2>
              <p>選んだプロと運営に届きます。</p>
            </div>
          </div>
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
              name="title"
              autoComplete="off"
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
function GoogleMark() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.7 2.9-4.2 2.9-7.4Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.3-2.5c-.9.6-2 1-3.3 1-2.6 0-4.8-1.7-5.6-4H3v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 14.1a6 6 0 0 1 0-4.2V7.3H3a10 10 0 0 0 0 9.4l3.4-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.3l3.4 2.6c.8-2.3 3-4 5.6-4Z"
      />
    </svg>
  );
}
function ProfilePage() {
  const { hash } = useLocation();
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
    const participationMessage =
      p.participation && participationError(p.participation);
    if (participationMessage) {
      toast(participationMessage);
      return;
    }
    const residenceError = connectionError(p.connections);
    if (residenceError) {
      toast(residenceError);
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
        participation: p.participation || participationOf(p),
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
  const dirty =
    JSON.stringify(p) !== JSON.stringify(data.profile) ||
    regionsText !== data.profile.interestedRegions.join("、") ||
    !!photo ||
    removePhoto;
  const [loginParams, setLoginParams] = useSearchParams();
  const loginMessages: Record<string, string> = {
    cancelled: "ログインをキャンセルしました。もう一度Googleで続けられます。",
    expired:
      "認証の有効期限が切れました。この画面からログインをやり直してください。",
    not_invited:
      "このGoogleアカウントは招待されていません。招待されたアカウントを選ぶか、運営へご確認ください。",
    failed: "Google認証を完了できませんでした。もう一度お試しください。",
  };
  const loginReason = loginParams.get("login") || "";
  const loginMessage = Object.hasOwn(loginMessages, loginReason)
    ? loginMessages[loginReason]
    : undefined;
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (dirty) event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  return (
    <>
      <Heading eyebrow="YOUR PROFILE" title="プロフィール" />
      {loginMessage && (
        <div className="login-feedback glass" role="alert">
          <AlertCircle size={22} />
          <p>{loginMessage}</p>
          <button
            type="button"
            className="icon-button"
            aria-label="ログイン通知を閉じる"
            onClick={() => setLoginParams({}, { replace: true })}
          >
            <X size={18} />
          </button>
        </div>
      )}
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
            <a href="/api/auth/google" className="button google-button">
              <GoogleMark />
              Googleで続ける
              <ArrowRight size={17} />
            </a>
          ) : (
            <>
              <button className="button google-button" disabled>
                Google認証は未接続です
              </button>
              <small className="login-setup-note">
                <AlertCircle size={16} />
                運営側でGoogle認証の接続設定が必要です。
              </small>
            </>
          )}
        </div>
      )}
      <nav className="profile-section-nav" aria-label="プロフィールの項目">
        {[
          { id: "profile-basic", label: "基本情報", icon: Camera },
          {
            id: "profile-participation",
            label: "参加する立場",
            icon: GraduationCap,
          },
          { id: "profile-residence", label: "居住・滞在", icon: MapPin },
          { id: "profile-interests", label: "興味", icon: Coffee },
          { id: "profile-visit", label: "訪問予定", icon: CalendarDays },
          { id: "profile-conversation", label: "会話", icon: MessageCircle },
        ].map((section) => (
          <a
            key={section.id}
            href={"#" + section.id}
            aria-current={
              (hash || "#profile-basic") === "#" + section.id
                ? "location"
                : undefined
            }
          >
            <section.icon size={16} />
            {section.label}
          </a>
        ))}
      </nav>
      <form className="profile-form" onSubmit={submit}>
        <section
          className="profile-section glass"
          id="profile-basic"
          aria-labelledby="profile-basic-title"
        >
          <div className="form-section-heading">
            <span className="action-icon">
              <Camera size={22} />
            </span>
            <div>
              <h2 id="profile-basic-title">基本情報</h2>
              <p>名前・写真・国籍</p>
            </div>
          </div>
          <div className="profile-identity">
            <Avatar
              name={p.name || "旅"}
              color="#dce5dc"
              src={photo ? photoPreview : removePhoto ? "" : p.avatarUrl}
            />
            <div>
              <h2>{p.name || "プロフィール設定"}</h2>
              <span className="pill">
                {regionLabel(
                  p.connections.find((c) => c.status === "current")?.regionId ||
                    "",
                ) || "居住地域は任意で登録"}
              </span>
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
            <label
              className="button subtle small-button"
              htmlFor="profile-photo"
            >
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
              name="name"
              autoComplete="nickname"
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
                name="nationality"
                autoComplete="off"
                value={p.nationality}
                placeholder="例：日本"
                onChange={(e) => setP({ ...p, nationality: e.target.value })}
              />
            </label>
          </div>
        </section>
        <ParticipationEditor
          value={p.participation}
          acceptsMessages={p.acceptsMessages}
          onChange={(participation) => setP({ ...p, participation })}
        />
        <section
          className="profile-section glass"
          id="profile-residence"
          aria-labelledby="profile-residence-title"
        >
          <div className="form-section-heading">
            <span className="action-icon">
              <MapPin size={22} />
            </span>
            <div>
              <h2 id="profile-residence-title">居住・滞在歴</h2>
              <p>国・地域のみでも登録できます。すべて任意です。</p>
            </div>
          </div>
          {p.city && !p.connections.some((c) => c.status === "current") && (
            <p className="legacy-city muted">
              以前登録した街：{p.city}。居住地域を選ぶと地域に紐づきます。
            </p>
          )}
          <ResidenceEditor
            value={p.connections}
            onChange={(connections) => {
              const current = connections.find((c) => c.status === "current"),
                r = current && getRegion(current.regionId);
              setP({
                ...p,
                connections,
                city:
                  r?.kind === "city"
                    ? r.name
                    : current ||
                        p.connections.some((c) => c.status === "current")
                      ? ""
                      : p.city,
              });
            }}
          />
        </section>
        <section
          className="profile-section glass"
          id="profile-interests"
          aria-labelledby="profile-interests-title"
        >
          <div className="form-section-heading">
            <span className="action-icon">
              <Coffee size={22} />
            </span>
            <div>
              <h2 id="profile-interests-title">興味・自己紹介</h2>
              <p>話しかけるきっかけになります。</p>
            </div>
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
          <div className="field">
            <span>興味・話せるテーマ</span>
            <div className="filter-row">
              {["喫茶店", "街歩き", "古本屋", "写真", "文化", "留学"].map(
                (s) => (
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
                ),
              )}
            </div>
          </div>
        </section>
        <section
          className="profile-section glass"
          id="profile-visit"
          aria-labelledby="profile-visit-title"
        >
          <div className="form-section-heading">
            <span className="action-icon">
              <CalendarDays size={22} />
            </span>
            <div>
              <h2 id="profile-visit-title">訪問予定・話せる時間</h2>
              <p>予定が決まっている範囲で登録できます。</p>
            </div>
          </div>
          <VisitStatus
            value={p.visitStatus}
            onChange={(visitStatus) =>
              setP((current) => ({ ...current, visitStatus }))
            }
          />
          <RegionPicker
            label="次の訪問先"
            value={p.visitRegionId}
            onChange={(visitRegionId) => setP({ ...p, visitRegionId })}
          />
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
        </section>
        <section
          className="profile-section glass"
          id="profile-conversation"
          aria-labelledby="profile-conversation-title"
        >
          <div className="form-section-heading">
            <span className="action-icon">
              <MessageCircle size={22} />
            </span>
            <div>
              <h2 id="profile-conversation-title">会話の受付</h2>
            </div>
          </div>
          <label className="conversation-opt-in">
            <input
              type="checkbox"
              checked={!!p.acceptsMessages}
              onChange={(e) =>
                setP({
                  ...p,
                  participation: p.participation || participationOf(p),
                  acceptsMessages: e.target.checked,
                })
              }
            />
            <span>
              <strong>新しい1対1の会話を受け付ける</strong>
              <small>
                オンにすると、基本情報・居住／滞在歴・写真と、選択した立場の留学経験や交流情報が会員の「話せる人」に表示されます。選択を外した立場の情報は非公開です。オフにしても、始めた会話は続けられます。
              </small>
            </span>
          </label>
        </section>
        <div className="profile-savebar glass">
          <span className={dirty ? "unsaved" : ""}>
            <span className="save-dot" />
            {dirty ? "未保存の変更があります" : "保存済み"}
          </span>
          <button className="button primary" disabled={busy || processingPhoto}>
            {busy ? "保存中…" : "変更を保存"}
            <Check size={16} />
          </button>
        </div>
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
function AdminRedirect() {
  const origin =
    import.meta.env.VITE_ADMIN_ORIGIN ||
    (import.meta.env.DEV
      ? "http://127.0.0.1:5174"
      : "https://machi-admin.danaoki30.workers.dev");
  useEffect(() => {
    window.location.replace(origin);
  }, [origin]);
  return (
    <Heading eyebrow="OPERATIONS" title="運営管理へ移動しています">
      <a className="button primary" href={origin}>
        管理サイトを開く
      </a>
    </Heading>
  );
}
