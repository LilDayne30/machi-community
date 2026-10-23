import { execFileSync } from "node:child_process";
// Revoke disposable admin sessions and free the real owner's email after LOCAL tests.
// Neither the fixed sessions nor this fixture-only identity may survive as an admin login.
export default function () {
  execFileSync(
    "node",
    [
      "node_modules/wrangler/bin/wrangler.js",
      "d1",
      "execute",
      "DB",
      "--local",
      "--command",
      "DELETE FROM admin_sessions WHERE user_id IN (SELECT id FROM users WHERE id LIKE 'e2e-%' AND google_sub LIKE 'google-%'); UPDATE users SET email='e2e-admin@fixtures.invalid' WHERE id='e2e-admin' AND google_sub='google-admin';",
    ],
    { stdio: "pipe" },
  );
}
