// 留学エージェント向けの画面（ホーム・受け取った相談・掲載情報の編集）と、
// 利用者向けのエージェント紹介ページ、相談ごとのやり取り画面。
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CircleHelp,
  Clock,
  ExternalLink,
  Eye,
  Facebook,
  FileText,
  Globe,
  Inbox,
  Instagram,
  Link2,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  Presentation,
  Send,
  ShieldCheck,
  Trash2,
  Video,
  Wallet,
  Youtube,
} from "lucide-react";
import { api, useApp } from "../lib/store";
import { providers as sampleAgents } from "../lib/data";
import {
  AUDIENCES,
  CONSULT_STATUS_AGENT,
  CONSULT_STATUS_USER,
  FEE_TYPES,
  LINK_KINDS,
  MATERIAL_KINDS,
  METHODS,
  PROGRAMS,
  SEMINAR_FORMATS,
  SERVICES,
  completeness,
  emptyAgentDetails,
  safeUrl,
  upcomingSeminars,
  type AgentDetails,
  type AgentLink,
  type AgentMaterial,
  type AgentSeminar,
  type PublicAgent,
} from "../lib/agents";
import { Avatar, Empty, Heading, Skeleton } from "./ui";

/* ---------- 共通 ---------- */
function useLoad<T>(path: string | null) {
  const [state, set] = useState<{ data?: T; error?: string; loading: boolean }>(
    { loading: !!path },
  );
  const load = useCallback(async () => {
    if (!path) return;
    try {
      set({ data: await api<T>(path), loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  }, [path]);
  useEffect(() => {
    void load();
  }, [load]);
  return { ...state, reload: load };
}
function Back({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="back-link">
      <ArrowLeft size={16} />
      {children}
    </Link>
  );
}
function Failure({ message }: { message: string }) {
  return (
    <div className="empty glass" role="alert">
      <h2>読み込めませんでした</h2>
      <p>{message}</p>
    </div>
  );
}
function Out({ href, children }: { href: string; children: ReactNode }) {
  if (!safeUrl(href)) return <>{children}</>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow ugc">
      {children}
      <ExternalLink size={13} aria-label="（新しいタブで開きます）" />
    </a>
  );
}
const fmtDate = (d: string) =>
  d
    ? new Intl.DateTimeFormat("ja-JP", {
        month: "long",
        day: "numeric",
        weekday: "short",
        timeZone: "Asia/Tokyo",
      }).format(new Date(d + "T12:00:00+09:00"))
    : "";
const fmtTime = (s: string) =>
  s
    ? new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z").toLocaleString(
        "ja-JP",
        {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Tokyo",
        },
      )
    : "";
const linkIcon = (kind: string) =>
  ({
    instagram: <Instagram size={16} />,
    youtube: <Youtube size={16} />,
    facebook: <Facebook size={16} />,
  })[kind] || <Link2 size={16} />;
const materialIcon = (kind: string) =>
  ({
    slide: <Presentation size={18} />,
    video: <Video size={18} />,
    page: <Globe size={18} />,
  })[kind] || <FileText size={18} />;
export const isAgent = (role?: string) => role === "provider";

/* ---------- 利用者向け：相談一覧のカードに載せる要約 ---------- */
export function AgentCardSummary({ agent }: { agent: PublicAgent }) {
  const d = agent.details,
    next = upcomingSeminars(d)[0];
  return (
    <div className="agent-card-summary">
      {d.tagline && <p className="agent-tagline">{d.tagline}</p>}
      {(d.countries.length > 0 || d.programs.length > 0) && (
        <div className="tags">
          {[...d.countries.slice(0, 4), ...d.programs.slice(0, 2)].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      )}
      {next && (
        <p className="agent-next">
          <CalendarDays size={14} />
          次の説明会：{fmtDate(next.date)} {next.time}
        </p>
      )}
      <Link to={"/agents/" + agent.id} className="agent-more">
        詳しく見る（説明会・資料・リンク）
        <ArrowUpRight size={14} />
      </Link>
    </div>
  );
}

/* ---------- 利用者向け：エージェント紹介ページ ---------- */
function Section({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="agent-section glass" aria-labelledby={id}>
      <h2 id={id}>
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}
function Dl({ rows }: { rows: [string, ReactNode][] }) {
  const shown = rows.filter(([, v]) => v);
  if (!shown.length) return null;
  return (
    <dl className="agent-dl">
      {shown.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
function Chips({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="agent-chips">
      <h3>{label}</h3>
      <div className="tags">
        {items.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  );
}
function SeminarItem({ s }: { s: AgentSeminar }) {
  return (
    <li className="agent-seminar">
      <span className="agent-seminar-date">
        <strong>{fmtDate(s.date)}</strong>
        <small>{s.time}</small>
      </span>
      <span>
        <strong>{s.title}</strong>
        <small>
          {SEMINAR_FORMATS[s.format]}
          {s.place && "・" + s.place}
        </small>
        {s.note && <small>{s.note}</small>}
        {s.url && <Out href={s.url}>申し込み・詳細</Out>}
      </span>
    </li>
  );
}
export function AgentProfileView({
  agent,
  own = false,
}: {
  agent: PublicAgent;
  own?: boolean;
}) {
  const d = agent.details,
    seminars = upcomingSeminars(d);
  const hasCompany = d.founded || d.track || d.memberships || d.license;
  return (
    <article className="agent-page">
      <header className="agent-hero glass">
        <Avatar
          name={agent.initial || agent.organization || agent.name}
          color={agent.color}
          src={agent.avatarUrl}
        />
        <div>
          <h1>{agent.organization || agent.name}</h1>
          <p className="provider-affiliation">
            担当：{agent.name}
            {d.staffTitle && `（${d.staffTitle}）`}
          </p>
          {agent.verified ? (
            <span className="provider-badge">
              <ShieldCheck size={12} />
              確認済みエージェント
            </span>
          ) : (
            <span className="session-badge">
              運営の確認前（まだ公開されていません）
            </span>
          )}
          {d.tagline && <p className="agent-tagline">{d.tagline}</p>}
          <p className="muted">{agent.theme}</p>
        </div>
        <div className="agent-hero-actions">
          {own ? (
            <Link to="/agent/profile" className="button primary">
              <Pencil size={16} />
              掲載情報を編集
            </Link>
          ) : (
            <Link
              to={"/consult?agent=" + encodeURIComponent(agent.id)}
              className="button primary"
            >
              このエージェントに相談する
              <ArrowUpRight size={16} />
            </Link>
          )}
          <small>Roamigoからの相談は無料です</small>
        </div>
      </header>

      {(agent.bio || d.staffMessage) && (
        <Section id="agent-about" title="紹介" icon={<Building2 size={18} />}>
          {agent.bio && <p className="prose">{agent.bio}</p>}
          {d.staffMessage && (
            <blockquote className="agent-quote">
              <p>{d.staffMessage}</p>
              <cite>担当 {agent.name}</cite>
            </blockquote>
          )}
        </Section>
      )}

      {(d.countries.length ||
        d.programs.length ||
        d.audiences.length ||
        d.services.length) > 0 && (
        <Section
          id="agent-coverage"
          title="対応している留学"
          icon={<Globe size={18} />}
        >
          <Chips label="国・地域" items={d.countries} />
          <Chips label="留学の種類" items={d.programs} />
          <Chips label="対象" items={d.audiences} />
          <Chips label="サポート内容" items={d.services} />
        </Section>
      )}

      {(d.feeType || d.feeNote) && (
        <Section id="agent-fee" title="料金" icon={<Wallet size={18} />}>
          {d.feeType && <p className="pill">{FEE_TYPES[d.feeType]}</p>}
          {d.feeNote && <p className="prose">{d.feeNote}</p>}
          <small className="muted">
            Roamigoからの相談は無料です。サポートの申し込みや料金は、エージェントとの間で決めてください。
          </small>
        </Section>
      )}

      {seminars.length > 0 && (
        <Section
          id="agent-seminars"
          title="説明会・イベント"
          icon={<CalendarDays size={18} />}
        >
          <ul className="agent-list">
            {seminars.map((s, i) => (
              <SeminarItem key={i} s={s} />
            ))}
          </ul>
        </Section>
      )}

      {d.materials.length > 0 && (
        <Section
          id="agent-materials"
          title="資料・ダウンロード"
          icon={<FileText size={18} />}
        >
          <ul className="agent-list">
            {d.materials.map((m, i) => (
              <li key={i} className="agent-material">
                {materialIcon(m.kind)}
                <span>
                  <Out href={m.url}>{m.title}</Out>
                  <small>
                    {MATERIAL_KINDS[m.kind]}
                    {m.note && "・" + m.note}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(d.methods.length > 0 || d.hours || d.responseTime || d.languages) && (
        <Section
          id="agent-contact"
          title="相談の受け方"
          icon={<Clock size={18} />}
        >
          <Dl
            rows={[
              ["相談方法", d.methods.join("・")],
              ["受付時間", d.hours],
              ["返信の目安", d.responseTime],
              ["対応言語", d.languages],
            ]}
          />
        </Section>
      )}

      {(d.offices.length > 0 || d.localSupport) && (
        <Section
          id="agent-offices"
          title="拠点・現地サポート"
          icon={<MapPin size={18} />}
        >
          {d.offices.length > 0 && (
            <ul className="agent-list">
              {d.offices.map((o, i) => (
                <li key={i} className="agent-office">
                  <strong>{o.name}</strong>
                  {o.address && <small>{o.address}</small>}
                </li>
              ))}
            </ul>
          )}
          {d.localSupport && <p className="prose">{d.localSupport}</p>}
        </Section>
      )}

      {hasCompany && (
        <Section
          id="agent-company"
          title="会社・団体の情報"
          icon={<Building2 size={18} />}
        >
          <Dl
            rows={[
              ["所属", agent.organization],
              ["設立", d.founded],
              ["実績", d.track],
              ["加盟団体・認証", d.memberships],
              ["登録番号など", d.license],
            ]}
          />
        </Section>
      )}

      {(d.website || d.links.length > 0) && (
        <Section id="agent-links" title="リンク" icon={<Link2 size={18} />}>
          <ul className="agent-links">
            {d.website && (
              <li>
                <Globe size={16} />
                <Out href={d.website}>公式サイト</Out>
              </li>
            )}
            {d.links.map((l, i) => (
              <li key={i}>
                {linkIcon(l.kind)}
                <Out href={l.url}>{l.label || LINK_KINDS[l.kind]}</Out>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {d.faq.length > 0 && (
        <Section
          id="agent-faq"
          title="よくある質問"
          icon={<CircleHelp size={18} />}
        >
          {d.faq.map((f, i) => (
            <details key={i} className="agent-faq">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </Section>
      )}
      <p className="muted agent-disclaimer">
        掲載内容はエージェントが入力したものです。料金や条件は、申し込む前にエージェントへ直接ご確認ください。
      </p>
    </article>
  );
}
export function AgentPage() {
  const { id = "" } = useParams(),
    { data } = useApp();
  const sample =
    data.mode === "preview" && !data.user
      ? sampleAgents.find((a) => a.id === id)
      : undefined;
  const r = useLoad<{ agent: PublicAgent; own: boolean }>(
    sample ? null : "/agents/" + encodeURIComponent(id),
  );
  const back = isAgent(data.user?.role) ? (
    <Back to="/">ホームに戻る</Back>
  ) : (
    <Back to="/consult">エージェントの一覧に戻る</Back>
  );
  if (sample)
    return (
      <>
        {back}
        <AgentProfileView agent={sample} />
      </>
    );
  if (r.loading) return <Skeleton />;
  if (r.error || !r.data)
    return (
      <>
        {back}
        <Failure message={r.error || "見つかりません"} />
      </>
    );
  return (
    <>
      {back}
      {r.data.own && (
        <div className="info-strip glass">
          <Eye size={20} />
          <p>利用者からはこのように見えます。</p>
        </div>
      )}
      <AgentProfileView agent={r.data.agent} own={r.data.own} />
    </>
  );
}

/* ---------- エージェント：ホーム ---------- */
type AgentMe = {
  agent: PublicAgent;
  counts: { fresh: number; active: number; total: number };
};
type Received = {
  id: string;
  title: string;
  budget: string;
  date: string;
  status: string;
  createdAt: string;
  sender: string;
  replies: number;
  lastAt: string | null;
};
export function AgentHome() {
  const me = useLoad<AgentMe>("/agent/me"),
    list = useLoad<{ consultations: Received[] }>("/agent/consultations");
  if (me.loading) return <Skeleton />;
  if (me.error || !me.data) return <Failure message={me.error || ""} />;
  const { agent, counts } = me.data,
    score = completeness(agent),
    fresh = (list.data?.consultations || []).filter(
      (c) => c.status === "submitted",
    );
  return (
    <>
      <Heading eyebrow="AGENT" title={`${agent.organization}`}>
        <Link to={"/agents/" + agent.id} className="button subtle">
          <Eye size={16} />
          公開ページを見る
        </Link>
      </Heading>
      {!agent.verified && (
        <div className="info-strip glass" role="status">
          <ShieldCheck size={20} />
          <p>
            運営の確認が終わると、利用者の「留学エージェントに相談」に表示されます。それまでに掲載情報を準備しておけます。
          </p>
        </div>
      )}
      <div className="agent-stats">
        <Link to="/agent/consultations?status=submitted" className="glass">
          <strong>{counts.fresh}</strong>
          <span>新着の相談</span>
        </Link>
        <Link to="/agent/consultations?status=accepted" className="glass">
          <strong>{counts.active}</strong>
          <span>対応中</span>
        </Link>
        <Link to="/agent/consultations" className="glass">
          <strong>{counts.total}</strong>
          <span>これまでの相談</span>
        </Link>
      </div>
      <section className="agent-section glass" aria-labelledby="agent-score">
        <h2 id="agent-score">
          <Pencil size={18} />
          掲載情報の充実度 {score}%
        </h2>
        <div
          className="agent-meter"
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="掲載情報の充実度"
        >
          <span style={{ width: score + "%" }} />
        </div>
        <p className="muted">
          対応国、説明会の日程、資料、公式サイトやSNSのURLなどを載せるほど、利用者が安心して相談できます。
        </p>
        <Link to="/agent/profile" className="button primary">
          掲載情報を編集する
          <ArrowUpRight size={16} />
        </Link>
      </section>
      <section className="booking-section">
        <h2 className="agent-h2">新着の相談</h2>
        {list.loading ? (
          <Skeleton />
        ) : fresh.length ? (
          <ReceivedList rows={fresh.slice(0, 5)} />
        ) : (
          <Empty>新着の相談はありません。</Empty>
        )}
        <Link to="/agent/consultations" className="agent-more">
          受け取った相談をすべて見る
          <ArrowUpRight size={14} />
        </Link>
      </section>
    </>
  );
}

/* ---------- エージェント：受け取った相談 ---------- */
function ReceivedList({ rows }: { rows: Received[] }) {
  return (
    <ul className="sessions-list">
      {rows.map((c) => (
        <li key={c.id}>
          <Link to={"/consultations/" + c.id} className="session-row glass">
            <span className="session-row-main">
              <strong>{c.title}</strong>
              <small>
                {c.sender}さん・予算 {c.budget}・希望日 {fmtDate(c.date)}
              </small>
              <small>
                受付 {fmtTime(c.createdAt)}
                {c.replies > 0 && `・やり取り ${c.replies}件`}
              </small>
            </span>
            <span
              className={
                "session-badge" + (c.status === "submitted" ? " urgent" : "")
              }
            >
              {CONSULT_STATUS_AGENT[c.status] || c.status}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
export function AgentInbox() {
  const r = useLoad<{ consultations: Received[] }>("/agent/consultations"),
    [params, setParams] = useSearchParams(),
    status = params.get("status") || "";
  const rows = (r.data?.consultations || []).filter(
    (c) => !status || c.status === status,
  );
  return (
    <>
      <Back to="/">エージェントのホームへ</Back>
      <Heading eyebrow="INBOX" title="受け取った相談" />
      <div className="sessions-tabs" role="tablist" aria-label="相談の状態">
        {(
          [
            ["", "すべて"],
            ["submitted", "新着"],
            ["accepted", "対応中"],
            ["completed", "対応完了"],
            ["cancelled", "お断り・終了"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            role="tab"
            aria-selected={status === k}
            className={status === k ? "selected" : ""}
            onClick={() => setParams(k ? { status: k } : {})}
          >
            {l}
          </button>
        ))}
      </div>
      {r.loading ? (
        <Skeleton />
      ) : r.error ? (
        <Failure message={r.error} />
      ) : rows.length ? (
        <ReceivedList rows={rows} />
      ) : (
        <Empty>
          {status
            ? "この状態の相談はありません。"
            : "まだ相談は届いていません。掲載情報を充実させると、相談につながりやすくなります。"}
        </Empty>
      )}
    </>
  );
}

/* ---------- 相談ごとのやり取り（相談した人・エージェントの両方） ---------- */
type Thread = {
  id: string;
  role: "agent" | "client";
  title: string;
  body: string;
  budget: string;
  date: string;
  status: string;
  createdAt: string;
  senderName: string;
  agentId: string;
  agentName: string;
  agentOrganization: string;
  shared: { id: string; body: string }[];
  messages: {
    id: string;
    body: string;
    createdAt: string;
    own: boolean;
    fromAgent: boolean;
  }[];
};
export function ConsultationThread() {
  const { id = "" } = useParams(),
    { toast } = useApp(),
    r = useLoad<{ consultation: Thread }>(
      "/consultations/" + encodeURIComponent(id),
    ),
    [reply, setReply] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState<"" | "completed" | "cancelled">("");
  if (r.loading) return <Skeleton />;
  if (r.error || !r.data)
    return (
      <>
        <Back to="/">ホームに戻る</Back>
        <Failure message={r.error || ""} />
      </>
    );
  const c = r.data.consultation,
    agent = c.role === "agent",
    closed = c.status === "completed" || c.status === "cancelled",
    labels = agent ? CONSULT_STATUS_AGENT : CONSULT_STATUS_USER;
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await api(`/consultations/${encodeURIComponent(c.id)}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: reply }),
      });
      setReply("");
      await r.reload();
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function setStatus(status: "accepted" | "completed" | "cancelled") {
    setBusy(true);
    try {
      await api(`/agent/consultations/${encodeURIComponent(c.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setConfirm("");
      toast("相談の状態を「" + CONSULT_STATUS_AGENT[status] + "」にしました");
      await r.reload();
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Back to={agent ? "/agent/consultations" : "/consult"}>
        {agent ? "受け取った相談に戻る" : "留学エージェントに相談に戻る"}
      </Back>
      <Heading eyebrow="CONSULTATION" title={c.title}>
        <span
          className={
            "session-badge" + (c.status === "submitted" ? " urgent" : "")
          }
        >
          {labels[c.status] || c.status}
        </span>
      </Heading>
      <section className="agent-section glass" aria-labelledby="thread-request">
        <h2 id="thread-request">
          <MessageSquare size={18} />
          相談内容
        </h2>
        <Dl
          rows={[
            agent
              ? ["相談した人", c.senderName + "さん"]
              : [
                  "相談先",
                  <Link to={"/agents/" + c.agentId}>
                    {c.agentOrganization || c.agentName}（担当：{c.agentName}）
                  </Link>,
                ],
            ["留学の予算", c.budget],
            ["希望日", fmtDate(c.date)],
            ["送信日時", fmtTime(c.createdAt)],
          ]}
        />
        <p className="prose agent-request-body">{c.body}</p>
        {c.shared.length > 0 && (
          <div className="agent-chips">
            <h3>共有された投稿</h3>
            <ul className="agent-list">
              {c.shared.map((m) => (
                <li key={m.id} className="agent-office">
                  <small>{m.body}</small>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      {agent && !closed && (
        <div className="agent-status-actions">
          {c.status === "submitted" && (
            <button
              className="button subtle"
              disabled={busy}
              onClick={() => setStatus("accepted")}
            >
              対応中にする
            </button>
          )}
          <button
            className="button subtle"
            disabled={busy}
            onClick={() => setConfirm("completed")}
          >
            対応完了にする
          </button>
          <button
            className="button subtle"
            disabled={busy}
            onClick={() => setConfirm("cancelled")}
          >
            お断りする
          </button>
          {confirm && (
            <div
              className="agent-confirm glass"
              role="alertdialog"
              aria-label="確認"
            >
              <p>
                {confirm === "completed"
                  ? "この相談を「対応完了」にします。以後メッセージは送れなくなります。"
                  : "この相談をお断りします。相談した人には「終了」と表示され、以後メッセージは送れなくなります。"}
              </p>
              <button
                className="button primary"
                disabled={busy}
                onClick={() => setStatus(confirm)}
              >
                はい、変更する
              </button>
              <button className="button subtle" onClick={() => setConfirm("")}>
                やめる
              </button>
            </div>
          )}
        </div>
      )}
      <section className="agent-thread" aria-labelledby="thread-messages">
        <h2 id="thread-messages" className="agent-h2">
          やり取り
        </h2>
        {c.messages.length ? (
          <ol className="agent-messages">
            {c.messages.map((m) => (
              <li key={m.id} className={m.own ? "own" : ""}>
                <small>
                  {m.fromAgent
                    ? (c.agentOrganization || c.agentName) + "（エージェント）"
                    : c.senderName + "さん"}
                  ・{fmtTime(m.createdAt)}
                </small>
                <p>{m.body}</p>
              </li>
            ))}
          </ol>
        ) : (
          <Empty>
            {agent
              ? "まだやり取りはありません。最初の返信を送ると「対応中」になります。"
              : "エージェントからの返信をお待ちください。返信が届くとメールでお知らせします。"}
          </Empty>
        )}
        {closed ? (
          <p className="muted">この相談は終了しています。</p>
        ) : (
          <form className="agent-reply glass" onSubmit={send}>
            <label className="field">
              {agent ? "返信" : "メッセージ"}
              <textarea
                rows={4}
                maxLength={3000}
                required
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={
                  agent
                    ? "例：ご相談ありがとうございます。まずはオンラインで30分ほどお話しできればと思います。候補日は…"
                    : "追加で伝えたいことなど"
                }
              />
            </label>
            <small className="muted">
              電話番号などの連絡先は、必要になったときだけ伝えてください。
            </small>
            <button className="button primary" disabled={busy || !reply.trim()}>
              {busy ? "送信中…" : "送信する"}
              <Send size={16} />
            </button>
          </form>
        )}
      </section>
    </>
  );
}

/* ---------- エージェント：掲載情報の編集 ---------- */
type Form = {
  name: string;
  organization: string;
  theme: string;
  bio: string;
  details: AgentDetails;
};
function Toggle({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
  label: string;
}) {
  return (
    <fieldset className="agent-toggle">
      <legend>{label}</legend>
      <div>
        {options.map((o) => (
          <label key={o} className="agent-check">
            <input
              type="checkbox"
              checked={value.includes(o)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...value, o]
                    : value.filter((x) => x !== o),
                )
              }
            />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
function Text({
  label,
  value,
  onChange,
  max,
  hint,
  area,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  hint?: string;
  area?: boolean;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      {label}
      {required && <span className="agent-required">必須</span>}
      {area ? (
        <textarea
          rows={4}
          maxLength={max}
          value={value}
          required={required}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={type}
          maxLength={max}
          value={value}
          required={required}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint && <small>{hint}</small>}
    </label>
  );
}
/** 説明会・資料・リンクなど、件数が増減する項目。 */
function Rows<T>({
  title,
  items,
  max,
  blank,
  onChange,
  render,
  addLabel,
}: {
  title: string;
  items: T[];
  max: number;
  blank: T;
  onChange: (v: T[]) => void;
  render: (item: T, set: (patch: Partial<T>) => void, i: number) => ReactNode;
  addLabel: string;
}) {
  return (
    <div className="agent-rows">
      {items.map((item, i) => (
        <fieldset key={i} className="agent-row glass">
          <legend>
            {title} {i + 1}
          </legend>
          {render(
            item,
            (patch) =>
              onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))),
            i,
          )}
          <button
            type="button"
            className="button subtle agent-remove"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            <Trash2 size={15} />
            {title} {i + 1} を削除
          </button>
        </fieldset>
      ))}
      {items.length < max && (
        <button
          type="button"
          className="button subtle"
          onClick={() => onChange([...items, { ...blank }])}
        >
          <Plus size={16} />
          {addLabel}
        </button>
      )}
    </div>
  );
}
const EDIT_SECTIONS = [
  ["edit-basic", "基本情報"],
  ["edit-coverage", "対応している留学"],
  ["edit-fee", "料金"],
  ["edit-seminars", "説明会"],
  ["edit-materials", "資料"],
  ["edit-links", "URL・SNS"],
  ["edit-contact", "相談の受け方・拠点"],
  ["edit-company", "会社の情報"],
  ["edit-faq", "よくある質問"],
] as const;
export function AgentProfileEdit() {
  const me = useLoad<AgentMe>("/agent/me"),
    { toast } = useApp(),
    [form, setForm] = useState<Form | null>(null),
    [countries, setCountries] = useState(""),
    [busy, setBusy] = useState(false),
    [err, setErr] = useState("");
  useEffect(() => {
    if (me.data && !form) {
      const a = me.data.agent;
      setForm({
        name: a.name,
        organization: a.organization,
        theme: a.theme,
        bio: a.bio,
        details: { ...emptyAgentDetails, ...a.details },
      });
      setCountries(a.details.countries.join("、"));
    }
  }, [me.data, form]);
  if (me.loading || (!form && !me.error)) return <Skeleton />;
  if (me.error || !form) return <Failure message={me.error || ""} />;
  const d = form.details;
  const set = (patch: Partial<Form>) => setForm({ ...form, ...patch });
  const setD = (patch: Partial<AgentDetails>) =>
    setForm({ ...form, details: { ...d, ...patch } });
  async function save(e: FormEvent) {
    e.preventDefault();
    setErr("");
    const list = countries
      .split(/[、,，\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const body = { ...form!, details: { ...d, countries: list } };
    setBusy(true);
    try {
      await api("/agent/me", { method: "PUT", body: JSON.stringify(body) });
      toast("掲載情報を保存しました");
      await me.reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Back to="/">エージェントのホームへ</Back>
      <Heading eyebrow="AGENT PROFILE" title="掲載情報の編集">
        <Link to={"/agents/" + me.data!.agent.id} className="button subtle">
          <Eye size={16} />
          公開ページを見る
        </Link>
      </Heading>
      <p className="muted">
        ここで入力した内容は、利用者向けのエージェント紹介ページにそのまま表示されます。空欄の項目は表示されません。
      </p>
      <nav className="profile-section-nav" aria-label="編集する項目">
        {EDIT_SECTIONS.map(([id, label]) => (
          <a key={id} href={"#" + id}>
            {label}
          </a>
        ))}
      </nav>
      <form className="agent-edit" onSubmit={save} noValidate={false}>
        <section id="edit-basic" className="agent-section glass">
          <h2>基本情報</h2>
          <Text
            label="所属（会社・団体名）"
            required
            max={100}
            value={form.organization}
            onChange={(v) => set({ organization: v })}
          />
          <div className="form-row">
            <Text
              label="担当者名"
              required
              max={100}
              value={form.name}
              onChange={(v) => set({ name: v })}
            />
            <Text
              label="担当者の役職"
              max={40}
              value={d.staffTitle}
              onChange={(v) => setD({ staffTitle: v })}
              placeholder="例：留学カウンセラー"
            />
          </div>
          <Text
            label="キャッチコピー"
            max={80}
            value={d.tagline}
            onChange={(v) => setD({ tagline: v })}
            placeholder="例：はじめての高校留学を、出発から帰国まで"
          />
          <Text
            label="得意分野（一覧のカードに表示）"
            required
            max={100}
            value={form.theme}
            onChange={(v) => set({ theme: v })}
            placeholder="例：カナダ・オーストラリアの高校留学"
          />
          <Text
            label="紹介文"
            area
            max={1500}
            value={form.bio}
            onChange={(v) => set({ bio: v })}
            hint="どんな人の、どんな留学を手伝えるかを書いてください。"
          />
          <Text
            label="担当者からひとこと"
            area
            max={500}
            value={d.staffMessage}
            onChange={(v) => setD({ staffMessage: v })}
            hint="ご自身の留学経験や、相談で大切にしていることなど"
          />
        </section>

        <section id="edit-coverage" className="agent-section glass">
          <h2>対応している留学</h2>
          <Text
            label="対応している国・地域"
            area
            max={600}
            value={countries}
            onChange={setCountries}
            hint="「、」で区切って入力してください（30件まで）"
            placeholder="例：カナダ、オーストラリア、ニュージーランド"
          />
          <Toggle
            label="留学の種類"
            options={PROGRAMS}
            value={d.programs}
            onChange={(v) => setD({ programs: v })}
          />
          <Toggle
            label="対象"
            options={AUDIENCES}
            value={d.audiences}
            onChange={(v) => setD({ audiences: v })}
          />
          <Toggle
            label="サポート内容"
            options={SERVICES}
            value={d.services}
            onChange={(v) => setD({ services: v })}
          />
        </section>

        <section id="edit-fee" className="agent-section glass">
          <h2>料金</h2>
          <label className="field">
            手数料について
            <select
              value={d.feeType}
              onChange={(e) =>
                setD({ feeType: e.target.value as AgentDetails["feeType"] })
              }
            >
              <option value="">選んでください</option>
              {Object.entries(FEE_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <Text
            label="料金の説明"
            area
            max={800}
            value={d.feeNote}
            onChange={(v) => setD({ feeNote: v })}
            placeholder="例：相談と学校紹介は無料。出願代行は1校あたり○円。"
          />
        </section>

        <section id="edit-seminars" className="agent-section glass">
          <h2>説明会・イベント</h2>
          <p className="muted">
            開催日が過ぎた説明会は、紹介ページに自動で表示されなくなります。
          </p>
          <Rows<AgentSeminar>
            title="説明会"
            addLabel="説明会を追加"
            max={20}
            items={d.seminars}
            onChange={(v) => setD({ seminars: v })}
            blank={{
              title: "",
              date: "",
              time: "",
              format: "online",
              place: "",
              url: "",
              note: "",
            }}
            render={(s, up) => (
              <>
                <Text
                  label="説明会名"
                  required
                  max={80}
                  value={s.title}
                  onChange={(v) => up({ title: v })}
                />
                <div className="form-row">
                  <Text
                    label="開催日"
                    type="date"
                    required
                    max={10}
                    value={s.date}
                    onChange={(v) => up({ date: v })}
                  />
                  <Text
                    label="時間"
                    max={20}
                    value={s.time}
                    onChange={(v) => up({ time: v })}
                    placeholder="例：14:00〜15:00"
                  />
                </div>
                <div className="form-row">
                  <label className="field">
                    形式
                    <select
                      value={s.format}
                      onChange={(e) =>
                        up({ format: e.target.value as AgentSeminar["format"] })
                      }
                    >
                      {Object.entries(SEMINAR_FORMATS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Text
                    label="会場・ツール"
                    max={80}
                    value={s.place}
                    onChange={(v) => up({ place: v })}
                    placeholder="例：Zoom／東京オフィス"
                  />
                </div>
                <Text
                  label="申し込み・詳細のURL"
                  type="url"
                  max={500}
                  value={s.url}
                  onChange={(v) => up({ url: v })}
                  placeholder="https://"
                />
                <Text
                  label="補足"
                  max={300}
                  value={s.note}
                  onChange={(v) => up({ note: v })}
                />
              </>
            )}
          />
        </section>

        <section id="edit-materials" className="agent-section glass">
          <h2>資料（説明会資料・パンフレットなど）</h2>
          <p className="muted">
            資料は公式サイトやGoogleドライブなどに置き、誰でも見られる共有リンクを貼ってください。
          </p>
          <Rows<AgentMaterial>
            title="資料"
            addLabel="資料を追加"
            max={20}
            items={d.materials}
            onChange={(v) => setD({ materials: v })}
            blank={{ title: "", kind: "pdf", url: "", note: "" }}
            render={(m, up) => (
              <>
                <div className="form-row">
                  <Text
                    label="資料名"
                    required
                    max={80}
                    value={m.title}
                    onChange={(v) => up({ title: v })}
                  />
                  <label className="field">
                    種類
                    <select
                      value={m.kind}
                      onChange={(e) =>
                        up({
                          kind: e.target.value as keyof typeof MATERIAL_KINDS,
                        })
                      }
                    >
                      {Object.entries(MATERIAL_KINDS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <Text
                  label="URL"
                  type="url"
                  required
                  max={500}
                  value={m.url}
                  onChange={(v) => up({ url: v })}
                  placeholder="https://"
                />
                <Text
                  label="説明"
                  max={200}
                  value={m.note}
                  onChange={(v) => up({ note: v })}
                  placeholder="例：費用の目安と出発までの流れ"
                />
              </>
            )}
          />
        </section>

        <section id="edit-links" className="agent-section glass">
          <h2>URL・SNS</h2>
          <Text
            label="公式サイト"
            type="url"
            max={500}
            value={d.website}
            onChange={(v) => setD({ website: v })}
            placeholder="https://"
          />
          <Rows<AgentLink>
            title="リンク"
            addLabel="SNS・リンクを追加"
            max={12}
            items={d.links}
            onChange={(v) => setD({ links: v })}
            blank={{ kind: "instagram", url: "", label: "" }}
            render={(l, up) => (
              <>
                <div className="form-row">
                  <label className="field">
                    種類
                    <select
                      value={l.kind}
                      onChange={(e) =>
                        up({ kind: e.target.value as keyof typeof LINK_KINDS })
                      }
                    >
                      {Object.entries(LINK_KINDS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Text
                    label="表示名（任意）"
                    max={40}
                    value={l.label}
                    onChange={(v) => up({ label: v })}
                  />
                </div>
                <Text
                  label="URL"
                  type="url"
                  required
                  max={500}
                  value={l.url}
                  onChange={(v) => up({ url: v })}
                  placeholder="https://"
                />
              </>
            )}
          />
        </section>

        <section id="edit-contact" className="agent-section glass">
          <h2>相談の受け方・拠点</h2>
          <Toggle
            label="相談方法"
            options={METHODS}
            value={d.methods}
            onChange={(v) => setD({ methods: v })}
          />
          <div className="form-row">
            <Text
              label="受付時間"
              max={100}
              value={d.hours}
              onChange={(v) => setD({ hours: v })}
              placeholder="例：平日 10:00〜19:00"
            />
            <Text
              label="返信の目安"
              max={40}
              value={d.responseTime}
              onChange={(v) => setD({ responseTime: v })}
              placeholder="例：1営業日以内"
            />
          </div>
          <Text
            label="対応言語"
            max={100}
            value={d.languages}
            onChange={(v) => setD({ languages: v })}
            placeholder="例：日本語・英語"
          />
          <Rows
            title="拠点"
            addLabel="拠点を追加"
            max={10}
            items={d.offices}
            onChange={(v) => setD({ offices: v })}
            blank={{ name: "", address: "" }}
            render={(o, up) => (
              <div className="form-row">
                <Text
                  label="拠点名"
                  max={60}
                  value={o.name}
                  onChange={(v) => up({ name: v })}
                  placeholder="例：東京オフィス／バンクーバー現地デスク"
                />
                <Text
                  label="所在地"
                  max={120}
                  value={o.address}
                  onChange={(v) => up({ address: v })}
                />
              </div>
            )}
          />
          <Text
            label="現地サポートの体制"
            area
            max={400}
            value={d.localSupport}
            onChange={(v) => setD({ localSupport: v })}
            placeholder="例：現地に日本人スタッフが常駐し、緊急時は24時間連絡できます。"
          />
        </section>

        <section id="edit-company" className="agent-section glass">
          <h2>会社・団体の情報</h2>
          <div className="form-row">
            <Text
              label="設立"
              max={20}
              value={d.founded}
              onChange={(v) => setD({ founded: v })}
              placeholder="例：2010年"
            />
            <Text
              label="登録番号など"
              max={120}
              value={d.license}
              onChange={(v) => setD({ license: v })}
              placeholder="例：旅行業登録番号"
            />
          </div>
          <Text
            label="これまでの実績"
            area
            max={300}
            value={d.track}
            onChange={(v) => setD({ track: v })}
            placeholder="例：年間○名の留学をサポート"
          />
          <Text
            label="加盟団体・認証"
            area
            max={300}
            value={d.memberships}
            onChange={(v) => setD({ memberships: v })}
          />
        </section>

        <section id="edit-faq" className="agent-section glass">
          <h2>よくある質問</h2>
          <Rows
            title="質問"
            addLabel="質問を追加"
            max={15}
            items={d.faq}
            onChange={(v) => setD({ faq: v })}
            blank={{ q: "", a: "" }}
            render={(f, up) => (
              <>
                <Text
                  label="質問"
                  required
                  max={120}
                  value={f.q}
                  onChange={(v) => up({ q: v })}
                />
                <Text
                  label="回答"
                  area
                  required
                  max={800}
                  value={f.a}
                  onChange={(v) => up({ a: v })}
                />
              </>
            )}
          />
        </section>

        <div className="agent-save glass">
          {err && (
            <p className="form-error" role="alert">
              {err}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? "保存中…" : "保存する"}
          </button>
        </div>
      </form>
    </>
  );
}

/** エージェントのアカウントで利用者向けの相談画面を開いたときの案内。 */
export function AgentOnlyNotice() {
  return (
    <div className="info-strip glass">
      <Inbox size={20} />
      <p>
        エージェントのアカウントからは相談を送れません。届いた相談は
        <Link to="/agent/consultations">受け取った相談</Link>
        から確認できます。
      </p>
    </div>
  );
}
