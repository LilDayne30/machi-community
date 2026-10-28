import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  Menu,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  sampleData,
  previewKey,
  previewMutation,
  type AdminData,
  type Row,
} from "./model";
const money = (n: number) =>
  new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(
    n,
  );
const date = (s?: string) =>
  s
    ? new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z").toLocaleString(
        "ja-JP",
        {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Tokyo",
        },
      )
    : "—";
const image = "https://images.unsplash.com/photo-1442512595331-e89e73853f31";
const labels: Record<string, string> = {
  active: "利用中",
  suspended: "利用停止",
  member: "会員",
  provider: "事業者",
  admin: "管理者",
  pending: "未入金",
  confirmed: "参加確定",
  attended: "参加済み",
  cancelled: "キャンセル",
  refund_pending: "返金待ち",
  refunded: "返金済み",
  open: "未対応",
  resolved: "対応済み",
  submitted: "受付",
  accepted: "受諾",
  completed: "有料成立",
  sent: "送信済み",
  published: "公開中",
  draft: "非公開",
  verified: "確認済み",
  unverified: "未確認",
};
const actions: Record<string, string> = {
  publish_talk: "トークを公開",
  update_talk: "トークを更新",
  cancel_talk: "トークを中止",
  save_costs: "原価を保存",
  invite_member: "招待を登録",
  revoke_invitation: "招待を取消",
  resolve_report: "通報に対応",
  register_provider: "事業者を登録",
  publish_note: "メモを公開",
  update_note: "メモを更新",
  create_room: "小部屋を作成",
  meeting: "会議リンクを共有",
  retry_email: "メールを再試行",
  classify_reports: "通報をAIで分類",
  verified: "事業者を確認",
  unverified: "事業者の確認を解除",
  attended: "参加を記録",
  refunded: "返金を実行",
  "member:suspended": "会員の利用を停止",
  "member:active": "会員の利用を再開",
  "consultation:accepted": "相談を受諾",
  "consultation:completed": "相談の有料成立を記録",
  "consultation:cancelled": "相談をキャンセル",
};
const nav: { path: string; label: string; icon: LucideIcon }[] = [
  { path: "/", label: "概要", icon: LayoutDashboard },
  { path: "/members", label: "会員・招待", icon: Users },
  { path: "/talks", label: "トーク・小部屋", icon: CalendarDays },
  { path: "/bookings", label: "予約・返金", icon: ClipboardList },
  { path: "/reports", label: "通報", icon: ShieldCheck },
  { path: "/consultations", label: "プロ相談", icon: MessageCircle },
  { path: "/providers", label: "事業者", icon: BookOpen },
  { path: "/notes", label: "現地メモ", icon: BookOpen },
  { path: "/emails", label: "メール配信", icon: Mail },
  { path: "/costs", label: "採算", icon: Wallet },
  { path: "/logs", label: "操作履歴", icon: Activity },
];
type Field = {
  name: string;
  label: string;
  type?: string;
  value?: string | number;
  options?: string[];
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
};
type Dialog = {
  title: string;
  description?: string;
  fields?: Field[];
  submit?: string;
  danger?: boolean;
  content?: ReactNode;
  onSubmit?: (v: Record<string, string>) => Promise<void> | void;
};
async function request(path: string, method = "GET", body?: unknown) {
  const res = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data: any = await res.json();
  if (!res.ok) throw new Error(data.error || "読み込めませんでした");
  return data;
}
function Badge({ status, children }: { status: string; children?: ReactNode }) {
  return (
    <span className={"badge badge-" + status}>
      {children || labels[status] || status}
    </span>
  );
}
function Button({
  children,
  onClick,
  primary = false,
  danger = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      className={
        "btn " + (primary ? "btn-primary " : "") + (danger ? "btn-danger" : "")
      }
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
function Panel({
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
function Empty({
  children = "該当するデータがありません",
}: {
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <ClipboardList size={28} />
      <p>{children}</p>
    </div>
  );
}
function Table({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  return rows.length ? (
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
  ) : (
    <Empty />
  );
}
function DialogView({
  dialog,
  onClose,
  onError,
  restoreFocus,
}: {
  restoreFocus: HTMLElement | null;
  dialog: Dialog;
  onClose: () => void;
  onError: (s: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null),
    [busy, setBusy] = useState(false),
    busyRef = useRef(false);
  busyRef.current = busy;
  useEffect(() => {
    const previous = restoreFocus;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current
      ?.querySelector<HTMLElement>("input,textarea,select,button")
      ?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busyRef.current) onClose();
      if (e.key === "Tab") {
        const items = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input,textarea,select,[href]",
          ) || [],
        );
        if (!items.length) return;
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  return (
    <motion.div
      className="dialog-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        ref={ref}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        initial={{ y: 30, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
      >
        <div className="dialog-head">
          <h2 id="dialog-title">{dialog.title}</h2>
          <button
            className="icon-btn"
            aria-label="閉じる"
            onClick={onClose}
            disabled={busy}
          >
            <X size={20} />
          </button>
        </div>
        {dialog.description && <p className="subtle">{dialog.description}</p>}
        {dialog.content}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await dialog.onSubmit?.(
                Object.fromEntries(new FormData(e.currentTarget)) as Record<
                  string,
                  string
                >,
              );
              onClose();
            } catch (e) {
              onError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="fields">
            {dialog.fields?.map((f) => (
              <label key={f.name}>
                {f.label}
                {f.type === "textarea" ? (
                  <textarea
                    name={f.name}
                    defaultValue={f.value}
                    required={f.required !== false}
                    minLength={f.minLength}
                    maxLength={f.maxLength || 3000}
                    rows={4}
                  />
                ) : f.options ? (
                  <select name={f.name} defaultValue={f.value}>
                    {f.options.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={f.name}
                    type={f.type || "text"}
                    defaultValue={f.value}
                    required={f.required !== false}
                    min={f.min}
                    max={f.max}
                    minLength={f.minLength}
                    maxLength={f.maxLength || 200}
                  />
                )}
              </label>
            ))}
          </div>
          <div className="dialog-footer">
            <button
              type="button"
              className="btn"
              onClick={onClose}
              disabled={busy}
            >
              {dialog.submit ? "キャンセル" : "閉じる"}
            </button>
            {dialog.submit && (
              <button
                className={
                  "btn " + (dialog.danger ? "btn-danger" : "btn-primary")
                }
                disabled={busy}
              >
                {busy ? "保存中…" : dialog.submit}
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
export default function App() {
  const [data, setData] = useState<AdminData | null>(null),
    [mode, setMode] = useState<"preview" | "live" | "locked">("locked"),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [dialog, updateDialog] = useState<Dialog | null>(null),
    [menu, setMenu] = useState(false),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all");
  const location = useLocation(),
    navigate = useNavigate(),
    heading = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  function setDialog(next: Dialog | null) {
    if (next && !dialog)
      returnFocus.current = document.activeElement as HTMLElement;
    updateDialog(next);
  }
  const current = nav.find((n) => n.path === location.pathname) || nav[0];
  const notify = (s: string) => setToast(s);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const session = await request("/admin/session");
      if (session.authenticated) {
        setData(await request("/admin"));
        setMode("live");
      } else if (import.meta.env.DEV) {
        let d = sampleData();
        try {
          const saved = JSON.parse(localStorage.getItem(previewKey) || "null");
          if (saved?.members && saved?.logs) d = saved;
        } catch {
          /* Discard invalid local sample state. */
        }
        setData(d);
        setMode("preview");
      } else {
        setData(null);
        setMode("locked");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    setMenu(false);
    setQuery("");
    setFilter("all");
    document.title = current.label + " | Roamigo 運営管理";
    window.scrollTo(0, 0);
    heading.current?.focus();
  }, [location.pathname]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  async function mutate(path: string, method = "PATCH", body?: unknown) {
    if (!data) throw new Error("データがありません");
    if (
      path === "/meeting" &&
      new URL((body as { url: string }).url).protocol !== "https:"
    )
      throw new Error("HTTPSの会議リンクを指定してください");
    if (mode === "preview") {
      const next = previewMutation(data, path, method, body);
      localStorage.setItem(previewKey, JSON.stringify(next));
      setData(next);
    } else {
      await request("/admin" + path, method, body);
      setData(await request("/admin"));
    }
    notify(mode === "preview" ? "サンプルに保存しました" : "保存しました");
  }
  const run = (path: string, method = "PATCH", body?: unknown) =>
    void mutate(path, method, body).catch((e) => notify(e.message));
  const confirm = (
    title: string,
    description: string,
    path: string,
    body: unknown,
    fields?: Field[],
    method = "PATCH",
  ) =>
    setDialog({
      title,
      description,
      fields,
      submit: title,
      danger: true,
      onSubmit: async (v) => {
        await mutate(path, method, { ...(body as object), ...v });
      },
    });
  const newForm = (
    kind: "talks" | "notes" | "providers" | "invitations",
    row?: Row,
  ) => {
    const titles = {
      talks: "地域トーク",
      notes: "現地メモ",
      providers: "事業者",
      invitations: "会員の招待",
    };
    const fields: Record<string, Field[]> = {
      invitations: [
        { name: "email", label: "Googleアカウントのメール", type: "email" },
      ],
      talks: [
        { name: "title", label: "タイトル", value: row?.title, maxLength: 100 },
        {
          name: "category",
          label: "分類",
          options: ["喫茶店", "街歩き", "古本屋"],
          value: row?.category,
        },
        {
          name: "host",
          label: "進行役",
          value: row?.host || "運営",
          maxLength: 40,
        },
        ...(!row
          ? [
              {
                name: "startsAt",
                label: "日時（日本時間）",
                type: "datetime-local",
              },
              {
                name: "capacity",
                label: "定員",
                type: "number",
                value: 6,
                min: 4,
                max: 6,
              },
              {
                name: "price",
                label: "参加費（円・初回無料）",
                type: "number",
                value: 1000,
                min: 0,
                max: 100000,
              },
            ]
          : []),
        {
          name: "description",
          label: "トークの内容",
          type: "textarea",
          value: row?.description,
          minLength: 10,
          maxLength: 2000,
        },
      ],
      notes: [
        { name: "title", label: "タイトル", value: row?.title, maxLength: 100 },
        {
          name: "body",
          label: "メモの内容",
          type: "textarea",
          value: row?.body,
        },
        {
          name: "verifiedAt",
          label: "情報確認日",
          type: "date",
          value: row?.verified_at || new Date().toISOString().slice(0, 10),
        },
        {
          name: "relation",
          label: "お店・事業との関係",
          value: row?.relation || "お店との利害関係なし",
        },
      ],
      providers: [
        { name: "name", label: "事業者名", maxLength: 100 },
        { name: "email", label: "登録済み会員のメール", type: "email" },
        { name: "theme", label: "話せるテーマ", maxLength: 100 },
        { name: "price", label: "料金の表示", maxLength: 100 },
        {
          name: "bio",
          label: "事業者の紹介",
          type: "textarea",
          maxLength: 1000,
        },
      ],
    };
    setDialog({
      title:
        titles[kind] +
        (row ? "を編集" : kind === "invitations" ? "" : "を登録"),
      description:
        kind === "invitations"
          ? "30日間有効。招待メールは自動送信されません。登録後、アプリのURLを本人に共有してください。"
          : row && kind === "talks"
            ? "予約に関わる日時・定員・料金は変更できません。変更が必要な場合は中止して新しく募集してください。"
            : undefined,
      fields: fields[kind],
      submit: row
        ? "変更を保存"
        : kind === "invitations"
          ? "招待を登録"
          : kind === "talks" || kind === "notes"
            ? "公開する"
            : "登録する",
      onSubmit: async (v) => {
        let b: any = v;
        if (!row && kind === "talks") {
          const startsAt = new Date(v.startsAt + "+09:00").toISOString();
          if (Date.parse(startsAt) <= Date.now())
            throw new Error("未来の開催日時を指定してください");
          b = {
            ...v,
            startsAt,
            capacity: Number(v.capacity),
            price: Number(v.price),
            duration: 45,
            image,
          };
        }
        if (!row && kind === "notes") b = { ...v, category: "喫茶店", image };
        await mutate(
          "/" + kind + (row ? "/" + row.id : ""),
          row ? "PATCH" : "POST",
          b,
        );
      },
    });
  };
  if (loading)
    return (
      <div className="loading" role="status" aria-label="管理画面を読み込み中">
        <div className="skeleton-side" />
        <div className="skeleton-main">
          <div className="skeleton-line" />
          <div className="skeleton-metrics">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} />
            ))}
          </div>
          <div className="skeleton-panel" />
        </div>
        <span className="sr-only">管理画面を読み込み中</span>
      </div>
    );
  if (error)
    return (
      <main className="locked">
        <CircleAlert size={34} />
        <h1>管理画面を読み込めませんでした</h1>
        <p>{error}</p>
        <Button primary onClick={() => void load()}>
          再読み込み
        </Button>
      </main>
    );
  if (!data || mode === "locked")
    return (
      <main className="locked">
        <div className="brand-icon">
          <LockKeyhole />
        </div>
        <h1>管理者ログインは保留中です</h1>
        <p>管理サイトの公開は、管理者認証の設定後に有効になります。</p>
        <a className="btn" href="https://machi-community.danaoki30.workers.dev">
          利用者サイトへ
          <ArrowUpRight size={16} />
        </a>
      </main>
    );
  const outstanding = data.reports.filter((r) => r.status === "open").length;
  const matches = (r: Row) =>
    JSON.stringify(r).toLowerCase().includes(query.toLowerCase());
  const toolbar = (options?: [string, string][]) => (
    <div className="toolbar">
      <label className="search">
        <Search size={18} />
        <span className="sr-only">この画面を検索</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="名前・タイトルなどで検索"
        />
      </label>
      {options && (
        <label className="status-filter">
          <SlidersHorizontal size={16} />
          <span className="sr-only">状態で絞り込み</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">すべての状態</option>
            {options.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
  const name = (r: Row, sub?: string) => (
    <div className="name-cell">
      <span className="mini-avatar">{r.name?.slice(0, 1) || "M"}</span>
      <div>
        <strong>{r.name}</strong>
        {sub && <small>{sub}</small>}
      </div>
    </div>
  );
  const badgeFor = (r: Row) =>
    r.cancelled_at ? "cancelled" : r.published ? "published" : "draft";
  const pendingEmails = data.emails.filter((e) => e.status !== "sent").length;
  const refundCount = data.bookings.filter(
    (b) => b.status === "refund_pending",
  ).length;
  const pendingConsults = data.consultations.filter(
    (c) => c.status === "submitted",
  ).length;
  const costs = data.costs,
    net =
      data.metrics.gross -
      data.metrics.refunds -
      costs.fees -
      costs.reward -
      costs.labor;
  return (
    <>
      <div className="admin-shell" inert={!!dialog}>
        {menu && (
          <button
            className="menu-overlay"
            aria-label="メニューを閉じる"
            onClick={() => setMenu(false)}
          />
        )}
        <aside
          className={"sidebar " + (menu ? "sidebar-open" : "")}
          id="admin-navigation"
        >
          <a href="/" className="brand">
            <span className="brand-icon">R</span>
            <span>
              Roamigo<small>運営管理</small>
            </span>
          </a>
          <div className="workspace">
            <span className="workspace-dot" />
            <div>
              {mode === "preview" ? "サンプル環境" : "管理環境"}
              <small>
                {mode === "preview" ? "このブラウザに保存" : "Cloudflare D1"}
              </small>
            </div>
            <ShieldCheck size={17} />
          </div>
          <nav aria-label="管理メニュー">
            {nav.map((n) => (
              <NavLink
                key={n.path}
                to={n.path}
                end={n.path === "/"}
                onClick={() => setMenu(false)}
              >
                <n.icon size={19} />
                <span>{n.label}</span>
                {n.path === "/reports" && outstanding > 0 && (
                  <span className="nav-count">{outstanding}</span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <a
              className="site-link"
              href={
                import.meta.env.DEV
                  ? "http://127.0.0.1:5173"
                  : "https://machi-community.danaoki30.workers.dev"
              }
            >
              利用者サイト
              <ArrowUpRight size={16} />
            </a>
            <div className="operator">
              <span className="mini-avatar operator-avatar">
                <ShieldCheck size={18} />
              </span>
              <div>
                <strong>
                  {mode === "preview" ? "サンプル運営者" : "管理者"}
                </strong>
                <small>管理者ログインは保留中</small>
              </div>
            </div>
          </div>
        </aside>
        <div className="workspace-main">
          <header className="topbar">
            <div className="topbar-left">
              <button
                className="icon-btn mobile-menu"
                aria-label="管理メニューを開く"
                aria-expanded={menu}
                aria-controls="admin-navigation"
                onClick={() => setMenu(!menu)}
              >
                <Menu size={21} />
              </button>
              <span>運営管理</span>
              <ChevronRight size={15} />
              <strong>{current.label}</strong>
            </div>
            <div className="topbar-right">
              <span className="today">
                {new Date().toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  weekday: "short",
                })}
              </span>
              <button
                className="icon-btn"
                aria-label="データを更新"
                onClick={() => void load()}
              >
                <RefreshCw size={17} />
              </button>
            </div>
          </header>
          {mode === "preview" && (
            <div className="preview-bar">
              <span>
                <span className="preview-dot" />
                <strong>サンプル</strong>
                <span className="preview-detail">実データは変更されません</span>
              </span>
              <button
                onClick={() =>
                  setDialog({
                    title: "サンプルをリセット",
                    description:
                      "このブラウザで行ったサンプル操作を初期状態に戻します。",
                    submit: "リセットする",
                    danger: true,
                    onSubmit: () => {
                      localStorage.removeItem(previewKey);
                      setData(sampleData());
                      notify("サンプルをリセットしました");
                    },
                  })
                }
              >
                リセット
              </button>
            </div>
          )}
          <main id="main-content">
            <div className="page-heading">
              <div>
                <p className="eyebrow">
                  WORKSPACE /{" "}
                  {String(nav.indexOf(current) + 1).padStart(2, "0")}
                </p>
                <h1 ref={heading} tabIndex={-1}>
                  {current.label}
                </h1>
              </div>
              {current.path === "/members" ? (
                <Button primary onClick={() => newForm("invitations")}>
                  <Plus size={17} />
                  会員を招待
                </Button>
              ) : current.path === "/talks" ? (
                <Button primary onClick={() => newForm("talks")}>
                  <Plus size={17} />
                  トークを作成
                </Button>
              ) : current.path === "/notes" ? (
                <Button primary onClick={() => newForm("notes")}>
                  <Plus size={17} />
                  メモを作成
                </Button>
              ) : current.path === "/providers" ? (
                <Button primary onClick={() => newForm("providers")}>
                  <Plus size={17} />
                  事業者を登録
                </Button>
              ) : null}
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                data-page={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.16 }}
              >
                {current.path === "/" && (
                  <>
                    <div className="overview-banner">
                      <div>
                        <span className="live-label">
                          <span />
                          運営状況
                        </span>
                        <h2>
                          確認が必要な項目{" "}
                          <strong>
                            {outstanding + refundCount + pendingConsults}
                          </strong>
                          <span>件</span>
                        </h2>
                        <p>
                          通報 {outstanding} · 返金待ち {refundCount} · 新着相談{" "}
                          {pendingConsults}
                        </p>
                      </div>
                      <div className="banner-icon">
                        <ShieldCheck size={64} strokeWidth={1} />
                      </div>
                    </div>
                    <div className="metric-grid">
                      {[
                        ["登録会員", data.members.length, "人", Users],
                        [
                          "トーク予約",
                          data.metrics.bookings,
                          "件",
                          CalendarDays,
                        ],
                        [
                          "14日後の再接点",
                          data.metrics.reconnections,
                          "件",
                          MessageCircle,
                        ],
                        ["参加費入金", money(data.metrics.gross), "", Wallet],
                      ].map(([l, v, unit, Icon]) => {
                        const I = Icon as LucideIcon;
                        return (
                          <div className="metric" key={l as string}>
                            <div>
                              <span>{l as string}</span>
                              <I size={18} />
                            </div>
                            <strong>
                              {v as ReactNode}
                              <small>{unit as string}</small>
                            </strong>
                          </div>
                        );
                      })}
                    </div>
                    <div className="overview-grid">
                      <Panel
                        title="対応待ち"
                        aside={
                          <span className="small-tag">
                            {outstanding + refundCount + pendingConsults}件
                          </span>
                        }
                      >
                        <div className="task-list">
                          {[
                            [
                              "通報の確認",
                              outstanding,
                              "/reports",
                              ShieldCheck,
                              "amber",
                            ],
                            [
                              "返金の対応",
                              refundCount,
                              "/bookings",
                              ArrowDownLeft,
                              "rose",
                            ],
                            [
                              "プロ相談の確認",
                              pendingConsults,
                              "/consultations",
                              MessageCircle,
                              "blue",
                            ],
                            [
                              "メールの配信待ち",
                              pendingEmails,
                              "/emails",
                              Mail,
                              "sage",
                            ],
                          ].map(([l, n, path, I, color]) => {
                            const Icon = I as LucideIcon;
                            return (
                              <button
                                key={path as string}
                                className="task-row"
                                onClick={() => navigate(path as string)}
                              >
                                <span className={"task-icon " + color}>
                                  <Icon size={19} />
                                </span>
                                <span>{l as string}</span>
                                <strong>
                                  {n as number}
                                  <small>件</small>
                                </strong>
                                <ChevronRight size={17} />
                              </button>
                            );
                          })}
                        </div>
                      </Panel>
                      <Panel
                        title="次の地域トーク"
                        aside={
                          <button
                            className="text-btn"
                            onClick={() => navigate("/talks")}
                          >
                            すべて見る
                            <ArrowUpRight size={15} />
                          </button>
                        }
                      >
                        <div className="upcoming">
                          {data.talks
                            .filter(
                              (t) =>
                                !t.cancelled_at &&
                                t.published &&
                                Date.parse(t.starts_at) > Date.now(),
                            )
                            .sort(
                              (a, b) =>
                                Date.parse(a.starts_at) -
                                Date.parse(b.starts_at),
                            )
                            .slice(0, 3)
                            .map((t) => (
                              <button
                                key={t.id}
                                onClick={() => navigate("/talks")}
                              >
                                <span className="date-tile">
                                  <small>
                                    {new Date(t.starts_at).toLocaleDateString(
                                      "ja-JP",
                                      { month: "short" },
                                    )}
                                  </small>
                                  <strong>
                                    {new Date(t.starts_at)
                                      .toLocaleDateString("ja-JP", {
                                        day: "numeric",
                                        timeZone: "Asia/Tokyo",
                                      })
                                      .replace("日", "")}
                                  </strong>
                                </span>
                                <span>
                                  <strong>{t.title}</strong>
                                  <small>
                                    {date(t.starts_at)} · {t.duration}分
                                  </small>
                                  <span className="occupancy">
                                    <i
                                      style={{
                                        width:
                                          Math.min(
                                            100,
                                            (t.occupied / t.capacity) * 100,
                                          ) + "%",
                                      }}
                                    />
                                  </span>
                                  <small>
                                    {t.occupied} / {t.capacity}人
                                  </small>
                                </span>
                                <ChevronRight size={18} />
                              </button>
                            ))}
                          {!data.talks.some(
                            (t) =>
                              t.published &&
                              !t.cancelled_at &&
                              Date.parse(t.starts_at) > Date.now(),
                          ) && <Empty>開催予定のトークはありません</Empty>}
                        </div>
                      </Panel>
                    </div>
                    <div className="overview-grid">
                      <Panel
                        title="収支"
                        aside={
                          <button
                            className="text-btn"
                            onClick={() => navigate("/costs")}
                          >
                            採算を開く
                            <ArrowUpRight size={15} />
                          </button>
                        }
                      >
                        <div className="finance-summary">
                          <div>
                            <small>参加費入金</small>
                            <strong>{money(data.metrics.gross)}</strong>
                          </div>
                          <div>
                            <small>原価・返金</small>
                            <strong>
                              {money(
                                costs.fees +
                                  costs.reward +
                                  costs.labor +
                                  data.metrics.refunds,
                              )}
                            </strong>
                          </div>
                          <div className="net">
                            <small>差額</small>
                            <strong>{money(net)}</strong>
                          </div>
                        </div>
                      </Panel>
                      <Panel title="接続状況">
                        <div className="connection-list">
                          {[
                            ["決済 / Stripe", data.connections.stripe],
                            ["メール / Resend", data.connections.email],
                            ["AI / Workers AI", data.connections.ai],
                          ].map(([n, v]) => (
                            <div key={n as string}>
                              <span>{n as string}</span>
                              <Badge status={v ? "active" : "draft"}>
                                {mode === "preview"
                                  ? "サンプル"
                                  : v
                                    ? "設定あり"
                                    : "未接続"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </Panel>
                    </div>
                  </>
                )}
                {current.path === "/members" && (
                  <>
                    {toolbar([
                      ["active", "利用中"],
                      ["suspended", "利用停止"],
                    ])}
                    <Panel title={"会員 " + data.members.length + "人"}>
                      <Table
                        columns={["会員", "国籍 / 街", "権限", "状態", "操作"]}
                        rows={data.members
                          .filter(matches)
                          .filter(
                            (m) =>
                              filter === "all" || m.account_status === filter,
                          )
                          .map((m) => [
                            name(m, m.email),
                            <>
                              <strong>
                                {m.profile.nationality || "未登録"}
                              </strong>
                              <small>{m.profile.city || "街は未登録"}</small>
                            </>,
                            <Badge status={m.role} />,
                            <Badge status={m.account_status} />,
                            <Button
                              onClick={() =>
                                setDialog({
                                  title: m.name,
                                  content: (
                                    <>
                                      <div className="detail-grid">
                                        <span>メール</span>
                                        <strong>{m.email}</strong>
                                        <span>国籍 / 街</span>
                                        <strong>
                                          {m.profile.nationality} /{" "}
                                          {m.profile.city || "—"}
                                        </strong>
                                        <span>興味のある地域</span>
                                        <strong>
                                          {(
                                            m.profile.interestedRegions || []
                                          ).join("、") || "未登録"}
                                        </strong>
                                      </div>
                                      <p>{m.profile.bio}</p>
                                      {m.status_reason && (
                                        <p className="notice">
                                          変更理由：{m.status_reason}
                                        </p>
                                      )}
                                      {m.role === "admin" ? (
                                        <p className="notice">
                                          管理者の指定は設定ファイルで管理します。
                                        </p>
                                      ) : (
                                        <Button
                                          danger={
                                            m.account_status !== "suspended"
                                          }
                                          onClick={() =>
                                            confirm(
                                              m.account_status === "suspended"
                                                ? "利用を再開"
                                                : "利用を停止",
                                              "利用停止時はログイン済みのセッションも無効になります。",
                                              "/members/" + m.id,
                                              {
                                                status:
                                                  m.account_status ===
                                                  "suspended"
                                                    ? "active"
                                                    : "suspended",
                                              },
                                              [
                                                {
                                                  name: "reason",
                                                  label: "変更理由",
                                                  type: "textarea",
                                                  minLength: 3,
                                                  maxLength: 300,
                                                },
                                              ],
                                            )
                                          }
                                        >
                                          {m.account_status === "suspended"
                                            ? "利用を再開"
                                            : "利用を停止"}
                                        </Button>
                                      )}
                                    </>
                                  ),
                                })
                              }
                            >
                              詳細
                            </Button>,
                          ])}
                      />
                    </Panel>
                    <Panel title="招待">
                      <Table
                        columns={[
                          "メール",
                          "有効期限（日本時間）",
                          "状態",
                          "操作",
                        ]}
                        rows={data.invitations.filter(matches).map((i) => [
                          i.email,
                          date(i.expires_at),
                          <Badge
                            status={
                              i.used_at
                                ? "completed"
                                : Date.parse(i.expires_at) > Date.now()
                                  ? "active"
                                  : "cancelled"
                            }
                          >
                            {i.used_at
                              ? "登録済み"
                              : Date.parse(i.expires_at) > Date.now()
                                ? "有効"
                                : "期限切れ"}
                          </Badge>,
                          !i.used_at &&
                          Date.parse(i.expires_at) > Date.now() ? (
                            <Button
                              onClick={() =>
                                setDialog({
                                  title: "招待を取り消す",
                                  description: i.email,
                                  submit: "招待を取り消す",
                                  danger: true,
                                  onSubmit: () =>
                                    mutate(
                                      "/invitations/" +
                                        encodeURIComponent(i.email),
                                      "DELETE",
                                    ),
                                })
                              }
                            >
                              取り消す
                            </Button>
                          ) : (
                            "—"
                          ),
                        ])}
                      />
                    </Panel>
                  </>
                )}
                {current.path === "/talks" && (
                  <>
                    {toolbar([
                      ["published", "公開中"],
                      ["draft", "非公開"],
                      ["cancelled", "中止"],
                    ])}
                    <div className="talk-grid">
                      {data.talks
                        .filter(matches)
                        .filter(
                          (t) => filter === "all" || badgeFor(t) === filter,
                        )
                        .map((t) => (
                          <Panel key={t.id} className="talk-card">
                            <div className="talk-top">
                              <span className="talk-category">
                                <CalendarDays size={16} />
                                {t.category}
                              </span>
                              <Badge status={badgeFor(t)}>
                                {t.cancelled_at ? "中止" : undefined}
                              </Badge>
                            </div>
                            <h2>{t.title}</h2>
                            <p className="talk-date">
                              {date(t.starts_at)} <small>日本時間</small>
                            </p>
                            <p className="subtle">
                              {t.duration}分 · {money(t.price)} · 初回無料
                            </p>
                            <div className="talk-host">
                              <span className="mini-avatar">
                                {t.host.slice(0, 1)}
                              </span>
                              <span>
                                進行役 <strong>{t.host}</strong>
                              </span>
                              <span className="talk-seats">
                                {t.occupied} / {t.capacity}人
                              </span>
                            </div>
                            {t.meeting_url && (
                              <p className="notice">会議リンク設定済み</p>
                            )}
                            <div className="card-actions">
                              <Button
                                disabled={!!t.cancelled_at}
                                onClick={() => newForm("talks", t)}
                              >
                                編集
                              </Button>
                              <Button
                                disabled={!!t.cancelled_at}
                                onClick={() =>
                                  run("/talks/" + t.id, "PATCH", {
                                    published: !t.published,
                                  })
                                }
                              >
                                {t.published ? "非公開にする" : "公開する"}
                              </Button>
                              <button
                                className="text-btn danger-text"
                                disabled={!!t.cancelled_at}
                                onClick={() =>
                                  confirm(
                                    "トークを中止",
                                    "参加予約をキャンセルし、決済済みの予約を返金待ちにします。参加者への通知は配信キューに追加されます。",
                                    "/talks/" + t.id + "/cancel",
                                    {},
                                    [
                                      {
                                        name: "reason",
                                        label: "中止理由",
                                        type: "textarea",
                                        minLength: 3,
                                        maxLength: 500,
                                      },
                                    ],
                                    "POST",
                                  )
                                }
                              >
                                中止
                              </button>
                            </div>
                            <button
                              className="meeting-btn"
                              disabled={!!t.cancelled_at}
                              onClick={() =>
                                setDialog({
                                  title: "会議リンクを共有",
                                  description:
                                    "参加確定済みの参加者へメールで共有します。",
                                  fields: [
                                    {
                                      name: "url",
                                      label: "会議リンク（HTTPS）",
                                      type: "url",
                                      value: t.meeting_url,
                                    },
                                  ],
                                  submit: "共有する",
                                  onSubmit: (v) =>
                                    mutate("/meeting", "POST", {
                                      talkId: t.id,
                                      ...v,
                                    }),
                                })
                              }
                            >
                              <ExternalLink size={15} />
                              会議リンクを共有
                            </button>
                          </Panel>
                        ))}
                    </div>
                    {!data.talks
                      .filter(matches)
                      .filter((t) => filter === "all" || badgeFor(t) === filter)
                      .length && <Empty />}
                    <Panel
                      title="地域トークの小部屋"
                      aside={
                        <Button
                          onClick={() => {
                            let selected: string[] = [];
                            setDialog({
                              title: "小部屋を作成",
                              description:
                                "同じトークから参加確定・参加済みの4〜6人を選択します。",
                              fields: [
                                {
                                  name: "title",
                                  label: "小部屋名",
                                  maxLength: 100,
                                },
                              ],
                              content: (
                                <div className="booking-checks">
                                  {data.bookings
                                    .filter((b) =>
                                      ["confirmed", "attended"].includes(
                                        b.status,
                                      ),
                                    )
                                    .map((b) => (
                                      <label key={b.id}>
                                        <input
                                          type="checkbox"
                                          onChange={(e) => {
                                            selected = e.target.checked
                                              ? [...selected, b.id]
                                              : selected.filter(
                                                  (id) => id !== b.id,
                                                );
                                          }}
                                        />
                                        <span>
                                          {b.name}
                                          <small>{b.talk_title}</small>
                                        </span>
                                      </label>
                                    ))}
                                </div>
                              ),
                              submit: "小部屋を作成",
                              onSubmit: (v) =>
                                mutate("/rooms", "POST", {
                                  ...v,
                                  bookingIds: selected,
                                }),
                            });
                          }}
                        >
                          <Plus size={16} />
                          小部屋を作成
                        </Button>
                      }
                    >
                      <p className="panel-note">
                        個人間の会話はここに表示しません。小部屋の会話本文も管理画面では閲覧できません。
                      </p>
                      <Table
                        columns={["小部屋名", "人数", "作成日時"]}
                        rows={data.rooms.map((r) => [
                          <strong>{r.title}</strong>,
                          r.member_count + "人",
                          date(r.created_at),
                        ])}
                      />
                    </Panel>
                  </>
                )}
                {current.path === "/bookings" && (
                  <>
                    {toolbar(
                      Object.entries(labels).filter(([k]) =>
                        [
                          "pending",
                          "confirmed",
                          "attended",
                          "cancelled",
                          "refund_pending",
                          "refunded",
                        ].includes(k),
                      ),
                    )}
                    <div className="summary-strip">
                      <span>
                        予約 <strong>{data.bookings.length}件</strong>
                      </span>
                      <span>
                        返金待ち <strong>{refundCount}件</strong>
                      </span>
                      <span>
                        返金済み <strong>{money(data.metrics.refunds)}</strong>
                      </span>
                    </div>
                    <Panel title="予約一覧">
                      <Table
                        columns={["参加者", "トーク", "金額", "状態", "操作"]}
                        rows={data.bookings
                          .filter(matches)
                          .filter(
                            (b) => filter === "all" || b.status === filter,
                          )
                          .map((b) => [
                            name(b),
                            b.talk_title || b.talkId,
                            money(b.amount),
                            <Badge status={b.status} />,
                            b.status === "confirmed" ? (
                              <Button
                                onClick={() =>
                                  run("/bookings/" + b.id, "PATCH", {
                                    status: "attended",
                                  })
                                }
                              >
                                <Check size={15} />
                                参加を記録
                              </Button>
                            ) : b.status === "refund_pending" ? (
                              <Button
                                onClick={() =>
                                  confirm(
                                    "返金を実行",
                                    b.name +
                                      " / " +
                                      money(b.amount) +
                                      "。決済サービスで返金処理を行います。",
                                    "/bookings/" + b.id,
                                    { status: "refunded" },
                                  )
                                }
                              >
                                返金する
                              </Button>
                            ) : (
                              "—"
                            ),
                          ])}
                      />
                    </Panel>
                  </>
                )}
                {current.path === "/reports" && (
                  <>
                    {toolbar([
                      ["open", "未対応"],
                      ["resolved", "対応済み"],
                    ])}
                    <div className="notice">
                      <ShieldCheck size={18} />
                      <span>
                        通報された投稿のみ表示します。AIの提案は補助情報として扱い、対応は運営者が判断します。
                      </span>
                      <Button
                        onClick={() =>
                          setDialog({
                            title: "AIで確認を補助",
                            description:
                              "未対応の通報を最大10件、Cloudflare Workers AIに送信して分類します。対応状態は変更しません。",
                            submit: "分類する",
                            onSubmit: () => mutate("/classify", "POST", {}),
                          })
                        }
                      >
                        AIで分類
                      </Button>
                    </div>
                    <div className="record-list">
                      {data.reports
                        .filter(matches)
                        .filter((r) => filter === "all" || r.status === filter)
                        .map((r) => (
                          <Panel key={r.id}>
                            <div className="record-header">
                              <div>
                                <span className="eyebrow">
                                  通報 / {date(r.created_at)}
                                </span>
                                <h2>{r.reason}</h2>
                              </div>
                              <Badge status={r.status} />
                            </div>
                            <blockquote>{r.body}</blockquote>
                            {r.ai_suggestion && (
                              <p className="notice">
                                AIの提案：{r.ai_suggestion}
                              </p>
                            )}
                            <div className="record-footer">
                              <small>通報 ID：{r.id}</small>
                              {r.status === "open" && (
                                <Button
                                  primary
                                  onClick={() =>
                                    setDialog({
                                      title: "対応済みにする",
                                      description:
                                        "投稿内容を確認し、必要な対応を完了した場合に記録してください。",
                                      submit: "対応済みにする",
                                      onSubmit: () =>
                                        mutate("/reports/" + r.id, "PATCH", {
                                          status: "resolved",
                                        }),
                                    })
                                  }
                                >
                                  <Check size={16} />
                                  対応済みにする
                                </Button>
                              )}
                            </div>
                          </Panel>
                        ))}
                    </div>
                    {!data.reports
                      .filter(matches)
                      .filter((r) => filter === "all" || r.status === filter)
                      .length && <Empty />}
                  </>
                )}
                {current.path === "/consultations" && (
                  <>
                    {toolbar([
                      ["submitted", "受付"],
                      ["accepted", "受諾"],
                      ["completed", "有料成立"],
                      ["cancelled", "キャンセル"],
                    ])}
                    <div className="record-list">
                      {data.consultations
                        .filter(matches)
                        .filter((c) => filter === "all" || c.status === filter)
                        .map((c) => (
                          <Panel key={c.id}>
                            <div className="record-header">
                              <div>
                                <span className="eyebrow">
                                  {c.name || c.user_id} →{" "}
                                  {c.provider_name || c.provider_id}
                                </span>
                                <h2>{c.title}</h2>
                              </div>
                              <Badge status={c.status} />
                            </div>
                            <p>{c.body}</p>
                            <div className="summary-strip">
                              <span>
                                予算 <strong>{c.budget}</strong>
                              </span>
                              <span>
                                希望日 <strong>{c.desired_date}</strong>
                              </span>
                            </div>
                            <details>
                              <summary>本人が共有を許可した投稿</summary>
                              <SharedMessages value={c.shared_messages} />
                            </details>
                            <div className="card-actions">
                              {c.status === "submitted" && (
                                <Button
                                  primary
                                  onClick={() =>
                                    run("/consultations/" + c.id, "PATCH", {
                                      status: "accepted",
                                    })
                                  }
                                >
                                  受諾を記録
                                </Button>
                              )}
                              {c.status === "accepted" && (
                                <Button
                                  primary
                                  onClick={() =>
                                    setDialog({
                                      title: "有料成立を記録",
                                      description:
                                        "事業者が直接受領した有料サービスの成立を確認して記録します。",
                                      submit: "有料成立を記録",
                                      onSubmit: () =>
                                        mutate(
                                          "/consultations/" + c.id,
                                          "PATCH",
                                          { status: "completed" },
                                        ),
                                    })
                                  }
                                >
                                  有料成立を記録
                                </Button>
                              )}
                              {["submitted", "accepted"].includes(c.status) && (
                                <Button
                                  onClick={() =>
                                    confirm(
                                      "相談をキャンセル",
                                      "依頼者・事業者との調整結果を記録します。",
                                      "/consultations/" + c.id,
                                      { status: "cancelled" },
                                    )
                                  }
                                >
                                  キャンセル
                                </Button>
                              )}
                            </div>
                          </Panel>
                        ))}
                    </div>
                    {!data.consultations
                      .filter(matches)
                      .filter((c) => filter === "all" || c.status === filter)
                      .length && <Empty />}
                  </>
                )}
                {current.path === "/providers" && (
                  <>
                    {toolbar([
                      ["verified", "確認済み"],
                      ["unverified", "未確認"],
                    ])}
                    <div className="record-list">
                      {data.providers
                        .filter(matches)
                        .filter(
                          (p) =>
                            filter === "all" ||
                            (p.verified ? "verified" : "unverified") === filter,
                        )
                        .map((p) => (
                          <Panel key={p.id}>
                            <div className="record-header">
                              <div>
                                <span className="eyebrow">{p.theme}</span>
                                <h2>{p.name}</h2>
                              </div>
                              <Badge
                                status={p.verified ? "verified" : "unverified"}
                              />
                            </div>
                            <p>{p.bio}</p>
                            <div className="record-footer">
                              <strong>{p.price}</strong>
                              <Button
                                primary={!p.verified}
                                onClick={() =>
                                  setDialog({
                                    title: p.verified
                                      ? "確認を解除"
                                      : "事業者を確認済みにする",
                                    description: p.verified
                                      ? "相談先一覧での表示を停止します。"
                                      : "事業者の立場と料金、本人の登録内容を確認したうえで記録してください。",
                                    submit: p.verified
                                      ? "確認を解除"
                                      : "確認済みにする",
                                    onSubmit: () =>
                                      mutate("/providers/" + p.id, "PATCH", {
                                        status: p.verified
                                          ? "unverified"
                                          : "verified",
                                      }),
                                  })
                                }
                              >
                                <ShieldCheck size={16} />
                                {p.verified ? "確認を解除" : "確認済みにする"}
                              </Button>
                            </div>
                          </Panel>
                        ))}
                    </div>
                    {!data.providers
                      .filter(matches)
                      .filter(
                        (p) =>
                          filter === "all" ||
                          (p.verified ? "verified" : "unverified") === filter,
                      ).length && <Empty />}
                  </>
                )}
                {current.path === "/notes" && (
                  <>
                    {toolbar([
                      ["published", "公開中"],
                      ["draft", "非公開"],
                    ])}
                    <div className="record-list">
                      {data.notes
                        .filter(matches)
                        .filter(
                          (n) =>
                            filter === "all" ||
                            (n.published ? "published" : "draft") === filter,
                        )
                        .map((n) => (
                          <Panel key={n.id}>
                            <div className="record-header">
                              <div>
                                <span className="eyebrow">
                                  情報確認日 {n.verified_at}
                                </span>
                                <h2>{n.title}</h2>
                              </div>
                              <Badge
                                status={n.published ? "published" : "draft"}
                              />
                            </div>
                            <p className="note-body">{n.body}</p>
                            <p className="subtle">{n.relation}</p>
                            <div className="card-actions">
                              <Button onClick={() => newForm("notes", n)}>
                                編集
                              </Button>
                              <Button
                                onClick={() =>
                                  run("/notes/" + n.id, "PATCH", {
                                    published: !n.published,
                                  })
                                }
                              >
                                {n.published ? "非公開にする" : "公開する"}
                              </Button>
                            </div>
                          </Panel>
                        ))}
                    </div>
                    {!data.notes
                      .filter(matches)
                      .filter(
                        (n) =>
                          filter === "all" ||
                          (n.published ? "published" : "draft") === filter,
                      ).length && <Empty />}
                  </>
                )}
                {current.path === "/emails" && (
                  <>
                    {toolbar([
                      ["sent", "送信済み"],
                      ["pending", "配信待ち"],
                    ])}
                    <p className="notice">
                      再試行は配信キューに戻します。送信済みのメールは再送できません。
                    </p>
                    <Panel title="配信キュー">
                      <Table
                        columns={[
                          "宛先 / 件名",
                          "状態",
                          "試行回数",
                          "作成日時",
                          "操作",
                        ]}
                        rows={data.emails
                          .filter(matches)
                          .filter(
                            (m) => filter === "all" || m.status === filter,
                          )
                          .map((m) => [
                            <>
                              <strong>{m.subject}</strong>
                              <small>{m.recipient}</small>
                            </>,
                            <Badge
                              status={
                                m.status === "sent"
                                  ? "sent"
                                  : m.attempts >= 5
                                    ? "refund_pending"
                                    : "draft"
                              }
                            >
                              {m.status === "sent"
                                ? "送信済み"
                                : m.attempts >= 5
                                  ? "要確認"
                                  : "配信待ち"}
                            </Badge>,
                            m.attempts + "回",
                            date(m.created_at),
                            m.status !== "sent" ? (
                              <Button
                                onClick={() =>
                                  setDialog({
                                    title: "メールの配信を再試行",
                                    description:
                                      m.recipient + " / " + m.subject,
                                    submit: "再試行する",
                                    onSubmit: () =>
                                      mutate(
                                        "/emails/" +
                                          encodeURIComponent(m.id) +
                                          "/retry",
                                        "POST",
                                        {},
                                      ),
                                  })
                                }
                              >
                                再試行
                              </Button>
                            ) : (
                              "—"
                            ),
                          ])}
                      />
                    </Panel>
                  </>
                )}
                {current.path === "/costs" && (
                  <div className="cost-grid">
                    <Panel title="原価を記録">
                      <p className="panel-note">
                        これまでの運営原価の累計を入力します。保存のたびに最新の値へ更新します。
                      </p>
                      <form
                        key={JSON.stringify(costs)}
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const v = Object.fromEntries(
                            new FormData(e.currentTarget),
                          );
                          try {
                            await mutate(
                              "/costs",
                              "POST",
                              Object.fromEntries(
                                Object.entries(v).map(([k, v]) => [
                                  k,
                                  Number(v),
                                ]),
                              ),
                            );
                          } catch (e) {
                            notify((e as Error).message);
                          }
                        }}
                      >
                        <div className="fields">
                          {[
                            ["fees", "決済手数料"],
                            ["reward", "進行役への謝礼"],
                            ["labor", "調整の人件費"],
                          ].map(([n, l]) => (
                            <label key={n}>
                              {l}
                              <div className="input-unit">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  required
                                  name={n}
                                  defaultValue={costs[n as keyof typeof costs]}
                                />
                                <span>円</span>
                              </div>
                            </label>
                          ))}
                        </div>
                        <button className="btn btn-primary">原価を保存</button>
                      </form>
                    </Panel>
                    <Panel title="運営採算">
                      <dl className="cost-breakdown">
                        <div>
                          <dt>参加費入金</dt>
                          <dd>{money(data.metrics.gross)}</dd>
                        </div>
                        <div>
                          <dt>返金済み</dt>
                          <dd>− {money(data.metrics.refunds)}</dd>
                        </div>
                        <div>
                          <dt>決済手数料</dt>
                          <dd>− {money(costs.fees)}</dd>
                        </div>
                        <div>
                          <dt>進行役への謝礼</dt>
                          <dd>− {money(costs.reward)}</dd>
                        </div>
                        <div>
                          <dt>調整の人件費</dt>
                          <dd>− {money(costs.labor)}</dd>
                        </div>
                        <div className="cost-total">
                          <dt>差額</dt>
                          <dd>{money(net)}</dd>
                        </div>
                      </dl>
                      <p className="subtle">
                        返金待ちは返金済みになるまで差し引きません。プロのサービス代金は事業者が直接受領するため集計に含みません。
                      </p>
                    </Panel>
                  </div>
                )}
                {current.path === "/logs" && (
                  <>
                    {toolbar()}
                    <Panel title="管理操作の履歴">
                      <Table
                        columns={["操作", "実行者", "対象 ID", "日時"]}
                        rows={data.logs
                          .filter(matches)
                          .map((l) => [
                            <strong>{actions[l.action] || l.action}</strong>,
                            l.actor_name,
                            <code>{l.target_id}</code>,
                            date(l.created_at),
                          ])}
                      />
                    </Panel>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
            <footer className="page-footer">
              <span>Roamigo / 運営管理</span>
              <span>
                表示日時は日本時間 · 取得上限：会員500件 / その他100〜300件
              </span>
            </footer>
          </main>
        </div>
      </div>
      <AnimatePresence mode="wait">
        {dialog && (
          <DialogView
            key={dialog.title}
            dialog={dialog}
            restoreFocus={returnFocus.current}
            onClose={() => setDialog(null)}
            onError={notify}
          />
        )}
      </AnimatePresence>
      <div className="toast-area" role="status" aria-live="polite">
        {toast && (
          <motion.div
            className="toast"
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <Check size={17} />
            {toast}
          </motion.div>
        )}
      </div>
    </>
  );
}
function SharedMessages({ value }: { value: string | any[] }) {
  let rows: any[] = [];
  try {
    rows = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    /* Empty if legacy data cannot be parsed. */
  }
  return rows?.length ? (
    <div>
      {rows.map((r, i) => (
        <blockquote key={i}>
          {r.body || r.text || "投稿 ID：" + (r.id || r)}
        </blockquote>
      ))}
    </div>
  ) : (
    <p className="subtle">共有された投稿はありません</p>
  );
}
