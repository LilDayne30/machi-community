import { createHash } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
// LOCAL ONLY. No credentials, users or sessions in this fixture are valid on a remote database.
const hash = (s) => createHash("sha256").update(s).digest("hex");
const q = (s) => "'" + String(s).replaceAll("'", "''") + "'";
const statements = [];
statements.push("DELETE FROM email_outbox WHERE id LIKE '%e2e%'");
for (const table of [
  "audit_log",
  "costs",
  "reports",
  "consultations",
  "activity",
  "blocks",
  "direct_conversations",
  "room_members",
  "messages",
  "bookings",
  "notes",
  "providers",
  "sessions",
  "rooms",
  "talks",
  "users",
])
  statements.push(`DELETE FROM ${table}`);
for (const [id, name, role] of [
  ["a", "参加者A", "member"],
  ["b", "参加者B", "member"],
  ["admin", "運営者", "admin"],
  ["pa", "事業者A", "provider"],
  ["pb", "事業者B", "provider"],
  ["ui", "接続テスト会員", "member"],
  ["da", "個人会話A", "member"],
  ["db", "個人会話B", "member"],
  ["dc", "個人会話C", "member"],
  ["closed", "受付停止の会員", "member"],
  ["dui", "個人会話の操作会員", "member"],
  ["dpeer", "会話相手のテストさん", "member"],
  ["uip", "接続テスト事業者", "provider"],
  ...Array.from({ length: 10 }, (_, i) => [
    "race" + i,
    "同時申込" + i,
    "member",
  ]),
]) {
  const profile = JSON.stringify({
    relation: "最近訪れた",
    bio: "喫茶店と再訪の話をしたいです",
    interests: ["喫茶店"],
    availability: "土日の夜",
    acceptsMessages: ["da", "db", "dc", "dui", "dpeer"].includes(id),
  });
  statements.push(
    `INSERT INTO users(id,google_sub,email,name,role,profile) VALUES(${q("e2e-" + id)},${q("google-" + id)},${q(id + "@example.test")},${q(name)},${q(role)},${q(profile)})`,
  );
  statements.push(
    `INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(${q(hash("e2e-" + id))},${q("e2e-" + id)},unixepoch()+86400)`,
  );
}
for (const [id, capacity] of [
  ["free", 6],
  ["other", 6],
  ["race", 4],
  ["last", 4],
  ["ui", 6],
])
  statements.push(
    `INSERT INTO talks(id,title,category,starts_at,capacity,price,image,host,description,published) VALUES(${q("e2e-" + id)},${q("テスト地域トーク " + id)},'喫茶店',strftime('%Y-%m-%dT12:00:00Z','now','+10 days'),${capacity},1000,'https://images.unsplash.com/photo-1442512595331-e89e73853f31','運営','操作テスト専用の地域トークです。',1)`,
  );
statements.push(
  "INSERT INTO rooms(id,title,subtitle,image) VALUES('e2e-room-a','参加者Aの小部屋','テスト','/icon.svg'),('e2e-room-b','参加者Bの小部屋','テスト','/icon.svg'),('e2e-shared','共有の小部屋','テスト','/icon.svg')",
);
for (const [r, u] of [
  ["a", "a"],
  ["b", "b"],
  ["shared", "a"],
  ["shared", "b"],
])
  statements.push(
    `INSERT INTO room_members(room_id,user_id) VALUES(${q(r === "shared" ? "e2e-shared" : "e2e-room-" + r)},${q("e2e-" + u)})`,
  );
statements.push(
  "INSERT INTO messages(id,room_id,user_id,body) VALUES('e2e-ma','e2e-room-a','e2e-a','参加者Aだけの秘密のメモ'),('e2e-mb','e2e-room-b','e2e-b','参加者Bだけの秘密のメモ'),('e2e-shared-a','e2e-shared','e2e-a','共有してよい自分の投稿です'),('e2e-shared-b','e2e-shared','e2e-b','共有してはいけない他の人の投稿です')",
);
statements.push(
  "INSERT INTO providers(id,user_id,name,theme,bio,price,verified) VALUES('e2e-pa','e2e-pa','事業者A','喫茶店','テスト事業者','相談2,000円',1),('e2e-pb','e2e-pb','事業者B','街歩き','テスト事業者','相談2,000円',1)",
);
statements.push(
  "INSERT INTO rooms(id,title,subtitle,image) VALUES('e2e-ui-room','実接続テストの小部屋','テスト','/icon.svg'); INSERT INTO room_members(room_id,user_id) VALUES('e2e-ui-room','e2e-ui'); INSERT INTO messages(id,room_id,user_id,body) VALUES('e2e-ui-m','e2e-ui-room','e2e-ui','共有範囲を選べる自分の投稿です'); INSERT INTO providers(id,user_id,name,theme,bio,price,verified) VALUES('e2e-uip','e2e-uip','実接続テストの相談先','喫茶店','接続試験用です','相談2,000円',1)",
);
mkdirSync(".wrangler", { recursive: true });
writeFileSync(".wrangler/e2e-fixture.sql", statements.join(";\n") + ";");
execFileSync(
  "node",
  [
    "node_modules/wrangler/bin/wrangler.js",
    "d1",
    "execute",
    "DB",
    "--local",
    "--file",
    ".wrangler/e2e-fixture.sql",
  ],
  { stdio: "pipe" },
);
