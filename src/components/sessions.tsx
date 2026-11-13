import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  ExternalLink,
  Video,
} from "lucide-react";
import { api, useApp } from "../lib/store";
import type { AdvisorDetails, PublicAdvisor } from "../lib/data";
import { Empty, Heading, Skeleton } from "./ui";

export const SESSION_PRICE = 3500;
export type SessionView = {
  id: string;
  role: "advisor" | "client";
  advisorId: string;
  clientId: string;
  advisorName: string;
  clientName: string;
  roomId: string;
  status: string;
  topic: string;
  slots: string[];
  scheduledAt: string | null;
  callUrl: string | null;
  amount: number;
  advisorAmount?: number;
  acceptExpiresAt: number | null;
  payExpiresAt: number | null;
  reportDeadline: number | null;
  reportReason: string | null;
  createdAt: string;
};

const STATUS: Record<string, string> = {
  requested: "承認待ち",
  accepted: "支払い待ち",
  paid: "日時確定",
  completed: "実施済み",
  settled: "完了",
  declined: "辞退",
  expired: "期限切れ",
  cancelled: "キャンセル",
  refund_pending: "返金手続き中",
  refunded: "返金済み",
  disputed: "問題を確認中",
};
const fmt = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("ja-JP", {
        month: "numeric",
        day: "numeric",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
const fmtSec = (s?: number | null) =>
  s ? fmt(new Date(s * 1000).toISOString()) : "";
const remaining = (sec?: number | null) => {
  if (!sec) return "";
  const m = Math.floor((sec * 1000 - Date.now()) / 60000);
  if (m <= 0) return "期限を過ぎました";
  return (
    "あと" + (m >= 60 ? Math.floor(m / 60) + "時間" : "") + (m % 60) + "分"
  );
};
const startMs = (s: SessionView) =>
  s.scheduledAt ? Date.parse(s.scheduledAt) : 0;
export const needsAction = (s: SessionView, now = Date.now()) =>
  (s.role === "advisor" && s.status === "requested") ||
  (s.role === "client" && s.status === "accepted") ||
  (s.status === "paid" &&
    startMs(s) > 0 &&
    startMs(s) - now < 24 * 3600e3 &&
    startMs(s) > now - 3 * 3600e3);
const live = [
  "requested",
  "accepted",
  "paid",
  "completed",
  "disputed",
  "refund_pending",
];
const peerName = (s: SessionView) =>
  s.role === "advisor" ? s.clientName : s.advisorName;

/** Plain Japanese rule shown before cancelling. */
export function refundRule(s: SessionView, now = Date.now()) {
  if (s.status !== "paid") return "まだお支払い前のため、料金は発生しません。";
  if (s.role === "advisor")
    return "経験者側のキャンセルは、申込者へ全額（3,500円）を返金します。";
  return startMs(s) - now >= 24 * 3600e3
    ? "開始の24時間前までのキャンセルなので、全額（3,500円）が返金されます。"
    : "開始まで24時間を切っているため、返金はありません。";
}

function useLoad<T>(path: string) {
  const [state, set] = useState<{ data?: T; error?: string; loading: boolean }>(
    { loading: true },
  );
  const load = useCallback(async () => {
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
function Failure({
  message,
  children,
}: {
  message: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty glass" role="alert">
      <h2>読み込めませんでした</h2>
      <p>{message}</p>
      {children}
    </div>
  );
}
function Back({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="back-link">
      <ArrowLeft size={16} />
      {children}
    </Link>
  );
}
function LoginNeeded() {
  const { data } = useApp();
  return data.mode === "production" && !data.user ? (
    <Empty>ログインすると利用できます。</Empty>
  ) : null;
}

/* ---------- 申込 ---------- */
export function SessionNew() {
  const { id } = useParams(),
    { data, toast, guard } = useApp(),
    navigate = useNavigate(),
    advisor = (data.advisors ?? []).find((a) => a.userId === id),
    person =
      data.people.find((p) => p.id === id) ||
      data.rooms.find((r) => r.peer?.id === id)?.peer,
    [topic, setTopic] = useState(""),
    [slots, setSlots] = useState(["", "", ""]),
    [minor, setMinor] = useState(false),
    [guardian, setGuardian] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!advisor || !advisor.accepting)
    return (
      <>
        <Back to={"/people/" + id}>プロフィール</Back>
        <Empty>この方は現在、有料相談を受け付けていません。</Empty>
      </>
    );
  const name = person?.name || "この方";
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!guard()) return;
    if (topic.trim().length < 10)
      return setError("相談したいことは10文字以上で入力してください");
    if (slots.some((s) => !s)) return setError("候補日時を3つ入力してください");
    if (minor && !guardian)
      return setError("18歳未満の方は保護者の同意が必要です");
    setBusy(true);
    try {
      const r = await api<{ id: string }>("/sessions", {
        method: "POST",
        body: JSON.stringify({
          advisorId: id,
          topic: topic.trim(),
          slots: slots.map((s) => new Date(s).toISOString()),
          minor,
          guardianConsent: guardian,
        }),
      });
      toast("申し込みました。返答をお待ちください");
      navigate("/sessions/" + r.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Back to={"/people/" + id}>{name}のプロフィール</Back>
      <Heading eyebrow="SESSION" title={name + "さんに相談を申し込む"} />
      <form className="sessions-form glass" onSubmit={submit} noValidate>
        <p className="sessions-note">
          <strong>お支払いはまだ発生しません。</strong>
          経験者が承認し、あなたが「支払う」を押したときに初めて決済されます。
        </p>
        <label className="field">
          相談したいこと（10〜1,000字）
          <textarea
            value={topic}
            maxLength={1000}
            rows={6}
            required
            onChange={(e) => setTopic(e.target.value)}
            placeholder="例：高校留学の学校選びで迷っています。費用や寮生活について聞きたいです。"
          />
          <small>{topic.trim().length} / 1000字</small>
        </label>
        <fieldset className="sessions-fieldset">
          <legend>希望日時（候補を3つ）</legend>
          {slots.map((s, i) => (
            <label className="field" key={i}>
              候補{i + 1}
              <input
                type="datetime-local"
                value={s}
                required
                onChange={(e) =>
                  setSlots(slots.map((x, j) => (j === i ? e.target.value : x)))
                }
              />
            </label>
          ))}
          <small>1時間後から60日以内で選んでください。1回30分です。</small>
        </fieldset>
        <section className="sessions-rules" aria-label="料金とキャンセル規定">
          <h2>料金とキャンセル</h2>
          <ul>
            <li>
              30分 {SESSION_PRICE.toLocaleString()}円（承認後にカードで支払い）
            </li>
            <li>
              承認から24時間以内にお支払いがない場合は自動でキャンセルされます
            </li>
            <li>開始の24時間前までのキャンセル：全額返金</li>
            <li>
              開始の24時間前を過ぎたキャンセル：返金なし（経験者都合は全額返金）
            </li>
          </ul>
          <small>
            <Link to="/legal/tokushoho">特定商取引法に基づく表記</Link> ・{" "}
            <Link to="/legal/terms">利用規約</Link>
          </small>
        </section>
        <label className="check-row">
          <input
            type="checkbox"
            checked={minor}
            onChange={(e) => setMinor(e.target.checked)}
          />
          <span>私は18歳未満です</span>
        </label>
        {minor && (
          <label className="check-row">
            <input
              type="checkbox"
              checked={guardian}
              onChange={(e) => setGuardian(e.target.checked)}
            />
            <span>保護者の同意を得ています（必須）</span>
          </label>
        )}
        {error && (
          <p className="sessions-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={busy}>
          {busy ? "送信中…" : "支払いなしで申し込む"}
        </button>
      </form>
    </>
  );
}

/* ---------- 一覧 ---------- */
export function SessionsList() {
  const { data, error, loading, reload } = useLoadSessions();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "received" ? "received" : "sent";
  const all = data ?? [];
  const hasReceived = all.some((s) => s.role === "advisor");
  const rows = all
    .filter((s) =>
      tab === "received" ? s.role === "advisor" : s.role === "client",
    )
    .sort(
      (a, b) =>
        Number(needsAction(b)) - Number(needsAction(a)) ||
        Number(live.includes(b.status)) - Number(live.includes(a.status)) ||
        b.createdAt.localeCompare(a.createdAt),
    );
  return (
    <>
      <Heading eyebrow="SESSIONS" title="有料相談" />
      <LoginNeeded />
      <div className="sessions-tabs" role="tablist" aria-label="相談の種類">
        {(
          [
            ["sent", "申し込んだ相談"],
            ["received", "受けた相談"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            className={tab === k ? "selected" : ""}
            onClick={() => setParams(k === "sent" ? {} : { tab: k })}
          >
            {l}
          </button>
        ))}
      </div>
      {loading ? (
        <Skeleton />
      ) : error ? (
        <Failure message={error}>
          <button className="button subtle" onClick={reload}>
            もう一度読み込む
          </button>
        </Failure>
      ) : rows.length ? (
        <ul className="sessions-list">
          {rows.map((s) => (
            <li key={s.id}>
              <Link to={"/sessions/" + s.id} className="session-row glass">
                <span className="session-row-main">
                  <strong>{peerName(s)}さん</strong>
                  <small>{s.topic.slice(0, 50)}</small>
                  <small>
                    {s.scheduledAt ? fmt(s.scheduledAt) : "日時は承認後に確定"}
                  </small>
                </span>
                {needsAction(s) && (
                  <span className="session-badge urgent">対応が必要</span>
                )}
                <span className="session-badge">
                  {STATUS[s.status] || s.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : tab === "received" && !hasReceived ? (
        <Empty>
          まだ受けた相談はありません。受付を始めるには、プロフィールの「有料相談」から確認を申請してください。
          <Link to="/advisor/apply">経験者として申請する</Link>
        </Empty>
      ) : (
        <Empty>
          まだ相談はありません。留学経験のある人に、30分から相談できます。
          <Link to="/people?axis=alumni">経験者を探す</Link>
        </Empty>
      )}
    </>
  );
}
function useLoadSessions() {
  const r = useLoad<{ sessions: SessionView[] }>("/sessions");
  return {
    data: r.data?.sessions,
    error: r.error,
    loading: r.loading,
    reload: r.reload,
  };
}

/* ---------- 詳細 ---------- */
export function SessionDetail() {
  const { id } = useParams(),
    { toast } = useApp(),
    [params] = useSearchParams(),
    {
      data: s,
      error,
      loading,
      reload,
    } = useLoad<SessionView>("/sessions/" + id),
    [busy, setBusy] = useState(false),
    [picked, setPicked] = useState(""),
    [callUrl, setCallUrl] = useState(""),
    [formError, setFormError] = useState(""),
    [confirmCancel, setConfirmCancel] = useState(false),
    [reporting, setReporting] = useState(false),
    [reason, setReason] = useState("");
  async function act(path: string, body?: unknown, done?: string) {
    setBusy(true);
    setFormError("");
    try {
      await api(path, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      });
      if (done) toast(done);
      setConfirmCancel(false);
      setReporting(false);
      await reload();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function pay() {
    setBusy(true);
    setFormError("");
    try {
      const r = await api<{ url: string }>("/sessions/" + id + "/checkout", {
        method: "POST",
      });
      window.location.href = r.url;
    } catch (e) {
      setFormError((e as Error).message);
      setBusy(false);
    }
  }
  if (loading) return <Skeleton />;
  if (error || !s)
    return (
      <>
        <Back to="/sessions">有料相談</Back>
        <Failure message={error || "相談が見つかりません"} />
      </>
    );
  const now = Date.now(),
    start = startMs(s),
    started = start > 0 && start <= now,
    advisor = s.role === "advisor",
    canCancel =
      ["requested", "accepted"].includes(s.status) ||
      (s.status === "paid" && start > now - 30 * 60e3),
    canReport =
      !advisor &&
      started &&
      ((s.status === "paid" && now <= start + 72 * 3600e3) ||
        (s.status === "completed" &&
          (!s.reportDeadline || now <= s.reportDeadline * 1000)));
  const cancelRole = advisor && s.status === "requested" ? null : canCancel;
  return (
    <>
      <Back to="/sessions">有料相談</Back>
      <Heading eyebrow="SESSION" title={peerName(s) + "さんとの相談"}>
        <span className="session-badge">{STATUS[s.status] || s.status}</span>
      </Heading>
      <article className="sessions-detail glass">
        {params.get("payment") === "cancelled" && (
          <p className="sessions-note">
            お支払いは完了していません。続ける場合は「支払う」を押してください。
          </p>
        )}
        <dl>
          <dt>相談したいこと</dt>
          <dd className="pre">{s.topic}</dd>
          <dt>日時</dt>
          <dd>
            {s.scheduledAt ? (
              fmt(s.scheduledAt) + "（30分）"
            ) : (
              <ul className="slot-list">
                {s.slots.map((x) => (
                  <li key={x}>{fmt(x)}</li>
                ))}
              </ul>
            )}
          </dd>
          <dt>料金</dt>
          <dd>
            {s.amount.toLocaleString()}円
            {advisor && s.advisorAmount
              ? "（あなたの受取 " + s.advisorAmount.toLocaleString() + "円）"
              : ""}
          </dd>
          {s.status === "requested" && (
            <>
              <dt>返答の期限</dt>
              <dd>
                {fmtSec(s.acceptExpiresAt)}（{remaining(s.acceptExpiresAt)}）
              </dd>
            </>
          )}
          {s.status === "accepted" && (
            <>
              <dt>お支払いの期限</dt>
              <dd>
                {fmtSec(s.payExpiresAt)}（{remaining(s.payExpiresAt)}）
              </dd>
            </>
          )}
          {s.status === "completed" && s.reportDeadline && (
            <>
              <dt>問題報告の期限</dt>
              <dd>{fmtSec(s.reportDeadline)}まで</dd>
            </>
          )}
          {s.callUrl && (
            <>
              <dt>通話URL</dt>
              <dd>
                <a href={s.callUrl} target="_blank" rel="noopener noreferrer">
                  {s.callUrl}
                  <ExternalLink size={13} />
                </a>
              </dd>
            </>
          )}
          {s.status === "disputed" && s.reportReason && (
            <>
              <dt>報告内容</dt>
              <dd className="pre">{s.reportReason}</dd>
            </>
          )}
        </dl>
        {s.status === "refund_pending" && (
          <p className="sessions-note">
            返金の手続き中です。完了まで数日かかることがあります。
          </p>
        )}
        {s.status === "disputed" && (
          <p className="sessions-note">
            運営が内容を確認しています。結果はメールでお知らせします。
          </p>
        )}
        {["declined", "expired"].includes(s.status) && (
          <p className="sessions-note">料金は発生していません。</p>
        )}
        {formError && (
          <p className="sessions-error" role="alert">
            {formError}
          </p>
        )}

        {/* 主操作は状態と役割で1つだけ */}
        {advisor && s.status === "requested" && (
          <form
            className="sessions-accept"
            onSubmit={(e) => {
              e.preventDefault();
              if (!picked) return setFormError("日時を選んでください");
              if (!/^https:\/\//.test(callUrl.trim()))
                return setFormError("通話URLはhttps://で始まる必要があります");
              void act(
                "/sessions/" + id + "/accept",
                { scheduledAt: picked, callUrl: callUrl.trim() },
                "承認しました",
              );
            }}
            noValidate
          >
            <fieldset className="sessions-fieldset">
              <legend>候補から日時を選ぶ</legend>
              {s.slots.map((x) => (
                <label className="check-row" key={x}>
                  <input
                    type="radio"
                    name="slot"
                    value={x}
                    checked={picked === x}
                    onChange={() => setPicked(x)}
                  />
                  <span>{fmt(x)}</span>
                </label>
              ))}
            </fieldset>
            <label className="field">
              通話URL（https://のみ）
              <input
                type="url"
                value={callUrl}
                onChange={(e) => setCallUrl(e.target.value)}
                placeholder="https://meet.google.com/..."
              />
              <small>お支払い後に申込者へ表示されます。</small>
            </label>
            <button className="button primary full" disabled={busy}>
              {busy ? "送信中…" : "この日時で承認する"}
            </button>
            <button
              type="button"
              className="button subtle full"
              disabled={busy}
              onClick={() =>
                void act(
                  "/sessions/" + id + "/decline",
                  undefined,
                  "辞退しました",
                )
              }
            >
              辞退する
            </button>
          </form>
        )}
        {!advisor && s.status === "accepted" && (
          <button className="button primary full" disabled={busy} onClick={pay}>
            {busy
              ? "決済画面へ移動中…"
              : "支払う（" + s.amount.toLocaleString() + "円）"}
          </button>
        )}
        {s.status === "requested" && !advisor && (
          <p className="sessions-note">経験者の返答を待っています。</p>
        )}
        {s.status === "accepted" && advisor && (
          <p className="sessions-note">申込者のお支払いを待っています。</p>
        )}
        {s.status === "paid" && !started && s.callUrl && (
          <a
            className="button primary full"
            href={s.callUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Video size={16} />
            通話を開く
          </a>
        )}
        {s.status === "paid" && started && advisor && (
          <button
            className="button primary full"
            disabled={busy}
            onClick={() =>
              void act(
                "/sessions/" + id + "/complete",
                undefined,
                "実施を記録しました",
              )
            }
          >
            実施した
          </button>
        )}
        {s.status === "paid" && started && !advisor && s.callUrl && (
          <a
            className="button primary full"
            href={s.callUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Video size={16} />
            通話を開く
          </a>
        )}
        {canReport && !reporting && (
          <button
            className="button subtle full"
            onClick={() => setReporting(true)}
          >
            問題を報告する
          </button>
        )}
        {reporting && (
          <form
            className="sessions-accept"
            onSubmit={(e) => {
              e.preventDefault();
              if (reason.trim().length < 5)
                return setFormError("内容を5文字以上で入力してください");
              void act(
                "/sessions/" + id + "/report",
                { reason: reason.trim() },
                "報告しました",
              );
            }}
            noValidate
          >
            <label className="field">
              問題の内容（開始から72時間以内）
              <textarea
                rows={4}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <button className="button primary full" disabled={busy}>
              報告を送る
            </button>
          </form>
        )}
        {cancelRole && !confirmCancel && (
          <button
            className="button text-button"
            onClick={() => setConfirmCancel(true)}
          >
            キャンセルする
          </button>
        )}
        {confirmCancel && (
          <div
            className="sessions-confirm"
            role="alertdialog"
            aria-labelledby="cancel-title"
          >
            <h2 id="cancel-title">この相談をキャンセルしますか？</h2>
            <p>{refundRule(s)}</p>
            <button
              className="button danger full"
              disabled={busy}
              onClick={() =>
                void act(
                  "/sessions/" + id + "/cancel",
                  undefined,
                  "キャンセルしました",
                )
              }
            >
              キャンセルを確定する
            </button>
            <button
              className="button subtle full"
              onClick={() => setConfirmCancel(false)}
            >
              やめる
            </button>
          </div>
        )}
        <small className="sessions-foot">
          <CalendarClock size={13} />
          <Link to={"/rooms/" + s.roomId}>会話を開く</Link>
        </small>
      </article>
    </>
  );
}

/* ---------- 支払い後 ---------- */
export function SessionPaid() {
  const { id } = useParams(),
    [s, setS] = useState<SessionView | null>(null),
    [error, setError] = useState(""),
    [tries, setTries] = useState(0);
  const done =
    s?.status === "paid" ||
    (!!s && ["completed", "settled"].includes(s.status));
  useEffect(() => {
    if (done || tries > 40) return;
    const t = setTimeout(
      async () => {
        try {
          setS(await api<SessionView>("/sessions/" + id));
          setError("");
        } catch (e) {
          setError((e as Error).message);
        }
        setTries((n) => n + 1);
      },
      tries === 0 ? 0 : 3000,
    );
    return () => clearTimeout(t);
  }, [id, done, tries]);
  return (
    <>
      <Heading
        eyebrow="PAYMENT"
        title={done ? "お支払いが完了しました" : "お支払いを確認中です"}
      />
      <div className="sessions-detail glass" aria-live="polite">
        {done && s ? (
          <>
            <p>
              <BadgeCheck size={18} /> {fmt(s.scheduledAt)}{" "}
              の相談が確定しました。
            </p>
            {s.callUrl && (
              <p>
                通話URL：
                <a href={s.callUrl} target="_blank" rel="noopener noreferrer">
                  {s.callUrl}
                </a>
              </p>
            )}
          </>
        ) : tries > 40 ? (
          <p>
            確認に時間がかかっています。しばらくしてから詳細ページをご確認ください。
          </p>
        ) : (
          <p>決済の確認が終わるまで、このままお待ちください（確認中…）。</p>
        )}
        {error && <p className="sessions-error">{error}</p>}
        <Link className="button primary full" to={"/sessions/" + id}>
          相談の詳細へ戻る
        </Link>
      </div>
    </>
  );
}

/* ---------- 経験者の申請 ---------- */
const ADVISOR_STATUS: Record<string, string> = {
  none: "未申請",
  pending: "確認待ち",
  approved: "承認済み",
  suspended: "停止",
  rejected: "却下",
};
type AdvisorMe = {
  status: string;
  accepting: boolean;
  availability: string;
  details: AdvisorDetails;
  hasDocument: boolean;
  reviewReason?: string;
  price: number;
};
export function AdvisorApply() {
  const {
      data: me,
      error,
      loading,
      reload,
    } = useLoad<AdvisorMe>("/advisor/me"),
    { toast } = useApp(),
    [birth, setBirth] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [agree, setAgree] = useState(false),
    [busy, setBusy] = useState(false),
    [err, setErr] = useState("");
  if (loading) return <Skeleton />;
  if (error || !me)
    return <Failure message={error || "読み込めませんでした"} />;
  const canApply = ["none", "rejected"].includes(me.status);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    if (!birth) return setErr("生年月日を入力してください");
    if (!file && !me!.hasDocument) return setErr("書類を選んでください");
    if (
      file &&
      !["image/jpeg", "image/png", "application/pdf"].includes(file.type)
    )
      return setErr("JPEG・PNG・PDFを選んでください");
    if (file && file.size > 1_500_000)
      return setErr("ファイルは1.5MB以下にしてください");
    if (!agree) return setErr("経験者規約への同意が必要です");
    setBusy(true);
    try {
      if (me!.status === "none")
        await api("/advisor/me", {
          method: "PUT",
          body: JSON.stringify({
            details: me!.details,
            availability: me!.availability,
            accepting: false,
          }),
        });
      if (file)
        await api("/advisor/document", {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
      await api("/advisor/apply", {
        method: "POST",
        body: JSON.stringify({ birthDate: birth, termsAgreed: true }),
      });
      toast("申請しました。運営の確認をお待ちください");
      await reload();
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Back to="/profile">プロフィール</Back>
      <Heading eyebrow="ADVISOR" title="有料相談の確認申請" />
      <div className="sessions-form glass">
        <p>
          現在の状態：
          <span className="session-badge">
            {ADVISOR_STATUS[me.status] || me.status}
          </span>
        </p>
        {me.status === "rejected" && me.reviewReason && (
          <p className="sessions-note">差し戻しの理由：{me.reviewReason}</p>
        )}
        {!canApply ? (
          <p>
            {me.status === "pending"
              ? "運営が書類を確認しています。結果はメールでお知らせします。"
              : "申請は完了しています。"}
            <Link to="/profile">プロフィールへ戻る</Link>
          </p>
        ) : (
          <form onSubmit={submit} noValidate>
            <p className="sessions-note">
              先にプロフィールの「有料相談」で経験の内容を入力してください。口座情報はこのアプリでは集めません（承認後に別途ご案内します）。
            </p>
            <label className="field">
              生年月日（18歳以上の方のみ）
              <input
                type="date"
                value={birth}
                onChange={(e) => setBirth(e.target.value)}
              />
            </label>
            <label className="field">
              在籍・修了がわかる書類（JPEG・PNG・PDF、1.5MBまで）
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <small>
                運営だけが確認し、確認後に削除します。
                {me.hasDocument && "（アップロード済みの書類があります）"}
              </small>
            </label>
            <section className="sessions-rules" aria-label="経験者規約">
              <h2>経験者規約</h2>
              <ul>
                <li>
                  直接取引の禁止：連絡先を交換して料金を直接受け取ること、他の有料サービスへ誘導することはできません。
                </li>
                <li>
                  紹介料の禁止：留学エージェント・学校などから相談者の紹介にかかわる報酬は受け取れません。
                </li>
                <li>
                  キャンセル規定：開始の24時間前までの申込者キャンセルは全額返金、経験者都合のキャンセルも全額返金です。経験者都合のキャンセル・無断欠席が2回あると受付を停止することがあります。
                </li>
                <li>
                  月末振込：実施から72時間後に精算対象となり、月末にまとめて振り込みます（1件
                  2,500円）。
                </li>
                <li>
                  所得の扱い：受け取った報酬は所得にあたる場合があり、申告は各自の責任で行います。
                </li>
              </ul>
              <small>
                <Link to="/legal/terms">利用規約</Link>
              </small>
            </section>
            <label className="check-row">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              <span>上記の経験者規約に同意します</span>
            </label>
            {err && (
              <p className="sessions-error" role="alert">
                {err}
              </p>
            )}
            <button className="button primary full" disabled={busy}>
              {busy ? "送信中…" : "申請する"}
            </button>
          </form>
        )}
      </div>
    </>
  );
}

/* ---------- 収入 ---------- */
export function AdvisorEarnings() {
  const { data, error, loading, reload } = useLoad<{
    months: {
      month: string;
      settledCount: number;
      payable: number;
      paid: number;
      upcoming: number;
    }[];
  }>("/advisor/earnings");
  const yen = (n: number) => n.toLocaleString() + "円";
  return (
    <>
      <Back to="/sessions?tab=received">受けた相談</Back>
      <Heading eyebrow="EARNINGS" title="収入" />
      {loading ? (
        <Skeleton />
      ) : error ? (
        <Failure message={error}>
          <button className="button subtle" onClick={reload}>
            もう一度読み込む
          </button>
        </Failure>
      ) : data!.months.length ? (
        <div className="sessions-table glass">
          <table>
            <thead>
              <tr>
                <th scope="col">月</th>
                <th scope="col">実施件数</th>
                <th scope="col">支払予定</th>
                <th scope="col">支払済み</th>
                <th scope="col">確定待ち</th>
              </tr>
            </thead>
            <tbody>
              {data!.months.map((m) => (
                <tr key={m.month}>
                  <th scope="row">{m.month}</th>
                  <td>{m.settledCount}件</td>
                  <td>{yen(m.payable)}</td>
                  <td>{yen(m.paid)}</td>
                  <td>{yen(m.upcoming)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>
          まだ収入はありません。相談が実施されると、ここに表示されます。
        </Empty>
      )}
      <p className="sessions-note">
        精算の流れ：実施から72時間（問題報告がなければ）で精算対象となり、月末にまとめて振り込みます。「確定待ち」は、実施前または72時間以内の分です。
      </p>
    </>
  );
}

/* ---------- 法務ページ（legal.tsx） ---------- */
export { LegalTerms, LegalTokushoho } from "./legal";

/* ---------- /profile の有料相談ブロック ---------- */
const textFields: [keyof AdvisorDetails, string, boolean][] = [
  ["city", "都市", false],
  ["stay", "滞在先", false],
  ["costNote", "費用の目安", false],
  ["languageLevel", "語学レベル", false],
  ["current", "現在の所属", false],
  ["languages", "相談できる言語", false],
  ["hard", "大変だったこと", true],
  ["good", "よかったこと", true],
  ["career", "学歴・職歴の要約", true],
];
export function AdvisorProfileBlock() {
  const { data: app, toast } = useApp(),
    { data: me, error, loading } = useLoad<AdvisorMe>("/advisor/me"),
    [form, setForm] = useState<AdvisorMe | null>(null),
    [busy, setBusy] = useState(false),
    [msg, setMsg] = useState("");
  useEffect(() => {
    if (me) setForm(me);
  }, [me]);
  if (!app.user) return null;
  return (
    <section className="sessions-form glass" aria-labelledby="advisor-block">
      <h2 id="advisor-block">有料相談</h2>
      {loading ? (
        <p>読み込み中…</p>
      ) : error || !form ? (
        <p className="sessions-error" role="alert">
          {error || "読み込めませんでした"}
        </p>
      ) : (
        <form
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMsg("");
            try {
              const links = form.details.links
                .map((l) => l.trim())
                .filter(Boolean);
              if (links.some((l) => !l.startsWith("https://")))
                throw new Error("リンクはhttps://で始まるURLにしてください");
              await api("/advisor/me", {
                method: "PUT",
                body: JSON.stringify({
                  details: { ...form.details, links },
                  availability: form.availability,
                  accepting: form.status === "approved" && form.accepting,
                }),
              });
              toast("有料相談の設定を保存しました");
            } catch (e2) {
              setMsg((e2 as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>
            承認状態：
            <span className="session-badge">
              {ADVISOR_STATUS[form.status] || form.status}
            </span>{" "}
            {["none", "rejected"].includes(form.status) && (
              <Link to="/advisor/apply">確認を申請する</Link>
            )}
            {form.status === "pending" && (
              <Link to="/advisor/apply">申請の状況</Link>
            )}
            {form.status === "approved" && (
              <Link to="/advisor/earnings">収入を見る</Link>
            )}
          </p>
          <label className="check-row">
            <input
              type="checkbox"
              disabled={form.status !== "approved"}
              checked={form.accepting}
              onChange={(e) =>
                setForm({ ...form, accepting: e.target.checked })
              }
            />
            <span>
              有料相談を受け付ける
              {form.status !== "approved" && (
                <small>（運営の確認が済むとオンにできます）</small>
              )}
            </span>
          </label>
          <label className="field">
            受けられる曜日・時間帯
            <input
              maxLength={300}
              value={form.availability}
              onChange={(e) =>
                setForm({ ...form, availability: e.target.value })
              }
              placeholder="例：平日の夜、土曜の午前"
            />
          </label>
          <label className="field">
            学校名
            <input
              maxLength={80}
              value={form.details.school}
              onChange={(e) =>
                setForm({
                  ...form,
                  details: { ...form.details, school: e.target.value },
                })
              }
            />
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={form.details.schoolPublic}
              onChange={(e) =>
                setForm({
                  ...form,
                  details: { ...form.details, schoolPublic: e.target.checked },
                })
              }
            />
            <span>学校名を公開する（オフなら運営だけが見ます）</span>
          </label>
          {textFields.map(([k, label, long]) => (
            <label className="field" key={k}>
              {label}
              {long ? (
                <textarea
                  rows={3}
                  maxLength={500}
                  value={form.details[k] as string}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      details: { ...form.details, [k]: e.target.value },
                    })
                  }
                />
              ) : (
                <input
                  maxLength={200}
                  value={form.details[k] as string}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      details: { ...form.details, [k]: e.target.value },
                    })
                  }
                />
              )}
            </label>
          ))}
          <label className="field">
            エージェントの利用
            <select
              value={form.details.agentUsed}
              onChange={(e) =>
                setForm({
                  ...form,
                  details: {
                    ...form.details,
                    agentUsed: e.target.value as AdvisorDetails["agentUsed"],
                  },
                })
              }
            >
              <option value="">答えない</option>
              <option value="yes">利用した</option>
              <option value="no">利用していない</option>
            </select>
          </label>
          {[0, 1, 2].map((i) => (
            <label className="field" key={i}>
              外部記事リンク{i + 1}（https://）
              <input
                type="url"
                maxLength={300}
                value={form.details.links[i] || ""}
                onChange={(e) => {
                  const links = [0, 1, 2].map((j) =>
                    j === i ? e.target.value : form.details.links[j] || "",
                  );
                  setForm({ ...form, details: { ...form.details, links } });
                }}
              />
            </label>
          ))}
          {msg && (
            <p className="sessions-error" role="alert">
              {msg}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? "保存中…" : "有料相談の設定を保存"}
          </button>
        </form>
      )}
    </section>
  );
}

/* ---------- 経験者の表示（一覧・詳細・会話） ---------- */
export const isAdvisor = (advisors: PublicAdvisor[] | undefined, id?: string) =>
  !!id && !!advisors?.some((a) => a.userId === id);
export function AdvisorBadge() {
  return <span className="session-badge advisor">有料相談可</span>;
}
export function ConsultLink({ id }: { id: string }) {
  return (
    <Link className="button primary full" to={"/people/" + id + "/session/new"}>
      有料相談を申し込む（30分 3,500円）
    </Link>
  );
}
const agentLabel = { yes: "利用した", no: "利用していない", "": "" } as const;
export function AdvisorPublicInfo({ advisor }: { advisor: PublicAdvisor }) {
  const d = advisor.details;
  const rows: [string, string | undefined][] = [
    ["都市", d.city],
    ["学校", d.school],
    ["滞在先", d.stay],
    ["エージェント", d.agentUsed ? agentLabel[d.agentUsed] : ""],
    ["費用の目安", d.costNote],
    ["語学レベル", d.languageLevel],
    ["大変だったこと", d.hard],
    ["よかったこと", d.good],
    ["現在の所属", d.current],
    ["経歴", d.career],
    ["相談できる言語", d.languages],
    ["受けられる時間", advisor.availability],
  ];
  return (
    <section className="member-regions sessions-public">
      <h2>
        <BadgeCheck size={16} /> 運営確認済みの経験者
      </h2>
      <p className="sessions-note">
        運営が在籍・修了の書類を確認しています。経験の内容を保証するものではありません。
      </p>
      <dl>
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd className="pre">{v}</dd>
            </div>
          ))}
      </dl>
      {!!d.links?.length && (
        <ul>
          {d.links.map((l) => (
            <li key={l}>
              <a href={l} target="_blank" rel="noopener noreferrer nofollow">
                {l}
                <ExternalLink size={12} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- 会話内カード ---------- */
export function parseSessionCard(body: string) {
  const m = /^【有料相談】([\s\S]*?)\n\/sessions\/([\w-]+)\s*$/.exec(body);
  return m ? { text: m[1].trim(), id: m[2] } : null;
}
export function MessageBody({ body }: { body: string }) {
  const card = parseSessionCard(body);
  if (!card) return <div className="message-bubble">{body}</div>;
  return (
    <div className="message-bubble session-card">
      <strong>有料相談</strong>
      <span>{card.text}</span>
      <Link to={"/sessions/" + card.id}>相談の詳細を見る</Link>
    </div>
  );
}
export function RoomConsultButton({ peerId }: { peerId?: string }) {
  const { data } = useApp();
  if (
    !isAdvisor(data.advisors, peerId) ||
    !data.advisors?.find((a) => a.userId === peerId)?.accepting
  )
    return null;
  return (
    <div className="session-room-cta">
      <ConsultLink id={peerId!} />
    </div>
  );
}

/* ---------- ホームの案内 ---------- */
export function SessionNotice() {
  const { data } = useApp(),
    [item, setItem] = useState<SessionView | null>(null);
  const on = data.mode === "production" && !!data.user;
  useEffect(() => {
    if (!on) return;
    api<{ sessions: SessionView[] }>("/sessions")
      .then((r) => setItem(r.sessions.find((s) => needsAction(s)) ?? null))
      .catch(() => setItem(null));
  }, [on]);
  if (!item) return null;
  const text =
    item.role === "advisor" && item.status === "requested"
      ? peerName(item) + "さんから相談の申込みが届いています"
      : item.status === "accepted"
        ? "承認されました。お支払いで日時が確定します"
        : "まもなく相談が始まります（" + fmt(item.scheduledAt) + "）";
  return (
    <Link
      to={"/sessions/" + item.id}
      className="session-notice glass"
      role="status"
    >
      <CalendarClock size={18} />
      <span>{text}</span>
      <span className="session-badge urgent">開く</span>
    </Link>
  );
}
