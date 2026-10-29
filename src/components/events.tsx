import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Globe2,
  GraduationCap,
  Languages,
  MapPin,
  MessageCircle,
  Search,
  Ticket,
  Users,
  Video,
  X,
} from "lucide-react";
import {
  eventFromTalk,
  eventPlans,
  matchesEvent,
  type EventPlan,
} from "../lib/events";
import { useApp } from "../lib/store";
import { Empty, Heading, SectionTitle } from "./ui";

const savedKey = "roamigo-saved-events";
function readSaved(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(savedKey) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}
function useSavedEvents() {
  const [saved, setSaved] = useState(readSaved);
  const { toast } = useApp();
  function toggle(id: string) {
    const next = saved.includes(id)
      ? saved.filter((v) => v !== id)
      : [...saved, id];
    try {
      localStorage.setItem(savedKey, JSON.stringify(next));
      setSaved(next);
      toast(
        next.includes(id)
          ? "イベントをこの端末に保存しました"
          : "イベントの保存を解除しました",
      );
    } catch {
      toast("この端末に保存できませんでした");
    }
  }
  return { saved, toggle };
}
function EventArtwork({
  event,
  large = false,
}: {
  event: EventPlan;
  large?: boolean;
}) {
  const Icon = event.axis === "alumni" ? GraduationCap : Globe2;
  return (
    <div
      className={`event-art ${large ? "event-art-large" : ""}`}
      data-axis={event.axis}
      aria-hidden="true"
    >
      <div className="event-art-grid" />
      <span className="event-art-orbit orbit-one" />
      <span className="event-art-orbit orbit-two" />
      <span className="event-art-label">
        {event.axis === "alumni" ? "STUDY ABROAD" : "LOCAL EXCHANGE"}
      </span>
      <div className="event-art-emblem">
        <Icon strokeWidth={1.15} />
      </div>
      <div className="event-art-stamp">
        <span>ROAMIGO</span>
        <Icon size={18} />
        <span>COMMUNITY</span>
      </div>
      <span className="event-art-number">
        {event.id.startsWith("t") ? `0${event.id.slice(1)}` : "R"}
      </span>
      <span className="event-art-format">
        {event.format === "online" ? <Video size={13} /> : <MapPin size={13} />}
        {event.format === "online" ? "ONLINE" : "IN PERSON"}
      </span>
    </div>
  );
}
export function EventCard({
  event,
  compact = false,
  index = 0,
}: {
  event: EventPlan;
  compact?: boolean;
  index?: number;
}) {
  return (
    <motion.article
      className={`event-card glass ${compact ? "event-card-compact" : ""}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index, 3) * 0.05 }}
    >
      <Link to={`/talks/${event.id}`} className="event-card-link">
        <EventArtwork event={event} />
        <div className="event-card-body">
          <div className="event-card-kicker">
            <span>{event.type}</span>
            <span className="event-status">
              <span />
              開催準備中
            </span>
          </div>
          <h3>{event.title}</h3>
          <p className="event-card-region">
            <MapPin size={14} />
            {event.region}
          </p>
          <div className="event-card-meta">
            <span>
              {event.format === "online" ? (
                <Video size={14} />
              ) : (
                <MapPin size={14} />
              )}
              {event.format === "online" ? "オンライン" : "対面"}
            </span>
            <span>
              <Clock3 size={14} />
              {event.duration}
            </span>
            <span>
              <Users size={14} />
              {event.size}
            </span>
          </div>
          <div className="event-card-footer">
            <span>
              <CalendarDays size={15} />
              {event.schedule}
            </span>
            <ArrowUpRight size={19} />
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
export function EventPreview() {
  return (
    <section className="event-home-preview">
      <SectionTitle title="イベント" to="/talks" />
      <div className="event-preview-grid">
        {eventPlans.slice(0, 2).map((e, index) => (
          <EventCard key={e.id} event={e} compact index={index} />
        ))}
      </div>
    </section>
  );
}
function EventSavedButton({
  event,
  saved,
  toggle,
}: {
  event: EventPlan;
  saved: string[];
  toggle: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className="button subtle event-save-button"
      aria-label={
        saved.includes(event.id)
          ? "イベントは保存済み。保存を解除"
          : "イベントを保存する"
      }
      aria-pressed={saved.includes(event.id)}
      onClick={() => toggle(event.id)}
    >
      <Bookmark
        size={18}
        fill={saved.includes(event.id) ? "currentColor" : "none"}
      />
      {saved.includes(event.id) ? "保存済み" : "保存する"}
    </button>
  );
}
export function EventsPage() {
  const [params, setParams] = useSearchParams();
  const { data } = useApp();
  const { saved } = useSavedEvents();
  const axis = params.get("axis") || "",
    format = params.get("format") || "",
    query = params.get("q") || "",
    savedOnly = params.get("saved") === "1";
  const catalogue = [
    ...eventPlans,
    ...(data.mode === "production"
      ? data.talks
          .filter((t) => !eventPlans.some((e) => e.id === t.id))
          .map(eventFromTalk)
      : []),
  ];
  const events = catalogue.filter(
    (e) =>
      matchesEvent(e, axis, format, query) &&
      (!savedOnly || saved.includes(e.id)),
  );
  function filter(key: string, value: string) {
    // Use the latest URL when two controls change before the next render.
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }
  return (
    <div className="events-page">
      <Heading eyebrow="EVENTS" title="イベント">
        <span className="event-page-status">
          <span />
          開催に向けて準備中
        </span>
      </Heading>
      <div className="event-intro glass">
        <span className="event-intro-icon">
          <Ticket size={24} strokeWidth={1.5} />
        </span>
        <div>
          <strong>留学相談と、現地での交流</strong>
          <p>企画サンプルを掲載しています。申込受付は準備中です。</p>
        </div>
        <span className="event-intro-count">
          {String(eventPlans.length).padStart(2, "0")}
          <span>PLANS</span>
        </span>
      </div>
      <section className="event-discovery glass" aria-label="イベントを探す">
        <div
          className="event-axis-tabs"
          role="group"
          aria-label="イベントの目的"
        >
          {[
            ["", "すべて"],
            ["alumni", "留学相談"],
            ["local", "現地交流"],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={axis === value}
              className={axis === value ? "selected" : ""}
              onClick={() => filter("axis", value)}
            >
              {value === "alumni" ? (
                <GraduationCap size={17} />
              ) : value === "local" ? (
                <Globe2 size={17} />
              ) : (
                <CalendarDays size={17} />
              )}
              {label}
            </button>
          ))}
        </div>
        <div className="event-filter-fields">
          <label className="field event-search">
            <span className="event-filter-label">イベントを検索</span>
            <span className="event-search-input">
              <Search size={18} />
              <input
                type="search"
                value={query}
                placeholder="学校生活、友達づくり、国・地域"
                onChange={(e) => filter("q", e.target.value)}
              />
            </span>
          </label>
          <label className="field">
            <span className="event-filter-label">開催形式</span>
            <select
              value={format}
              onChange={(e) => filter("format", e.target.value)}
            >
              <option value="">すべての形式</option>
              <option value="online">オンライン</option>
              <option value="onsite">対面</option>
            </select>
          </label>
          <button
            type="button"
            className="button subtle event-saved-filter"
            aria-pressed={savedOnly}
            onClick={() => filter("saved", savedOnly ? "" : "1")}
          >
            <Bookmark size={17} />
            保存済み
            <span>{catalogue.filter((e) => saved.includes(e.id)).length}</span>
          </button>
        </div>
      </section>
      <div className="event-result-heading">
        <h2>
          {savedOnly ? "保存したイベント" : "企画中のイベント"}
          <span>{events.length}</span>
        </h2>
        {(axis || format || query || savedOnly) && (
          <button
            type="button"
            onClick={() => setParams({}, { replace: true })}
          >
            条件を解除
            <X size={14} />
          </button>
        )}
      </div>
      <div className="event-grid">
        {events.map((event, index) => (
          <EventCard key={event.id} event={event} index={index} />
        ))}
      </div>
      {!events.length && (
        <div className="event-empty glass">
          <Search size={26} />
          <h3>
            {savedOnly
              ? "保存したイベントはありません"
              : "条件に合うイベントはありません"}
          </h3>
          <button
            type="button"
            className="button subtle"
            onClick={() => setParams({}, { replace: true })}
          >
            すべてのイベントを見る
            <ArrowRight size={16} />
          </button>
        </div>
      )}
      {!!data.bookings.length && (
        <section className="event-existing-bookings">
          <SectionTitle title="これまでの申込み" />
          <div className="booking-list">
            {data.bookings.map((b) => (
              <div key={b.id} className="booking-row glass">
                <Ticket size={20} />
                <div>
                  <strong>
                    {data.talks.find((t) => t.id === b.talkId)?.title ||
                      "以前のイベント"}
                  </strong>
                  <small>保存されている申込み記録</small>
                </div>
                <span className="pill">
                  {
                    {
                      confirmed: "参加確定",
                      pending: "入金待ち",
                      cancelled: "キャンセル済み",
                      attended: "参加済み",
                      refund_pending: "返金手続き中",
                      refunded: "返金済み",
                    }[b.status]
                  }
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
export function EventDetailPage() {
  const { id } = useParams();
  const { data } = useApp();
  const { saved, toggle } = useSavedEvents();
  const old = data.talks.find((t) => t.id === id);
  const event =
    eventPlans.find((e) => e.id === id) ||
    (old ? eventFromTalk(old) : undefined);
  if (!event)
    return (
      <Empty>
        イベントが見つかりません<Link to="/talks">イベント一覧へ</Link>
      </Empty>
    );
  const peopleParams = new URLSearchParams({ axis: event.axis });
  if (event.regionId) peopleParams.set("studyPlace", event.regionId);
  const related = eventPlans
    .filter((e) => e.id !== event.id)
    .sort(
      (a, b) => Number(b.axis === event.axis) - Number(a.axis === event.axis),
    )
    .slice(0, 2);
  return (
    <div className="event-detail-page">
      <div className="event-detail-breadcrumb">
        <Link to="/talks">
          <ArrowLeft size={16} />
          イベント一覧
        </Link>
        <ChevronRight size={13} />
        <span>{event.type}</span>
      </div>
      <div className="event-detail-layout">
        <section className="event-detail-hero glass">
          <EventArtwork event={event} large />
          <div className="event-detail-heading">
            <div className="event-detail-kicker">
              <span className="event-axis-label">
                {event.axis === "alumni" ? (
                  <GraduationCap size={15} />
                ) : (
                  <Globe2 size={15} />
                )}
                {event.type}
              </span>
              <span className="event-status">
                <span />
                開催準備中
              </span>
            </div>
            <h1>{event.title}</h1>
            <p>
              <MapPin size={16} />
              {event.region}
            </p>
            <div className="event-detail-tags">
              <span>
                {event.format === "online" ? (
                  <Video size={14} />
                ) : (
                  <MapPin size={14} />
                )}
                {event.format === "online" ? "オンライン" : "対面"}
              </span>
              <span>
                <Clock3 size={14} />
                {event.duration}
              </span>
              <span>
                <Users size={14} />
                {event.size}
              </span>
            </div>
          </div>
        </section>
        <aside className="event-attendance glass" aria-label="参加について">
          <div className="event-attendance-header">
            <Ticket size={22} />
            <span>参加について</span>
            {event.template && <small>企画サンプル</small>}
          </div>
          <div className="event-attendance-state">
            <CalendarDays size={28} strokeWidth={1.3} />
            <h2>受付準備中</h2>
            <p>日時・料金・主催者が決まり次第、募集内容を掲載します。</p>
          </div>
          <dl className="event-attendance-facts">
            <div>
              <dt>開催日時</dt>
              <dd>{event.schedule}</dd>
            </div>
            <div>
              <dt>参加費</dt>
              <dd>未定</dd>
            </div>
            <div>
              <dt>人数</dt>
              <dd>{event.size}</dd>
            </div>
          </dl>
          <button type="button" className="button primary full" disabled>
            募集開始前です
          </button>
          <EventSavedButton event={event} saved={saved} toggle={toggle} />
          <small className="event-save-help">
            <Check size={13} />
            保存はこの端末のみ。通知は送信されません。
          </small>
        </aside>
        <div className="event-detail-main">
          <section className="event-detail-section glass">
            <div className="event-section-title">
              <span>01</span>
              <h2>話すこと・体験すること</h2>
            </div>
            <p>{event.description}</p>
            <div className="event-topic-list">
              {event.topics.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <div className="event-audience">
              <Users size={19} />
              <div>
                <strong>こんな人に</strong>
                <p>{event.audience}</p>
              </div>
            </div>
          </section>
          {!!event.agenda.length && (
            <section className="event-detail-section glass">
              <div className="event-section-title">
                <span>02</span>
                <h2>
                  当日の流れ<span>案</span>
                </h2>
              </div>
              <ol className="event-agenda">
                {event.agenda.map((step) => (
                  <li key={step.title}>
                    <span className="event-agenda-time">{step.time}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
          <section className="event-detail-section glass">
            <div className="event-section-title">
              <span>{event.agenda.length ? "03" : "02"}</span>
              <h2>開催情報</h2>
            </div>
            <dl className="event-facts">
              <div>
                <dt>
                  <CalendarDays size={17} />
                  日時
                </dt>
                <dd>{event.schedule}</dd>
              </div>
              <div>
                <dt>
                  {event.format === "online" ? (
                    <Video size={17} />
                  ) : (
                    <MapPin size={17} />
                  )}
                  場所
                </dt>
                <dd>
                  {event.format === "online"
                    ? "オンライン・参加方法は募集開始時に案内"
                    : `${event.region}・集合場所を調整中`}
                </dd>
              </div>
              <div>
                <dt>
                  <Languages size={17} />
                  言語
                </dt>
                <dd>{event.language}</dd>
              </div>
              <div>
                <dt>
                  <Users size={17} />
                  主催・進行
                </dt>
                <dd>{event.host}</dd>
              </div>
              <div>
                <dt>
                  <Ticket size={17} />
                  キャンセル
                </dt>
                <dd>料金とあわせて募集開始時に案内</dd>
              </div>
            </dl>
          </section>
          <section className="event-people-link glass">
            <span className="event-people-icon">
              <MessageCircle size={23} />
            </span>
            <div>
              <h2>
                {event.axis === "alumni"
                  ? "留学経験者に聞いてみる"
                  : "現地の人と話してみる"}
              </h2>
              <p>プロフィールから、話したい相手を探せます。</p>
            </div>
            <Link to={`/people?${peopleParams}`} className="button subtle">
              話せる人を見る
              <ArrowUpRight size={16} />
            </Link>
          </section>
        </div>
      </div>
      <section className="event-related">
        <SectionTitle title="ほかのイベント" to="/talks" />
        <div className="event-grid">
          {related.map((e, index) => (
            <EventCard key={e.id} event={e} index={index} />
          ))}
        </div>
      </section>
    </div>
  );
}
