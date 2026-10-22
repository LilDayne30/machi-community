import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import {
  regions,
  regionLabel,
  withinRegion,
  connectionError,
  type RegionConnection,
} from "../src/lib/regions";
import { matchesMember } from "../src/lib/profile";
import { communityPeople } from "../src/lib/data";
const residence = (
  changes: Partial<RegionConnection> = {},
): RegionConnection => ({
  regionId: "city:JP:tokyo",
  status: "current",
  purpose: "",
  since: null,
  until: null,
  ...changes,
});
function database() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  for (const file of [
    "0001_initial.sql",
    "0002_direct_conversations.sql",
    "0003_profile_photos.sql",
    "0004_region_connections.sql",
  ])
    db.exec(readFileSync("migrations/" + file, "utf8"));
  db.exec(
    "INSERT INTO users(id,google_sub,email,name,profile) VALUES('one','sub','one@example.test','テスト','{\"city\":\"京都\",\"nationality\":\"カナダ\"}')",
  );
  return db;
}
describe("居住の関わりと地域", () => {
  it("街を国・地域の子として扱い、表示名を持つ", () => {
    expect(withinRegion("city:TW:taipei", "country:TW")).toBe(true);
    expect(withinRegion("city:JP:tokyo", "country:TW")).toBe(false);
    expect(regionLabel("city:TW:taipei")).toBe("台湾・台北");
  });
  it("同じ関わりの中で地域とステータスを照合し、国籍から居住地を推定しない", () => {
    const akari = communityPeople[2];
    expect(
      matchesMember(
        akari,
        "Taipei",
        "韓国",
        "",
        "すべて",
        "country:TW",
        "current",
      ),
    ).toBe(true);
    expect(
      matchesMember(akari, "", "韓国", "", "すべて", "country:KR", "current"),
    ).toBe(false);
    expect(
      matchesMember(akari, "", "韓国", "", "すべて", "country:KR", "former"),
    ).toBe(true);
    expect(
      matchesMember(akari, "", "韓国", "", "すべて", "country:JP", "current"),
    ).toBe(false);
  });
  it("未選択・複数の現在地・重複・逆転した年を拒否", () => {
    expect(connectionError([residence({ regionId: "" })])).toBeTruthy();
    expect(
      connectionError([residence(), residence({ regionId: "country:TW" })]),
    ).toBeTruthy();
    expect(
      connectionError([
        residence({ status: "former" }),
        residence({ status: "former" }),
      ]),
    ).toBeTruthy();
    expect(
      connectionError([
        residence({ status: "former", since: 2024, until: 2020 }),
      ]),
    ).toBeTruthy();
    expect(connectionError([residence({ until: 2026 })])).toBeTruthy();
    expect(connectionError([residence({ since: 1800 })])).toBeTruthy();
    expect(
      connectionError([
        residence(),
        residence({
          regionId: "city:TW:taipei",
          status: "former",
          purpose: "study",
          since: 2019,
          until: 2022,
        }),
      ]),
    ).toBe("");
  });
  it("カタログとDBの地域ID・親地域が一致し、既存プロフィールに居住地を補完しない", () => {
    const db = database();
    expect(
      db
        .prepare(
          "SELECT id,name,english,parent_id parentId,kind FROM regions ORDER BY id",
        )
        .all(),
    ).toEqual([...regions].sort((a, b) => a.id.localeCompare(b.id, "en")));
    expect(
      db.prepare("SELECT count(*) n FROM user_region_connections").get()?.n,
    ).toBe(0);
    expect(
      JSON.parse(
        String(
          db.prepare("SELECT profile FROM users WHERE id='one'").get()?.profile,
        ),
      ),
    ).toEqual({ city: "京都", nationality: "カナダ" });
    db.close();
  });
  it("DBでも現在地は1件に限定し、存在しない地域と不正な期間を拒否", () => {
    const db = database();
    db.exec(
      "INSERT INTO user_region_connections(user_id,region_id,status) VALUES('one','country:JP','current')",
    );
    expect(() =>
      db.exec(
        "INSERT INTO user_region_connections(user_id,region_id,status) VALUES('one','country:TW','current')",
      ),
    ).toThrow();
    expect(() =>
      db.exec(
        "INSERT INTO user_region_connections(user_id,region_id,status) VALUES('one','unknown','former')",
      ),
    ).toThrow();
    expect(() =>
      db.exec(
        "INSERT INTO user_region_connections(user_id,region_id,status,start_year,end_year) VALUES('one','country:TW','former',2024,2020)",
      ),
    ).toThrow();
    db.close();
  });
});
