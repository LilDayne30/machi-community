import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { checkGitHubAccount, gh } from "./check-github-account.mjs";
checkGitHubAccount();
const root = realpathSync(process.cwd()),
  repo = "LilDayne30/machi-community",
  remote = "https://LilDayne30@github.com/" + repo + ".git";
const run = (cmd, args, options = {}) =>
  execFileSync(cmd, args, { stdio: "inherit", ...options });
let top = "";
try {
  top = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  }).trim();
} catch {}
// The supplied workspace can be nested in an unrelated worktree. Never reuse its remote.
if (top !== root) run("git", ["init", "--initial-branch=main"]);
run("git", ["config", "--local", "user.name", "LilDayne30"]);
run("git", ["config", "--local", "user.email", "danaoki30@gmail.com"]);
run("git", ["config", "--local", "core.hooksPath", ".githooks"]);
let existing = "";
try {
  existing = execFileSync("git", ["remote", "get-url", "origin"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
} catch {}
if (existing && existing !== remote)
  throw new Error("Pushを中止：originが指定の公開先と一致しません。");
if (!existing) run("git", ["remote", "add", "origin", remote]);
try {
  execFileSync(gh, ["repo", "view", repo, "--json", "name"], { stdio: "pipe" });
} catch {
  run(gh, [
    "repo",
    "create",
    repo,
    "--public",
    "--description",
    "旅行者と地域の人が会話を続ける、招待制のモバイルWebアプリ。Cloudflare Workers + D1 + Workers AI。",
  ]);
}
run("git", ["add", "."]);
try {
  execFileSync("git", ["diff", "--cached", "--quiet"]);
} catch {
  run("git", [
    "commit",
    "-m",
    "Build machi community app with Cloudflare API and browser tests",
  ]);
}
checkGitHubAccount();
// Use the verified CLI identity for this single push, preserving other repositories' credentials.
const quote = (s) => "'" + s.replaceAll("'", "'\\''") + "'";
run("git", [
  "-c",
  "credential.helper=",
  "-c",
  "credential.helper=!" + quote(gh) + " auth git-credential",
  "push",
  "--set-upstream",
  "origin",
  "main",
]);
console.log("https://github.com/" + repo);
