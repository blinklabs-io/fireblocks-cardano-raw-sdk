import { spawnSync } from "node:child_process";

const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.error("Usage: node scripts/check-generated-clean.mjs <path> [...path]");
  process.exit(2);
}

const result = spawnSync(
  "git",
  ["status", "--porcelain=v1", "--untracked-files=all", "--", ...paths],
  { cwd: process.cwd(), encoding: "utf8" }
);

if (result.error) {
  console.error(`Unable to inspect generated files: ${result.error.message}`);
  process.exit(2);
}
if (result.status !== 0) {
  process.stderr.write(result.stderr || "git status failed\n");
  process.exit(result.status ?? 2);
}

const changes = result.stdout.trim();
if (changes) {
  console.error("Generated files are not synchronized with their sources:");
  console.error(changes);
  process.exit(1);
}
