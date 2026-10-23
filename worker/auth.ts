/** A callback must belong to the browser that started the login. */
export function readOAuthTransaction(saved?: string) {
  if (!saved || saved.length > 2048) return null;
  try {
    const value = JSON.parse(atob(saved));
    if (
      !value ||
      ![value.state, value.nonce, value.verifier].every(
        (s) => typeof s === "string" && /^[A-Za-z0-9_-]{43}$/.test(s),
      )
    )
      return null;
    return {
      state: value.state as string,
      nonce: value.nonce as string,
      verifier: value.verifier as string,
    };
  } catch {
    return null;
  }
}
