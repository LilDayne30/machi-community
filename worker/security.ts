export function canRefund(startsAt: string, now = Date.now()) {
  return new Date(startsAt).getTime() - now >= 24 * 60 * 60 * 1000;
}
export function isSameOrigin(
  origin: string | null,
  requestURL: string,
  appOrigin: string,
) {
  return (
    !!origin && (origin === new URL(requestURL).origin || origin === appOrigin)
  );
}
export const safeText = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export async function sha256(s: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export const randomToken = () =>
  btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
export function parseJSON<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}
