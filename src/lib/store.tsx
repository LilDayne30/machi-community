import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  emptyProfile,
  notes,
  rooms,
  talks,
  communityPeople,
  type Bootstrap,
  type CommunityMember,
  type Profile,
} from "./data";
const sample: Bootstrap = {
  mode: "preview",
  user: null,
  profile: {
    ...emptyProfile,
    name: "旅する人",
    nationality: "日本",
    interestedRegions: ["台湾", "韓国"],
  },
  talks,
  notes,
  rooms,
  people: communityPeople,
  bookings: [],
  consultations: [],
  configured: { google: false, stripe: false },
};
function upgradeMember(person: CommunityMember): CommunityMember {
  const seed = sample.people.find((p) => p.id === person.id);
  return {
    ...person,
    participation: person.participation ?? seed?.participation,
    nationality: person.nationality ?? seed?.nationality ?? "",
    city: !person.connections && seed ? seed.city : (person.city ?? ""),
    bio: !person.connections && seed ? seed.bio : person.bio,
    interestedRegions:
      person.interestedRegions ?? seed?.interestedRegions ?? [],
    connections: person.connections ?? seed?.connections ?? [],
    visitRegionId: person.visitRegionId ?? seed?.visitRegionId ?? "",
  };
}
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch("/api" + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const j = (await r.json()) as T & { error?: string };
  if (!r.ok) throw new Error(j.error || "通信に失敗しました");
  return j;
}
export type ToastAction = { label: string; to: string };
// 国籍が未登録で送信できないときに、入力欄へ直接進める案内。
export const nationalityRequired = "メッセージを送るには、国籍の登録が必要です";
export const nationalityField: ToastAction = {
  label: "国籍を入力する",
  to: "/profile#profile-nationality",
};
type Context = {
  data: Bootstrap;
  loading: boolean;
  error: string;
  setData: (f: (d: Bootstrap) => Bootstrap) => void;
  toast: (s: string, action?: ToastAction) => void;
  notify: string;
  notifyAction?: ToastAction;
  guard: () => boolean;
  refresh: () => Promise<void>;
  startConversation: (person: CommunityMember) => Promise<string | null>;
};
const C = createContext<Context>(null!);
export function Provider({ children }: { children: ReactNode }) {
  const [data, setState] = useState<Bootstrap>(sample),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notify, setNotify] = useState(""),
    [notifyAction, setNotifyAction] = useState<ToastAction>();
  function toast(s: string, action?: ToastAction) {
    setNotify(s);
    setNotifyAction(action);
  }
  function setData(f: (d: Bootstrap) => Bootstrap) {
    setState((d) => {
      const n = f(d);
      if (n.mode === "preview")
        localStorage.setItem("machi-preview-v1", JSON.stringify(n));
      return n;
    });
  }
  async function refresh() {
    try {
      const b = await api<Bootstrap>("/bootstrap");
      if (b.mode === "preview") {
        const saved = localStorage.getItem("machi-preview-v1");
        if (saved) {
          try {
            const s = JSON.parse(saved);
            setState({
              ...sample,
              ...s,
              profile: { ...emptyProfile, ...s.profile },
              people: (s.people || sample.people).map(upgradeMember),
              rooms: (s.people
                ? s.rooms
                : [
                    ...sample.rooms.filter((r) => r.kind === "direct"),
                    ...(s.rooms || []),
                  ]
              ).map((room: Bootstrap["rooms"][number]) => ({
                ...room,
                peer: room.peer ? upgradeMember(room.peer) : undefined,
              })),
              mode: "preview",
              user: null,
              configured: b.configured,
            });
          } catch {
            setState({ ...sample, configured: b.configured });
          }
        } else setState({ ...sample, configured: b.configured });
      } else setState(b);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    if (data.mode !== "production" || !data.user) return;
    const update = () => {
      if (!document.hidden) void refresh();
    };
    const timer = setInterval(update, 12000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [data.mode, data.user?.id]);
  useEffect(() => {
    if (!notify) return;
    // 操作つきの通知は、読んでから押せるよう長めに表示する。
    const t = setTimeout(() => setNotify(""), notifyAction ? 9000 : 4000);
    return () => clearTimeout(t);
  }, [notify, notifyAction]);
  function guard() {
    if (data.mode === "production" && !data.user) {
      toast("Googleアカウントでログインしてください");
      return false;
    }
    return true;
  }
  async function startConversation(person: CommunityMember) {
    if (!guard()) return null;
    if (!data.profile.nationality.trim()) {
      toast(nationalityRequired, nationalityField);
      return null;
    }
    if (data.mode === "production") {
      const result = await api<{ id: string }>("/conversations", {
        method: "POST",
        body: JSON.stringify({ personId: person.id }),
      });
      await refresh();
      return result.id;
    }
    const existing = data.rooms.find(
      (r) => r.kind === "direct" && r.peer?.id === person.id,
    );
    if (existing) return existing.id;
    const id = "dm-" + person.id;
    setData((d) => ({
      ...d,
      rooms: d.rooms.some((r) => r.id === id)
        ? d.rooms
        : [
            {
              id,
              kind: "direct",
              peer: person,
              title: person.name,
              subtitle: person.interests.join("・"),
              image: "",
              members: 2,
              unread: 0,
              messages: [],
            },
            ...d.rooms,
          ],
    }));
    return id;
  }
  return (
    <C.Provider
      value={{
        data,
        loading,
        error,
        setData,
        toast,
        notify,
        notifyAction,
        guard,
        refresh,
        startConversation,
      }}
    >
      {children}
    </C.Provider>
  );
}
export const useApp = () => useContext(C);
export async function saveProfile(p: Profile, mode: string) {
  if (mode === "production")
    await api("/profile", { method: "PUT", body: JSON.stringify(p) });
}
