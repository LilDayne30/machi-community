import { Link, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Globe2,
  GraduationCap,
  MessageCircle,
  SlidersHorizontal,
} from "lucide-react";
import { useApp } from "../lib/store";
import { regionLabel } from "../lib/regions";
import {
  localKinds,
  matchesParticipation,
  participationOf,
  studyLevels,
} from "../lib/participation";
import { Avatar, Heading } from "./ui";

export function Home() {
  const { data } = useApp();
  const [params, setParams] = useSearchParams();
  const axis = params.get("axis") === "local" ? "local" : "alumni";
  const people = data.people
    .filter((person) => matchesParticipation(person, axis))
    .slice(0, 2);
  const conversations = data.rooms
    .filter((room) => room.kind === "direct")
    .sort((a, b) => Number(b.unread > 0) - Number(a.unread > 0))
    .slice(0, 2);
  const unread = data.rooms
    .filter((room) => room.kind === "direct")
    .reduce((sum, room) => sum + room.unread, 0);

  return (
    <div className="home-hub">
      <Heading eyebrow="HOME" title="ホーム" />
      <div className="home-hub-layout">
        <section
          className={`home-discover glass home-discover--${axis}`}
          aria-labelledby="home-discover-title"
        >
          <div className="home-discover-heading">
            <span className="home-discover-symbol" aria-hidden="true">
              <UsersSymbol />
            </span>
            <h2 id="home-discover-title">話せる人を探す</h2>
          </div>
          <div className="home-intents" role="group" aria-label="話す目的">
            {[
              { id: "alumni", label: "留学経験者に相談", Icon: GraduationCap },
              { id: "local", label: "現地の人と交流", Icon: Globe2 },
            ].map(({ id, label, Icon }) => (
              <button
                type="button"
                key={id}
                aria-pressed={axis === id}
                onClick={() =>
                  setParams({ axis: id }, { preventScrollReset: true })
                }
              >
                {axis === id && (
                  <motion.span
                    className="home-intent-active"
                    layoutId="home-intent"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
                <Icon size={21} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="home-people-preview" key={axis}>
            {people.map((person) => {
              const participation = participationOf(person, true);
              const experience = participation.experiences[0];
              const location =
                participation.local.regionId ||
                person.connections.find((c) => c.status === "current")
                  ?.regionId;
              const detail =
                axis === "alumni" && experience
                  ? `${regionLabel(experience.regionId)} · ${studyLevels[experience.level]}`
                  : [
                      regionLabel(location || ""),
                      localKinds[participation.local.kind],
                    ]
                      .filter(Boolean)
                      .join(" · ");
              const topics =
                axis === "alumni"
                  ? [
                      ...new Set(
                        participation.experiences.flatMap((e) => e.topics),
                      ),
                    ]
                  : [
                      participation.local.languages,
                      participation.local.topics,
                    ].filter(Boolean);
              return (
                <Link
                  className="home-person"
                  to={`/people/${person.id}`}
                  key={person.id}
                >
                  <Avatar
                    name={person.name}
                    color={person.color}
                    src={person.avatarUrl}
                  />
                  <div className="home-person-copy">
                    <h3>{person.name}</h3>
                    <p>{detail}</p>
                    <div className="home-person-topics">
                      {topics.slice(0, 2).map((topic) => (
                        <span key={topic}>{topic}</span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight size={18} aria-hidden="true" />
                </Link>
              );
            })}
            {!people.length && (
              <div className="home-discover-empty">
                <MessageCircle size={30} aria-hidden="true" />
                <p>
                  {data.mode === "production" && !data.user
                    ? "ログインすると、話せる人を見られます。"
                    : "この目的で会話を受け付けている人はまだいません。"}
                </p>
                {data.mode === "production" && !data.user && (
                  <Link to="/profile" className="text-link">
                    ログインへ
                  </Link>
                )}
              </div>
            )}
          </div>
          <Link
            className="home-find-button button primary"
            to={`/people?axis=${axis}`}
          >
            <SlidersHorizontal size={18} aria-hidden="true" />
            条件を指定して探す
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>
        <div className="home-hub-secondary">
          <section
            className="home-conversations"
            aria-labelledby="home-conversations-title"
          >
            <div className="home-conversations-heading">
              <h2 id="home-conversations-title">会話のつづき</h2>
              <Link
                to="/rooms"
                aria-label={`${unread > 0 ? `${unread}件の未読・` : ""}メッセージをすべて見る`}
              >
                {unread > 0 && (
                  <span className="home-unread">{unread}件の未読</span>
                )}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
            <div className="home-conversation-list">
              {conversations.map((room) => (
                <Link
                  className="room-preview home-conversation"
                  to={`/rooms/${room.id}`}
                  key={room.id}
                >
                  <Avatar
                    name={room.title}
                    color={room.peer?.color}
                    src={room.peer?.avatarUrl}
                  />
                  <div className="home-conversation-copy">
                    <h3>{room.title}</h3>
                    <p>{room.messages.at(-1)?.body || "会話を始めましょう"}</p>
                  </div>
                  {room.unread > 0 ? (
                    <span
                      className="unread-badge"
                      aria-label={`${room.unread}件の未読`}
                    >
                      {room.unread}
                    </span>
                  ) : (
                    <ChevronRight size={17} aria-hidden="true" />
                  )}
                </Link>
              ))}
              {!conversations.length && (
                <div className="home-conversations-empty">
                  <MessageCircle size={22} aria-hidden="true" />
                  <p>
                    {data.mode === "production" && !data.user
                      ? "ログインすると会話を確認できます。"
                      : "始めた会話がここに表示されます。"}
                  </p>
                  {data.mode === "production" && !data.user && (
                    <Link to="/profile">
                      ログインへ
                      <ArrowRight size={16} />
                    </Link>
                  )}
                </div>
              )}
            </div>
          </section>
          <nav className="home-library" aria-label="メモとイベント">
            <Link to="/notes">
              <BookOpen size={20} aria-hidden="true" />
              <span>現地のメモ</span>
              <ChevronRight size={17} aria-hidden="true" />
            </Link>
            <Link to="/talks">
              <CalendarDays size={20} aria-hidden="true" />
              <span>イベント</span>
              <ChevronRight size={17} aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}

function UsersSymbol() {
  return (
    <>
      <span />
      <span />
      <MessageCircle size={20} />
    </>
  );
}
