import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain ESM script without type declarations
import { buildSql, normalizeEmail, parseArgs } from "../scripts/invite.mjs";

describe("invite CLI", () => {
  it("requires exactly one of --local / --remote", () => {
    expect(() => parseArgs(["--email", "a@example.com"])).toThrow(/--local/);
    expect(() =>
      parseArgs(["--email", "a@example.com", "--local", "--remote"]),
    ).toThrow(/--local/);
  });
  it("requires exactly one action", () => {
    expect(() => parseArgs(["--local"])).toThrow(/--email/);
    expect(() =>
      parseArgs(["--local", "--list", "--email", "a@example.com"]),
    ).toThrow(/--email/);
  });
  it("normalizes email and defaults to 30 days", () => {
    const o = parseArgs(["--email", "  Person@Example.COM ", "--local"]);
    expect(o).toMatchObject({ email: "person@example.com", days: 30 });
  });
  it("rejects invalid days and emails", () => {
    for (const d of ["0", "31", "1.5", "x"])
      expect(() =>
        parseArgs(["--email", "a@example.com", "--local", "--days", d]),
      ).toThrow(/days/);
    for (const e of ["no-at", "a@b", "a'b@example.com", "a@example.com;DROP"])
      expect(() => normalizeEmail(e)).toThrow();
  });
  it("builds SQL that only touches invitations", () => {
    const invite = buildSql(
      parseArgs(["--email", "a@example.com", "--remote", "--days", "7"]),
    );
    expect(invite).toMatch(/^INSERT INTO invitations/);
    expect(invite).toContain("'+7 days'");
    expect(invite).not.toMatch(/users|sessions|role/);
    const revoke = buildSql(
      parseArgs(["--revoke", "a@example.com", "--local"]),
    );
    expect(revoke).toMatch(/^UPDATE invitations .* used_at IS NULL$/);
    expect(buildSql(parseArgs(["--list", "--local"]))).toMatch(/^SELECT/);
  });
});
