import { execFileSync } from "node:child_process";
export default function () {
  execFileSync("node", ["tests/seed.mjs"], { stdio: "inherit" });
}
