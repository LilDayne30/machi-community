import { readFile, writeFile, chmod } from "node:fs/promises";
import path from "node:path";

const source = process.argv[2];
if (!source) {
  console.error(
    "使い方: npm run auth:google -- /絶対パス/client_secret.json\nGoogle Cloudで作成したWebアプリ用OAuthクライアントのJSONを指定します。値は表示しません。",
  );
  process.exit(1);
}
try {
  const credentials = JSON.parse(
    await readFile(path.resolve(source), "utf8"),
  ).web;
  if (
    !credentials ||
    typeof credentials.client_id !== "string" ||
    !/\.apps\.googleusercontent\.com$/.test(credentials.client_id) ||
    typeof credentials.client_secret !== "string" ||
    !credentials.client_secret ||
    !Array.isArray(credentials.redirect_uris) ||
    /[\r\n]/.test(credentials.client_secret)
  ) {
    throw new Error(
      "GoogleのWebアプリ用OAuthクライアントJSONを指定してください。",
    );
  }
  const file = new URL("../.dev.vars", import.meta.url);
  const existing = await readFile(file, "utf8").catch(() =>
    readFile(new URL("../.dev.vars.example", import.meta.url), "utf8"),
  );
  const origin = existing.match(/^APP_ORIGIN=["']?([^\r\n"']+)/m)?.[1];
  if (!origin) throw new Error(".dev.varsにAPP_ORIGINを設定してください。");
  if (new URL(origin).origin !== origin)
    throw new Error(
      "APP_ORIGINには末尾のスラッシュやパスを含めず、オリジンだけを設定してください。",
    );
  const callback = origin + "/api/auth/callback";
  if (!credentials.redirect_uris?.includes(callback)) {
    throw new Error(
      `Google Cloudの承認済みリダイレクトURIに ${callback} を追加してからJSONを取得し直してください。`,
    );
  }
  let next = existing;
  for (const [key, value] of Object.entries({
    GOOGLE_CLIENT_ID: credentials.client_id,
    GOOGLE_CLIENT_SECRET: credentials.client_secret,
  })) {
    const line = `${key}=${JSON.stringify(value)}`;
    next = new RegExp(`^${key}=.*$`, "m").test(next)
      ? next.replace(new RegExp(`^${key}=.*$`, "m"), () => line)
      : next.trimEnd() + "\n" + line + "\n";
  }
  await writeFile(file, next, { mode: 0o600 });
  await chmod(file, 0o600);
  console.log(
    "Google認証をローカル設定へ保存しました。秘密情報は表示していません。\nAPIサーバーの設定再読込み後、/profileからGoogleで続けてください。",
  );
} catch (error) {
  // Never print the source document or any provider secret in diagnostics.
  console.error(
    error instanceof SyntaxError
      ? "JSONを読み込めません。Googleから取得したJSONを指定してください。"
      : error.message,
  );
  process.exit(1);
}
