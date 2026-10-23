import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { X, ArrowUpRight, Check, MapPin, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import { dateLabel, yen, type Person, type Talk } from "../lib/data";
export function Avatar({
  name,
  color = "#dce6de",
  small = false,
  src,
}: {
  name: string;
  color?: string;
  small?: boolean;
  src?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <span
      aria-hidden="true"
      className={`avatar ${small ? "small" : ""}`}
      style={{ background: color }}
    >
      {src && !failed ? (
        <img
          src={src}
          alt=""
          width={108}
          height={108}
          onError={() => setFailed(true)}
        />
      ) : (
        name.slice(0, 1)
      )}
    </span>
  );
}
export function People({ people }: { people: Person[] }) {
  return (
    <div className="people-stack">
      {people.slice(0, 4).map((p) => (
        <Avatar
          key={p.name}
          name={p.name}
          color={p.color}
          src={p.avatarUrl}
          small
        />
      ))}
    </div>
  );
}
export function Heading({
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}
export function SectionTitle({
  title,
  to,
  label = "すべて見る",
  count,
}: {
  title: string;
  to?: string;
  label?: string;
  count?: string;
}) {
  return (
    <div className="section-title">
      <h2>
        {title}
        {count && <span className="count">{count}</span>}
      </h2>
      {to && (
        <Link to={to}>
          {label}
          <ArrowUpRight size={15} />
        </Link>
      )}
    </div>
  );
}
export function Skeleton() {
  return (
    <div className="skeleton-page" aria-label="読み込み中" role="status">
      <div className="sk sk-title" />
      <div className="sk sk-subtitle" />
      <div className="sk sk-hero" />
      <div className="sk-row">
        <div className="sk" />
        <div className="sk" />
      </div>
      <div className="sk sk-line" />
      <div className="sk-row">
        <div className="sk sk-card" />
        <div className="sk sk-card" />
        <div className="sk sk-card" />
      </div>
      <span className="sr-only">読み込み中</span>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const old = document.activeElement as HTMLElement;
    const style = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]',
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = style;
      document.removeEventListener("keydown", key);
      old?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="modal glass"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
        tabIndex={-1}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="閉じる">
            <X size={20} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
export function TalkCard({
  talk,
  compact = false,
}: {
  talk: Talk;
  compact?: boolean;
}) {
  return (
    <Link
      to={"/talks/" + talk.id}
      className={`talk-card glass ${compact ? "compact" : ""}`}
    >
      <div className="talk-photo">
        <img src={talk.image} alt="" width={640} height={400} loading="lazy" />
        <span className="photo-badge">
          <span className="live-dot" />
          オンライン
        </span>
        <div className="photo-arrow">
          <ArrowUpRight size={19} />
        </div>
      </div>
      <div className="talk-content">
        <div className="talk-date">
          <Clock3 size={13} />
          {dateLabel(talk.date)}
          <span>{talk.time}〜</span>
        </div>
        <h3>{talk.title}</h3>
        <div className="tags">
          <span>{talk.category}</span>
          <span>{talk.duration}分</span>
          <span>進行役あり</span>
        </div>
        <div className="talk-bottom">
          <div className="inline">
            <People people={talk.participants} />
            <span className="muted">
              {talk.occupied}/{talk.capacity}人
            </span>
          </div>
          <strong>
            {yen(talk.price)}
            <small>初回無料</small>
          </strong>
        </div>
      </div>
    </Link>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty glass">
      <MapPin size={26} />
      <p>{children}</p>
    </div>
  );
}
export function CheckChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={"chip " + (selected ? "selected" : "")}
      aria-pressed={selected}
      onClick={onClick}
    >
      {selected && <Check size={13} />}
      {children}
    </button>
  );
}
