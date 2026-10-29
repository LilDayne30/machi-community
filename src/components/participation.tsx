import { useRef } from "react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Globe2,
  GraduationCap,
  Plus,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { RegionPicker } from "./regions";
import { CheckChip } from "./ui";
import { getRegion, regionLabel } from "../lib/regions";
import {
  emptyParticipation,
  experienceLabel,
  localKinds,
  participationOf,
  participationRoles,
  studyFormats,
  studyLevels,
  studyStages,
  studyTopics,
  type Participation,
  type StudyExperience,
} from "../lib/participation";

export function ParticipationEditor({
  value,
  onChange,
  acceptsMessages,
}: {
  value?: Participation;
  onChange: (p: Participation) => void;
  acceptsMessages?: boolean;
}) {
  const p =
    value || emptyParticipation(acceptsMessages ? ["local"] : ["explorer"]);
  const touch = useRef(0);
  const stages = Object.keys(studyStages) as (keyof typeof studyStages)[];
  function move(step: number) {
    const i = stages.indexOf(p.stage);
    onChange({
      ...p,
      stage: stages[Math.max(0, Math.min(stages.length - 1, i + step))],
    });
  }
  function updateExperience(index: number, patch: Partial<StudyExperience>) {
    onChange({
      ...p,
      experiences: p.experiences.map((e, i) =>
        i === index ? { ...e, ...patch } : e,
      ),
    });
  }
  return (
    <section
      className="profile-section glass participation-editor"
      id="profile-participation"
      aria-labelledby="profile-participation-title"
    >
      <div className="form-section-heading">
        <span className="action-icon">
          <GraduationCap size={22} />
        </span>
        <div>
          <h2 id="profile-participation-title">参加する立場</h2>
          <p>複数選べます。選んだ立場の項目がプロフィールに表示されます。</p>
        </div>
      </div>
      <div
        className="participation-role-options"
        role="group"
        aria-label="参加する立場"
      >
        {Object.entries(participationRoles).map(([role, label]) => {
          const selected = p.roles.includes(
            role as keyof typeof participationRoles,
          );
          const Icon =
            role === "explorer"
              ? BookOpen
              : role === "alumni"
                ? GraduationCap
                : Globe2;
          return (
            <label
              key={role}
              className={`participation-role ${selected ? "selected" : ""}`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() =>
                  onChange({
                    ...p,
                    roles: selected
                      ? p.roles.filter((r) => r !== role)
                      : [...p.roles, role as keyof typeof participationRoles],
                  })
                }
              />
              <Icon size={21} />
              <span>{label}</span>
              {selected && <Check size={16} aria-hidden="true" />}
            </label>
          );
        })}
      </div>
      {p.roles.includes("explorer") && (
        <fieldset className="participation-fields">
          <legend>留学を考える・準備する人</legend>
          <label className="field">
            留学の検討状況
            <select
              value={p.stage}
              onChange={(e) =>
                onChange({
                  ...p,
                  stage: e.target.value as Participation["stage"],
                })
              }
            >
              {Object.entries(studyStages).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <div
            className="study-stage"
            aria-label="検討状況のフリック切替"
            onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - touch.current;
              if (Math.abs(dx) > 45) move(dx < 0 ? 1 : -1);
            }}
          >
            <button
              type="button"
              className="icon-button"
              aria-label="前の検討状況"
              disabled={p.stage === stages[0]}
              onClick={() => move(-1)}
            >
              <ChevronLeft size={18} />
            </button>
            <span>{studyStages[p.stage]}</span>
            <button
              type="button"
              className="icon-button"
              aria-label="次の検討状況"
              disabled={p.stage === stages.at(-1)}
              onClick={() => move(1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="field">
            <span>知りたいこと</span>
            <div className="filter-row">
              {studyTopics.map((t) => (
                <CheckChip
                  key={t}
                  selected={p.questions.includes(t)}
                  onClick={() =>
                    onChange({
                      ...p,
                      questions: p.questions.includes(t)
                        ? p.questions.filter((q) => q !== t)
                        : [...p.questions, t],
                    })
                  }
                >
                  {t}
                </CheckChip>
              ))}
            </div>
          </div>
          <div className="field">
            <span>希望する国・地域（未定でも使えます）</span>
          </div>
          {p.destinations.map((id, i) => (
            <div className="destination-entry" key={i}>
              <RegionPicker
                label={`希望先 ${i + 1}`}
                value={id}
                onChange={(next) =>
                  onChange({
                    ...p,
                    destinations: p.destinations
                      .map((d, j) => (i === j ? next : d))
                      .filter(Boolean),
                  })
                }
              />
              <button
                type="button"
                className="icon-button"
                aria-label={`希望先 ${i + 1}を削除`}
                onClick={() =>
                  onChange({
                    ...p,
                    destinations: p.destinations.filter((_, j) => j !== i),
                  })
                }
              >
                <X size={17} />
              </button>
            </div>
          ))}
          {p.destinations.length < 5 && (
            <RegionPicker
              label="希望先を追加"
              value=""
              onChange={(id) => {
                if (id && !p.destinations.includes(id))
                  onChange({ ...p, destinations: [...p.destinations, id] });
              }}
            />
          )}
          {!p.destinations.length && (
            <p className="muted">
              国が未定でも、知りたいテーマから経験者を探せます。
            </p>
          )}
        </fieldset>
      )}
      {p.roles.includes("alumni") && (
        <fieldset className="participation-fields">
          <legend>留学経験を伝えられる人</legend>
          <p className="muted">
            現在の居住地とは別に登録します。留学経験は本人の申告として表示されます。
          </p>
          {p.experiences.map((e, i) => (
            <div className="study-experience-entry" key={i}>
              <div className="experience-entry-head">
                <h3>留学経験 {i + 1}</h3>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`留学経験 ${i + 1}を削除`}
                  onClick={() =>
                    onChange({
                      ...p,
                      experiences: p.experiences.filter((_, j) => j !== i),
                    })
                  }
                >
                  <X size={17} />
                </button>
              </div>
              <RegionPicker
                label={`留学経験 ${i + 1}`}
                value={e.regionId}
                onChange={(regionId) => updateExperience(i, { regionId })}
              />
              <div className="form-row">
                <label className="field">
                  留学経験 {i + 1}の種類
                  <select
                    value={e.level}
                    onChange={(ev) =>
                      updateExperience(i, {
                        level: ev.target.value as StudyExperience["level"],
                      })
                    }
                  >
                    {Object.entries(studyLevels).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  留学経験 {i + 1}の形式
                  <select
                    value={e.format}
                    onChange={(ev) =>
                      updateExperience(i, {
                        format: ev.target.value as StudyExperience["format"],
                      })
                    }
                  >
                    {Object.entries(studyFormats).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="experience-years">
                {(["startYear", "endYear", "months"] as const).map((key) => (
                  <label className="field" key={key}>
                    {`留学経験 ${i + 1}の${key === "startYear" ? "開始年" : key === "endYear" ? "帰国年" : "期間（月）"}`}
                    <input
                      type="number"
                      min={key === "months" ? 1 : 1900}
                      max={key === "months" ? 120 : new Date().getFullYear()}
                      value={e[key] ?? ""}
                      onChange={(ev) =>
                        updateExperience(i, {
                          [key]:
                            ev.target.value === ""
                              ? null
                              : Number(ev.target.value),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="field">
                <span>留学経験 {i + 1}で相談できること</span>
                <div className="filter-row">
                  {studyTopics.map((t) => (
                    <CheckChip
                      key={t}
                      selected={e.topics.includes(t)}
                      onClick={() =>
                        updateExperience(i, {
                          topics: e.topics.includes(t)
                            ? e.topics.filter((v) => v !== t)
                            : [...e.topics, t],
                        })
                      }
                    >
                      {t}
                    </CheckChip>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {p.experiences.length < 5 && (
            <button
              type="button"
              className="button subtle"
              onClick={() =>
                onChange({
                  ...p,
                  experiences: [
                    ...p.experiences,
                    {
                      regionId: "",
                      level: "high_school",
                      format: "exchange",
                      startYear: null,
                      endYear: null,
                      months: null,
                      topics: [],
                    },
                  ],
                })
              }
            >
              <Plus size={17} />
              留学経験を追加
            </button>
          )}
        </fieldset>
      )}
      {p.roles.includes("local") && (
        <fieldset className="participation-fields">
          <legend>現地で交流できる人</legend>
          <label className="field">
            現地での立場
            <select
              value={p.local.kind}
              onChange={(e) =>
                onChange({
                  ...p,
                  local: {
                    ...p.local,
                    kind: e.target.value as Participation["local"]["kind"],
                  },
                })
              }
            >
              {Object.entries(localKinds).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <RegionPicker
            label="交流できる地域"
            value={p.local.regionId}
            onChange={(regionId) =>
              onChange({ ...p, local: { ...p.local, regionId } })
            }
          />
          <p className="muted">未登録なら、現在の居住地で検索できます。</p>
          <label className="field">
            話せる言語
            <input
              maxLength={120}
              value={p.local.languages}
              placeholder="例：日本語・英語"
              onChange={(e) =>
                onChange({
                  ...p,
                  local: { ...p.local, languages: e.target.value },
                })
              }
            />
          </label>
          <label className="field">
            現地で交流したいこと
            <textarea
              rows={2}
              maxLength={240}
              value={p.local.topics}
              placeholder="例：学校生活の話、写真、街歩き"
              onChange={(e) =>
                onChange({
                  ...p,
                  local: { ...p.local, topics: e.target.value },
                })
              }
            />
          </label>
        </fieldset>
      )}
    </section>
  );
}

export function ParticipationSummary({
  person,
  compact = false,
}: {
  person: {
    participation?: Participation;
    connections: { regionId: string; status: string }[];
  };
  compact?: boolean;
}) {
  if (!person.participation) return null;
  const p = participationOf(person, true);
  const localRegion =
    p.local.regionId ||
    person.connections.find((c) => c.status === "current")?.regionId ||
    "";
  return (
    <div className={`participation-summary ${compact ? "compact" : ""}`}>
      <div className="participation-badges">
        {p.roles.includes("alumni") && (
          <span className="alumni-badge">
            <GraduationCap size={14} />
            留学経験者
          </span>
        )}
        {p.roles.includes("local") && (
          <span>
            <Globe2 size={14} />
            {localKinds[p.local.kind]}
          </span>
        )}
        {p.roles.includes("explorer") && (
          <span>
            <BookOpen size={14} />
            {studyStages[p.stage]}
          </span>
        )}
      </div>
      {p.roles.includes("alumni") &&
        p.experiences.slice(0, compact ? 1 : 5).map((e, i) => (
          <div className="experience-summary" key={i}>
            <strong>{experienceLabel(e)}</strong>
            <span>{studyFormats[e.format]}</span>
            {!!e.topics.length && (
              <div className="study-topic-tags">
                {e.topics.map((t) => (
                  <Link
                    key={t}
                    to={`/people?axis=alumni&topic=${encodeURIComponent(t)}&studyPlace=${encodeURIComponent(getRegion(e.regionId)?.parentId || e.regionId)}`}
                  >
                    {t}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      {!compact && p.roles.includes("alumni") && (
        <small>留学経験は本人の申告です。</small>
      )}
      {!compact && p.roles.includes("local") && (
        <section className="local-profile-detail">
          <h2>現地での交流</h2>
          <p>{regionLabel(localRegion) || "交流地域は未登録"}</p>
          {p.local.languages && <p>話せる言語：{p.local.languages}</p>}
          {p.local.topics && <p>{p.local.topics}</p>}
        </section>
      )}
      {!compact && p.roles.includes("explorer") && (
        <section className="local-profile-detail">
          <h2>留学の検討・準備</h2>
          <p>
            {studyStages[p.stage]} ·{" "}
            {p.destinations.length
              ? p.destinations.map(regionLabel).join("、")
              : "希望先は未定"}
          </p>
          {!!p.questions.length && (
            <p>知りたいこと：{p.questions.join("、")}</p>
          )}
        </section>
      )}
    </div>
  );
}
export function DiscoveryAxes({
  axis = "",
  onChange,
}: {
  axis?: string;
  onChange: (axis: string) => void;
}) {
  return (
    <div className="discovery-axes" role="group" aria-label="2つの探し方">
      {[
        { value: "alumni", label: "留学経験者に相談", Icon: GraduationCap },
        { value: "local", label: "現地の人と交流", Icon: Globe2 },
      ].map(({ value, label, Icon }) => {
        return (
          <button
            type="button"
            key={value}
            className={axis === value ? "selected" : ""}
            aria-pressed={axis === value}
            onClick={() => onChange(axis === value ? "" : value)}
          >
            <Icon size={20} />
            <span>{label}</span>
            {axis === value && <Check size={16} />}
          </button>
        );
      })}
    </div>
  );
}
