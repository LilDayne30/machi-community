import { execFileSync } from "node:child_process";
export const gh = process.env.GH_CLI_EXECUTABLE || "gh";
export function checkGitHubAccount() {
  const run = (args) =>
    JSON.parse(
      execFileSync(gh, args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    );
  let user, emails;
  try {
    user = run(["api", "user"]);
    emails = run(["api", "user/emails"]);
  } catch {
    throw new Error(
      "GitHub認証を確認できません。gh auth login --hostname github.com --web --scopes user:email を実行し、LilDayne30で認証してください。",
    );
  }
  if (
    user.login !== "LilDayne30" ||
    !emails.some(
      (e) => e.email.toLowerCase() === "danaoki30@gmail.com" && e.verified,
    )
  )
    throw new Error(
      "Pushを中止：LilDayne30 かつ確認済みメール danaoki30@gmail.com の認証が必要です。",
    );
  console.log("GitHub identity verified: LilDayne30 / danaoki30@gmail.com");
  return user;
}
if (process.argv[1]?.endsWith("check-github-account.mjs"))
  try {
    checkGitHubAccount();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
