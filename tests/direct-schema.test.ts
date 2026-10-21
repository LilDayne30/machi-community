import { afterEach, beforeEach, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
let db: DatabaseSync;
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  db.exec(readFileSync("migrations/0001_initial.sql", "utf8"));
  for (const id of ["a", "b", "c"])
    db.prepare(
      "INSERT INTO users(id,google_sub,email,name) VALUES(?,?,?,?)",
    ).run(id, id, id + "@example.test", id);
  db.exec(
    "INSERT INTO rooms(id,title,subtitle,image) VALUES('old','以前の小部屋','保持する会話',''),('dm','1対1','',''); INSERT INTO room_members(room_id,user_id) VALUES('old','a'),('old','b'),('old','c'); INSERT INTO messages(id,room_id,user_id,body) VALUES('old-message','old','a','残したい旅の報告')",
  );
  db.exec(readFileSync("migrations/0002_direct_conversations.sql", "utf8"));
  db.exec(
    "INSERT INTO direct_conversations(room_id,user_low,user_high) VALUES('dm','a','b'); INSERT INTO room_members(room_id,user_id) VALUES('dm','a'),('dm','b')",
  );
});
afterEach(() => db.close());
it("移行しても以前の小部屋の参加者と会話履歴を保持する", () => {
  expect(
    db.prepare("SELECT count(*) n FROM room_members WHERE room_id='old'").get(),
  ).toMatchObject({ n: 3 });
  expect(
    db.prepare("SELECT body FROM messages WHERE id='old-message'").get(),
  ).toMatchObject({ body: "残したい旅の報告" });
});
it("1対1への第三者追加はDBのINSERTとUPDATEの両方で拒否する", () => {
  expect(() =>
    db.exec("INSERT INTO room_members(room_id,user_id) VALUES('dm','c')"),
  ).toThrow();
  expect(() =>
    db.exec(
      "UPDATE room_members SET room_id='dm' WHERE room_id='old' AND user_id='c'",
    ),
  ).toThrow();
  expect(
    db.prepare("SELECT count(*) n FROM room_members WHERE room_id='dm'").get(),
  ).toMatchObject({ n: 2 });
});
it("3人以上の既存グループを個人会話へ転用できない", () => {
  expect(() =>
    db.exec(
      "INSERT INTO direct_conversations(room_id,user_low,user_high) VALUES('old','a','c')",
    ),
  ).toThrow();
});
it("同じ2人の会話の重複・自己会話・順序逆転をDBで拒否する", () => {
  db.exec(
    "INSERT INTO rooms(id,title,subtitle,image) VALUES('second','別の会話','','')",
  );
  for (const pair of [
    ["a", "b"],
    ["a", "a"],
    ["b", "a"],
  ])
    expect(() =>
      db
        .prepare(
          "INSERT INTO direct_conversations(room_id,user_low,user_high) VALUES('second',?,?)",
        )
        .run(...pair),
    ).toThrow();
});
