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
  type Bootstrap,
  type Profile,
} from "./data";
const sample: Bootstrap = {
  mode: "preview",
  user: null,
  profile: { ...emptyProfile, name: "旅する人" },
  talks,
  notes,
  rooms,
  bookings: [],
  consultations: [],
  configured: { google: false, stripe: false },
};
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch("/api" + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const j = (await r.json()) as T & { error?: string };
  if (!r.ok) throw new Error(j.error || "通信に失敗しました");
  return j;
}
type Context = {
  data: Bootstrap;
  loading: boolean;
  error: string;
  setData: (f: (d: Bootstrap) => Bootstrap) => void;
  toast: (s: string) => void;
  notify: string;
  guard: () => boolean;
  refresh: () => Promise<void>;
};
const C = createContext<Context>(null!);
export function Provider({ children }: { children: ReactNode }) {
  const [data, setState] = useState<Bootstrap>(sample),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notify, setNotify] = useState("");
  function toast(s: string) {
    setNotify(s);
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
    if (!notify) return;
    const t = setTimeout(() => setNotify(""), 4000);
    return () => clearTimeout(t);
  }, [notify]);
  function guard() {
    if (data.mode === "production" && !data.user) {
      toast("Googleアカウントでログインしてください");
      return false;
    }
    return true;
  }
  return (
    <C.Provider
      value={{ data, loading, error, setData, toast, notify, guard, refresh }}
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
