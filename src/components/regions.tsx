import { AnimatePresence, motion } from "motion/react";
import { MapPin, Plus, X, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  countries,
  regions,
  getRegion,
  regionLabel,
  residenceLabels,
  purposeLabels,
  type RegionConnection,
} from "../lib/regions";

export function RegionPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
}) {
  const selected = getRegion(value),
    countryId = selected?.parentId || selected?.id || "";
  const cities = regions.filter((r) => r.parentId === countryId);
  return (
    <div className="form-row region-picker">
      <label className="field">
        {label}の国・地域
        <select value={countryId} onChange={(e) => onChange(e.target.value)}>
          <option value="">未登録</option>
          {[...countries]
            .sort((a, b) => a.name.localeCompare(b.name, "ja"))
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
        </select>
      </label>
      <label className="field">
        {label}の街（任意）
        <select
          value={selected?.kind === "city" ? value : ""}
          disabled={!countryId || !cities.length}
          onChange={(e) => onChange(e.target.value || countryId)}
        >
          <option value="">国・地域まで登録</option>
          {cities.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
export function ResidenceEditor({
  value,
  onChange,
}: {
  value: RegionConnection[];
  onChange: (c: RegionConnection[]) => void;
}) {
  const current = value.find((c) => c.status === "current"),
    others = value.filter((c) => c.status !== "current");
  function primary(regionId: string) {
    onChange([
      ...(regionId
        ? [
            {
              regionId,
              status: "current" as const,
              purpose: current?.purpose || ("" as const),
              since: current?.since ?? null,
              until: null,
            },
          ]
        : []),
      ...others,
    ]);
  }
  function update(index: number, next: RegionConnection) {
    onChange([
      ...(current ? [current] : []),
      ...others.map((c, i) => (i === index ? next : c)),
    ]);
  }
  return (
    <section className="residence-editor" aria-label="地域との関わり">
      <div className="residence-section-heading">
        <MapPin size={18} />
        <h3>地域との関わり</h3>
        <span className="pill">任意</span>
      </div>
      <fieldset className="residence-entry primary-residence">
        <legend>今住んでいる地域</legend>
        <RegionPicker
          label="現在の居住地"
          value={current?.regionId || ""}
          onChange={primary}
        />
        {current && (
          <ConnectionMeta
            label="現在の居住地"
            connection={current}
            onChange={(next) => onChange([next, ...others])}
          />
        )}
      </fieldset>
      <AnimatePresence initial={false}>
        {others.map((c, i) => (
          <motion.fieldset
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="residence-entry"
            key={i}
          >
            <legend>地域との関わり {i + 1}</legend>
            <button
              type="button"
              className="residence-remove"
              aria-label={`地域との関わり ${i + 1}を削除`}
              onClick={() => onChange(value.filter((item) => item !== c))}
            >
              <X size={17} />
            </button>
            <label className="field">
              関わり {i + 1}
              <select
                value={c.status}
                onChange={(e) =>
                  update(i, {
                    ...c,
                    status: e.target.value as "former" | "stay",
                  })
                }
              >
                <option value="former">以前住んでいた</option>
                <option value="stay">一時滞在中</option>
              </select>
            </label>
            <RegionPicker
              label={`地域 ${i + 1}`}
              value={c.regionId}
              onChange={(regionId) => update(i, { ...c, regionId })}
            />
            <ConnectionMeta
              label={`地域 ${i + 1}`}
              connection={c}
              onChange={(next) => update(i, next)}
            />
          </motion.fieldset>
        ))}
      </AnimatePresence>
      {value.length < 8 && (
        <button
          type="button"
          className="button subtle small-button"
          onClick={() =>
            onChange([
              ...value,
              {
                regionId: "",
                status: "former",
                purpose: "",
                since: null,
                until: null,
              },
            ])
          }
        >
          <Plus size={15} />
          過去の居住地・滞在先を追加
        </button>
      )}
      <small className="muted">
        国籍と居住地は別々に登録できます。国・地域だけの登録もできます。
      </small>
    </section>
  );
}
function ConnectionMeta({
  label,
  connection: c,
  onChange,
}: {
  label: string;
  connection: RegionConnection;
  onChange: (c: RegionConnection) => void;
}) {
  return (
    <div className="residence-meta">
      <label className="field">
        {label}での目的
        <select
          value={c.purpose}
          onChange={(e) =>
            onChange({
              ...c,
              purpose: e.target.value as RegionConnection["purpose"],
            })
          }
        >
          {Object.entries(purposeLabels).map(([value, name]) => (
            <option key={value} value={value}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {label}の開始年
        <input
          type="number"
          min={1900}
          max={2100}
          placeholder="任意"
          value={c.since ?? ""}
          onChange={(e) =>
            onChange({
              ...c,
              since: e.target.value === "" ? null : Number(e.target.value),
            })
          }
        />
      </label>
      {c.status !== "current" && (
        <label className="field">
          {label}の終了年
          <input
            type="number"
            min={1900}
            max={2100}
            placeholder="任意"
            value={c.until ?? ""}
            onChange={(e) =>
              onChange({
                ...c,
                until: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </label>
      )}
    </div>
  );
}
export function ResidenceLinks({
  connections,
  compact = false,
}: {
  connections: RegionConnection[];
  compact?: boolean;
}) {
  const rank = { current: 0, former: 1, stay: 2 };
  const ordered = [...connections].sort(
    (a, b) => rank[a.status] - rank[b.status],
  );
  const visible = compact ? ordered.slice(0, 2) : ordered;
  return (
    <div className="residence-links">
      {visible.map((c) => (
        <Link
          key={c.regionId + ":" + c.status}
          to={`/people?place=${encodeURIComponent(c.regionId)}&status=${c.status}`}
          className={`residence-link ${c.status}`}
        >
          <MapPin size={13} />
          <span>
            <strong>{regionLabel(c.regionId)}</strong>
            <small>
              {residenceLabels[c.status]}
              {c.purpose && " · " + purposeLabels[c.purpose]}
              {!compact && (c.since || c.until)
                ? ` · ${c.since === null ? "" : c.since + "年"}〜${c.until === null ? "" : c.until + "年"}`
                : ""}
            </small>
          </span>
          <ArrowUpRight size={13} />
        </Link>
      ))}
      {compact && connections.length > 2 && (
        <small className="muted">ほか{connections.length - 2}地域</small>
      )}
    </div>
  );
}
