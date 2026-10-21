import { readFileSync } from "node:fs";
import ts from "typescript";
const parsed = ts.parseConfigFileTextToJson(
  "wrangler.jsonc",
  readFileSync("wrangler.jsonc", "utf8"),
);
if (parsed.error) throw new Error("wrangler.jsoncを読み込めません。");
const c = parsed.config;
if (c.d1_databases?.[0]?.database_id === "00000000-0000-0000-0000-000000000000")
  throw new Error(
    "公開用D1が未接続です。wrangler d1 create machi-community のIDを設定してください。",
  );
if (!c.vars?.APP_ORIGIN?.startsWith("https://"))
  throw new Error("APP_ORIGINに公開先のHTTPS URLを設定してください。");
if (c.vars?.APP_ENV !== "production" || c.vars?.DEMO_MODE !== "false")
  throw new Error("公開にはproduction・DEMO_MODE=falseが必要です。");
console.log("Production deployment configuration verified.");
