// 管理ログインを保留したまま、招待を登録・確認・取消するための運営用CLI。
// 使い方:
//   npm run invite -- --email person@example.com --local [--days 30]
//   npm run invite -- --email person@example.com --remote [--days 30] [--yes]
//   npm run invite -- --list --local|--remote
//   npm run invite -- --revoke person@example.com --local|--remote [--yes]
//   --dry-run を付けると実行するSQLだけを表示し、DBへ書き込まない。
// 招待テーブルだけを操作し、会員・role・セッションは作成しない。
// remoteは wrangler.jsonc の account_id と、ログイン中のCloudflareアカウントが一致する場合だけ実行する。
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import ts from "typescript";

const WRANGLER = "node_modules/wrangler/bin/wrangler.js";
const CONFIG = "wrangler.jsonc";
const LOG = ".wrangler/invite-log.jsonl";
const EMAIL = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;

export function parseArgs(argv) {
  const o = { days: 30, dryRun: false, yes: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--"))
        throw new Error(`${a} の値がありません。`);
      return v;
    };
    if (a === "--email") o.email = next();
    else if (a === "--revoke") o.revoke = next();
    else if (a === "--days") o.days = Number(next());
    else if (a === "--list") o.list = true;
    else if (a === "--local") o.target = o.target ? "both" : "local";
    else if (a === "--remote") o.target = o.target ? "both" : "remote";
    else if (a === "--dry-run") o.dryRun = true;
    else if (a === "--yes") o.yes = true;
    else throw new Error(`不明なオプションです: ${a}`);
  }
  if (!o.target || o.target === "both")
    throw new Error("--local か --remote のどちらか一方を指定してください。");
  const modes = [o.email, o.revoke, o.list].filter(Boolean).length;
  if (modes !== 1)
    throw new Error(
      "--email・--revoke・--list のどれか1つを指定してください。",
    );
  if (!Number.isInteger(o.days) || o.days < 1 || o.days > 30)
    throw new Error("--days は1〜30の整数で指定してください。");
  for (const k of ["email", "revoke"])
    if (o[k] !== undefined) {
      o[k] = normalizeEmail(o[k]);
    }
  return o;
}

export function normalizeEmail(raw) {
  const e = String(raw).trim().toLowerCase();
  if (e.length > 254 || !EMAIL.test(e))
    throw new Error(`メールアドレスの形式が正しくありません: ${raw}`);
  return e;
}

const sq = (s) => "'" + s.replaceAll("'", "''") + "'";

export function buildSql(o) {
  if (o.list)
    return "SELECT email, expires_at, used_at, invited_by FROM invitations ORDER BY expires_at DESC LIMIT 100";
  if (o.revoke)
    return `UPDATE invitations SET expires_at=datetime('now','-1 second') WHERE email=${sq(o.revoke)} AND used_at IS NULL`;
  // invited_by は会員IDを入れる列。CLIからの登録は会員を伴わないため NULL のままにし、操作記録はローカルログへ残す。
  return `INSERT INTO invitations(email,expires_at,invited_by) VALUES(${sq(o.email)},datetime('now','+${o.days} days'),NULL) ON CONFLICT(email) DO UPDATE SET expires_at=excluded.expires_at`;
}

function readConfig() {
  const parsed = ts.parseConfigFileTextToJson(
    CONFIG,
    readFileSync(CONFIG, "utf8"),
  );
  if (parsed.error) throw new Error(`${CONFIG} を読み込めません。`);
  return parsed.config;
}

function wrangler(args) {
  return execFileSync("node", [WRANGLER, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function assertRemoteAccount(config) {
  const expected = config.account_id;
  const db = config.d1_databases?.find((d) => d.binding === "DB");
  if (!expected || !db?.database_id)
    throw new Error(`${CONFIG} に account_id と DB の設定がありません。`);
  let who;
  try {
    who = wrangler(["whoami"]);
  } catch {
    throw new Error(
      "Cloudflareにログインしていません。npx wrangler login を実行してください。",
    );
  }
  if (!who.includes(expected))
    throw new Error(
      `ログイン中のCloudflareアカウントに ${CONFIG} の account_id (${expected}) が含まれません。中止します。`,
    );
  return db.database_name;
}

async function confirm(message) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${message} [y/N] `);
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const sql = buildSql(o);
  const action = o.list ? "list" : o.revoke ? "revoke" : "invite";
  const subject = o.email || o.revoke || "";
  if (o.dryRun) {
    console.log(`[dry-run] ${o.target}: ${sql}`);
    return;
  }
  const config = readConfig();
  let dbName = "DB";
  if (o.target === "remote") {
    dbName = assertRemoteAccount(config);
    if (action !== "list" && !o.yes) {
      const label =
        action === "invite"
          ? `本番D1 (${dbName}) に ${subject} の招待を${o.days}日間で登録します。`
          : `本番D1 (${dbName}) の ${subject} の未使用招待を取り消します。`;
      if (!(await confirm(label))) {
        console.log("中止しました。");
        return;
      }
    }
  }
  const run = (command) =>
    JSON.parse(
      wrangler([
        "d1",
        "execute",
        dbName,
        `--${o.target}`,
        "--config",
        CONFIG,
        "--json",
        "--command",
        command,
      ]),
    )?.[0]?.results || [];
  if (action === "list") {
    const rows = run(sql);
    if (!rows.length) console.log("招待はありません。");
    else console.table(rows);
    return;
  }
  // ローカルD1は変更件数を返さないため、取消の対象は事前に確認する。
  if (
    action === "revoke" &&
    !run(
      `SELECT 1 FROM invitations WHERE email=${sq(subject)} AND used_at IS NULL AND expires_at>datetime('now')`,
    ).length
  ) {
    console.log(`${subject} の有効な未使用招待は見つかりませんでした。`);
    return;
  }
  run(sql);
  if (action === "revoke") console.log(`${subject} の招待を取り消しました。`);
  else
    console.log(
      `${subject} を${o.days}日間有効で招待しました。本人は利用者サイトからこのメールのGoogleアカウントでログインします。`,
    );
  mkdirSync(".wrangler", { recursive: true });
  appendFileSync(
    LOG,
    JSON.stringify({
      at: new Date().toISOString(),
      target: o.target,
      action,
      email: subject,
      days: action === "invite" ? o.days : undefined,
    }) + "\n",
  );
}

if (import.meta.url === `file://${process.argv[1]}`)
  main().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
