import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";

/** 有料相談の管理画面（/advisors /sessions /payouts とダッシュボードのカード）。 */
export type PaidField = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
};
export type PaidDialog = {
  title: string;
  description?: string;
  fields?: PaidField[];
  submit?: string;
  danger?: boolean;
  onSubmit?: (v: Record<string, string>) => Promise<void> | void;
};
type Ctx = {
  setDialog: (d: PaidDialog | null) => void;
  notify: (s: string) => void;
};

const yen = (n: number) =>
  new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(
    n || 0,
  );
const when = (s?: string | null) => {
  if (!s) return "—";
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z");
  return isNaN(+d)
    ? s
    : d.toLocaleString("ja-JP", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Tokyo",
      });
};
async function api(path: string, method = "GET", body?: unknown) {
  const res = await fetch("/api/admin" + path, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "読み込めませんでした");
  return data;
}
function useLoad<T>(path: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api(path));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, error, loading, reload };
}
function Box({
  title,
  aside,
  children,
  className = "",
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={"panel " + className}>
      {title && (
        <div className="panel-heading">
          <h2>{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
function State({
  loading,
  error,
  reload,
}: {
  loading: boolean;
  error: string;
  reload: () => void;
}) {
  if (loading)
    return (
      <p className="subtle" role="status">
        読み込み中…
      </p>
    );
  if (!error) return null;
  return (
    <div role="alert">
      <p>{error}</p>
      <button className="btn" onClick={reload}>
        <RefreshCw size={16} />
        再読み込み
      </button>
    </div>
  );
}
function Tbl({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  if (!rows.length) return <p className="subtle">該当するデータがありません</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i}>
              {cells.map((cell, j) => (
                <td key={j} data-label={columns[j]}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const advisorLabel: Record<string, string> = {
  pending: "審査待ち",
  approved: "承認済み",
  rejected: "却下",
  suspended: "停止中",
};
const advisorBadge: Record<string, string> = {
  pending: "open",
  approved: "active",
  rejected: "cancelled",
  suspended: "suspended",
};
const sessionLabel: Record<string, string> = {
  requested: "申込",
  accepted: "承認",
  paid: "支払済み",
  completed: "実施済み",
  settled: "精算対象",
  declined: "辞退",
  expired: "期限切れ",
  cancelled: "キャンセル",
  refund_pending: "返金待ち",
  refunded: "返金済み",
  disputed: "問題報告あり",
};
const sessionBadge: Record<string, string> = {
  requested: "submitted",
  accepted: "accepted",
  paid: "confirmed",
  completed: "completed",
  settled: "verified",
  declined: "cancelled",
  expired: "cancelled",
  cancelled: "cancelled",
  refund_pending: "refund_pending",
  refunded: "refunded",
  disputed: "open",
};
const Tag = ({ cls, children }: { cls: string; children: ReactNode }) => (
  <span className={"badge badge-" + cls}>{children}</span>
);

export function PaidAdvisors({ setDialog, notify }: Ctx) {
  const { data, error, loading, reload } = useLoad<{ advisors: any[] }>(
    "/advisors",
  );
  const act = (a: any, action: "approve" | "reject" | "suspend" | "resume") => {
    const text = {
      approve: "承認する",
      reject: "却下する",
      suspend: "停止する",
      resume: "再開する",
    }[action];
    const needReason = action === "reject" || action === "suspend";
    setDialog({
      title: text,
      description:
        action === "approve"
          ? `${a.name}さんを承認します。確認書類は削除され、確認日と確認者だけが残ります。`
          : `${a.name}さんを${text.replace("する", "")}します。`,
      fields: needReason
        ? [
            {
              name: "reason",
              label:
                action === "reject" ? "却下の理由（本人に表示）" : "停止の理由",
              type: "textarea",
              maxLength: 300,
            },
          ]
        : undefined,
      submit: text,
      danger: action !== "approve" && action !== "resume",
      onSubmit: async (v) => {
        await api("/advisors/" + a.user_id, "PATCH", {
          action,
          reason: v.reason || "",
        });
        notify("保存しました");
        await reload();
      },
    });
  };
  const btn = (label: string, fn: () => void, danger = false) => (
    <button className={"btn " + (danger ? "btn-danger" : "")} onClick={fn}>
      {label}
    </button>
  );
  const rows = (data?.advisors || []).map((a) => [
    <div className="name-cell">
      <div>
        <strong>{a.name}</strong>
        <small>{a.email}</small>
      </div>
    </div>,
    <Tag cls={advisorBadge[a.status] || a.status}>
      {advisorLabel[a.status] || a.status}
    </Tag>,
    <span>{when(a.applied_at)}</span>,
    <span>
      {a.status === "approved" || a.status === "suspended"
        ? when(a.verified_at)
        : a.review_reason || "—"}
    </span>,
    <div
      className="row-actions"
      style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
    >
      {a.hasDocument && (
        <a
          className="btn"
          href={`/api/admin/advisors/${encodeURIComponent(a.user_id)}/document`}
          target="_blank"
          rel="noopener noreferrer"
        >
          書類を見る
          <ExternalLink size={14} aria-hidden="true" />
          <span className="sr-only">
            （新しいタブで開く・閲覧は記録されます）
          </span>
        </a>
      )}
      {a.status === "pending" && btn("承認", () => act(a, "approve"))}
      {a.status === "pending" && btn("却下", () => act(a, "reject"), true)}
      {a.status === "approved" && btn("停止", () => act(a, "suspend"), true)}
      {a.status === "suspended" && btn("再開", () => act(a, "resume"))}
    </div>,
  ]);
  return (
    <Box
      title="経験者の確認申請"
      aside={
        <button className="btn" onClick={reload}>
          <RefreshCw size={16} />
          更新
        </button>
      }
    >
      <State loading={loading} error={error} reload={reload} />
      {data && (
        <Tbl
          columns={["経験者", "状態", "申請日", "確認日・理由", "操作"]}
          rows={rows}
        />
      )}
    </Box>
  );
}

export function PaidSessions({ setDialog, notify }: Ctx) {
  const { data, error, loading, reload } = useLoad<{ sessions: any[] }>(
    "/sessions",
  );
  const [filter, setFilter] = useState("all"),
    [open, setOpen] = useState<any>(null),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const all = data?.sessions || [];
  const day = (s?: string | null) => {
    if (!s) return "";
    const d = new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z");
    return isNaN(+d)
      ? ""
      : new Date(+d + 9 * 3600e3).toISOString().slice(0, 10);
  };
  const list = all
    .filter((s) => filter === "all" || s.status === filter)
    .filter((s) => {
      const d = day(s.createdAt);
      return (!from || (d && d >= from)) && (!to || (d && d <= to));
    })
    .sort(
      (a, b) =>
        Number(b.status === "disputed") - Number(a.status === "disputed"),
    );
  const resolve = (s: any, action: "refund" | "pay_advisor") =>
    setDialog({
      title: action === "refund" ? "返金する" : "経験者に支払う",
      description:
        action === "refund"
          ? `${s.clientName}さんに ${yen(s.amount)} を全額返金します。取り消せません。`
          : `問題なしとして精算対象にし、${s.advisorName}さんへの支払いに含めます。`,
      fields: [
        {
          name: "note",
          label: "対応メモ（任意）",
          type: "textarea",
          required: false,
          maxLength: 300,
        },
      ],
      submit: action === "refund" ? "返金する" : "経験者に支払う",
      danger: action === "refund",
      onSubmit: async (v) => {
        await api("/sessions/" + s.id, "PATCH", { action, note: v.note || "" });
        notify("保存しました");
        setOpen(null);
        await reload();
      },
    });
  const rows = list.map((s) => [
    <Tag cls={sessionBadge[s.status] || s.status}>
      {sessionLabel[s.status] || s.status}
    </Tag>,
    <span>{s.advisorName}</span>,
    <span>{s.clientName}</span>,
    <span>{when(s.scheduledAt)}</span>,
    <span>{yen(s.amount)}</span>,
    <button
      className="btn"
      onClick={() => setOpen(s)}
      aria-label={`${s.clientName}さんの相談の詳細`}
    >
      詳細
    </button>,
  ]);
  return (
    <>
      <Box
        title="有料相談"
        aside={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label className="status-filter">
              <span className="sr-only">状態で絞り込み</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">すべての状態</option>
                {Object.entries(sessionLabel).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="status-filter">
              <span className="sr-only">申込日（開始）</span>
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <span
              className="subtle"
              aria-hidden="true"
              style={{ alignSelf: "center" }}
            >
              〜
            </span>
            <label className="status-filter">
              <span className="sr-only">申込日（終了）</span>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <button className="btn" onClick={reload}>
              <RefreshCw size={16} />
              更新
            </button>
          </div>
        }
      >
        <State loading={loading} error={error} reload={reload} />
        {data && (
          <Tbl
            columns={["状態", "経験者", "利用者", "実施日時", "金額", "操作"]}
            rows={rows}
          />
        )}
      </Box>
      {open && (
        <Box
          title="相談の詳細"
          aside={
            <button className="btn" onClick={() => setOpen(null)}>
              閉じる
            </button>
          }
          className="paid-detail"
        >
          <dl>
            {[
              ["状態", sessionLabel[open.status] || open.status],
              ["経験者", open.advisorName],
              ["利用者", open.clientName],
              ["相談内容", open.topic],
              ["実施日時", when(open.scheduledAt)],
              ["金額", yen(open.amount)],
              ["問題の報告", open.reportReason || "—"],
              ["対応メモ", open.resolution || "—"],
              [
                "経験者への支払い",
                open.payoutPaidAt ? when(open.payoutPaidAt) + " 済" : "—",
              ],
            ].map(([k, v]) => (
              <div key={k as string} style={{ marginBottom: 8 }}>
                <dt className="subtle">{k}</dt>
                <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{v}</dd>
              </div>
            ))}
          </dl>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["disputed", "refund_pending"].includes(open.status) && (
              <button
                className="btn btn-danger"
                onClick={() => resolve(open, "refund")}
              >
                返金する
              </button>
            )}
            {open.status === "disputed" && (
              <button
                className="btn btn-primary"
                onClick={() => resolve(open, "pay_advisor")}
              >
                経験者に支払う
              </button>
            )}
          </div>
        </Box>
      )}
    </>
  );
}

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
export function PaidPayouts({ setDialog, notify }: Ctx) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const valid = /^\d{4}-\d{2}$/.test(month);
  const { data, error, loading, reload } = useLoad<{
    month: string;
    payouts: any[];
  }>("/payouts?month=" + (valid ? month : ""));
  const list = data?.payouts || [];
  const download = () => {
    const lines = [
      ["経験者", "メール", "件数", "支払額(円)", "支払状況"],
      ...list.map((p) => [
        p.name,
        p.email,
        p.count,
        p.total,
        p.paid ? "支払済み" : "未払い",
      ]),
    ];
    const blob = new Blob(
      ["﻿" + lines.map((l) => l.map(csvCell).join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `payouts-${data?.month || month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const pay = (p: any) =>
    setDialog({
      title: "支払済みにする",
      description: `${p.name}さんへ ${yen(p.total)}（${p.count}件）を振り込んだ後に実行してください。`,
      submit: "支払済みにする",
      onSubmit: async () => {
        await api("/payouts", "POST", {
          month: data?.month || month,
          advisorId: p.advisorId,
        });
        notify("保存しました");
        await reload();
      },
    });
  const rows = list.map((p) => [
    <div className="name-cell">
      <div>
        <strong>{p.name}</strong>
        <small>{p.email}</small>
      </div>
    </div>,
    <span>{p.count}件</span>,
    <span>{yen(p.total)}</span>,
    p.paid ? <Tag cls="verified">支払済み</Tag> : <Tag cls="open">未払い</Tag>,
    p.paid ? (
      <span className="subtle">—</span>
    ) : (
      <button
        className="btn btn-primary"
        onClick={() => pay(p)}
        aria-label={`${p.name}さんを支払済みにする`}
      >
        支払済みにする
      </button>
    ),
  ]);
  return (
    <Box
      title="月末の精算"
      aside={
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <label>
            <span className="sr-only">対象月</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </label>
          <button className="btn" onClick={download} disabled={!list.length}>
            CSVを書き出す
          </button>
        </div>
      }
    >
      <p className="subtle">
        実施日が対象月の「精算対象」の相談を、経験者ごとに集計します。合計{" "}
        {yen(list.reduce((a, p) => a + p.total, 0))}
      </p>
      <State loading={loading} error={error} reload={reload} />
      {data && (
        <Tbl
          columns={["経験者", "件数", "支払額", "状況", "操作"]}
          rows={rows}
        />
      )}
    </Box>
  );
}

/** ダッシュボード用：状態ごとの件数と売上・支払予定額。 */
export function PaidSummaryCard() {
  const { data, error, loading } = useLoad<{ summary: any[] }>("/sessions");
  const by = (s: string) =>
    (data?.summary || []).find((r) => r.status === s) || {
      n: 0,
      amount: 0,
      advisor: 0,
      fee: 0,
    };
  const sum = (ss: string[], k: string) =>
    ss.reduce((a, s) => a + (by(s)[k] || 0), 0);
  const steps: [string, number][] = [
    ["申込", sum(["requested"], "n")],
    ["承認", sum(["accepted"], "n")],
    ["支払", sum(["paid"], "n")],
    ["実施", sum(["completed", "settled"], "n")],
    ["返金", sum(["refunded", "refund_pending"], "n")],
  ];
  const paidStates = ["paid", "completed", "settled"];
  return (
    <Box title="有料相談">
      <State loading={loading} error={error} reload={() => location.reload()} />
      {data && (
        <>
          <ol
            className="metric-grid"
            style={{ listStyle: "none", padding: 0, margin: 0 }}
            aria-label="有料相談の件数"
          >
            {steps.map(([l, n]) => (
              <li className="metric" key={l}>
                <div>
                  <span>{l}</span>
                </div>
                <strong>
                  {n}
                  <small>件</small>
                </strong>
              </li>
            ))}
          </ol>
          <p>
            売上（支払済み〜精算対象）
            <strong>{yen(sum(paidStates, "amount"))}</strong>
          </p>
          <p>
            経験者への支払予定額{" "}
            <strong>
              {yen(
                sum(["paid", "completed"], "advisor") +
                  sum(["settled"], "advisor"),
              )}
            </strong>
          </p>
          {by("disputed").n > 0 && (
            <p role="status">問題報告あり {by("disputed").n}件</p>
          )}
        </>
      )}
    </Box>
  );
}

const yenN = (r?: { n: number; total: number }) =>
  r ? `${r.n}件・${yen(r.total)}` : "0件";

/** 会員詳細に表示する有料相談の状況。 */
export function MemberPaidInfo({ id }: { id: string }) {
  const { data, error, loading, reload } = useLoad<{
    advisor: {
      status: string;
      accepting: number | boolean;
      verifiedAt?: string | null;
      verifiedBy?: string | null;
    } | null;
    asAdvisor: { status: string; n: number; total: number }[];
    asClient: { status: string; n: number; total: number }[];
  }>("/advisors/" + encodeURIComponent(id) + "/summary");
  if (loading || error)
    return <State loading={loading} error={error} reload={reload} />;
  if (!data) return null;
  const a = data.advisor;
  const sum = (l: { n: number; total: number }[]) => ({
    n: l.reduce((x, r) => x + r.n, 0),
    total: l.reduce((x, r) => x + r.total, 0),
  });
  const find = (
    l: { status: string; n: number; total: number }[],
    st: string[],
  ) => sum(l.filter((r) => st.includes(r.status)));
  const done = find(data.asAdvisor, ["completed"]);
  const settled = find(data.asAdvisor, ["settled"]);
  const disputed = find(data.asAdvisor, ["disputed", "refund_pending"]);
  const clientAll = sum(data.asClient);
  return (
    <div className="notice" style={{ marginTop: 12 }}>
      <strong>有料相談</strong>
      {!a ? (
        <p style={{ margin: "4px 0" }}>有料相談の申請なし</p>
      ) : (
        <>
          <p style={{ margin: "4px 0" }}>
            承認状態：
            <Tag cls={advisorBadge[a.status] || a.status}>
              {advisorLabel[a.status] || a.status}
            </Tag>
            {a.accepting ? "（受付中）" : ""}
          </p>
          <p style={{ margin: "4px 0" }}>
            確認日：{when(a.verifiedAt)}／確認者：{a.verifiedBy || "—"}
          </p>
          <p style={{ margin: "4px 0" }}>
            経験者として：全{sum(data.asAdvisor).n}件（実施済み {yenN(done)}
            ／精算済み {yenN(settled)}／問題・返金対応 {yenN(disputed)}）
          </p>
        </>
      )}
      <p style={{ margin: "4px 0" }}>利用者として：{yenN(clientAll)}</p>
    </div>
  );
}

/** 経験者の外部リンク一覧と差し戻し。 */
export function PaidAdvisorLinks({ setDialog, notify }: Ctx) {
  const { data, error, loading, reload } = useLoad<{ advisors: any[] }>(
    "/advisors",
  );
  const list = (data?.advisors || []).filter(
    (a) => Array.isArray(a.details?.links) && a.details.links.length,
  );
  const clear = (a: any) =>
    setDialog({
      title: "外部リンクを差し戻す",
      description: `${a.name}さんの外部リンクをすべて削除します。理由は記録されます。`,
      fields: [
        {
          name: "reason",
          label: "差し戻しの理由",
          type: "textarea",
          required: true,
          maxLength: 300,
        },
      ],
      submit: "差し戻す",
      danger: true,
      onSubmit: async (v) => {
        await api("/advisors/" + a.user_id, "PATCH", {
          action: "clear_links",
          reason: v.reason || "",
        });
        notify("保存しました");
        await reload();
      },
    });
  return (
    <Box
      title="経験者の外部リンク"
      aside={
        <button className="btn" onClick={reload}>
          <RefreshCw size={16} />
          更新
        </button>
      }
    >
      <State loading={loading} error={error} reload={reload} />
      {data && !list.length && (
        <p className="subtle">外部リンクを登録している経験者はいません</p>
      )}
      {list.map((a) => (
        <div
          key={a.user_id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            padding: "8px 0",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <strong>{a.name}</strong>
            <ul style={{ margin: "4px 0", paddingLeft: 18 }}>
              {a.details.links.map((u: string) => (
                <li key={u} style={{ overflowWrap: "anywhere" }}>
                  <a href={u} target="_blank" rel="noopener noreferrer">
                    {u}
                    <span className="sr-only">（新しいタブで開く）</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <button className="btn btn-danger" onClick={() => clear(a)}>
            差し戻す
          </button>
        </div>
      ))}
    </Box>
  );
}
