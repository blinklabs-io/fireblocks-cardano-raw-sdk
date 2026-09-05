import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const markdownFiles = ["README.md", "SECURITY.md"];
const failures = [];

for (const relativeFile of markdownFiles) {
  const absoluteFile = resolve(root, relativeFile);
  const contents = readFileSync(absoluteFile, "utf8");
  const links = contents.matchAll(/\[[^\]]*\]\(([^)]+)\)/g);
  for (const [, rawTarget] of links) {
    const target = rawTarget.replace(/^<|>$/g, "");
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const localPath = decodeURIComponent(target.split("#")[0]);
    if (localPath && !existsSync(resolve(dirname(absoluteFile), localPath))) {
      failures.push(`${relativeFile}: missing local link target ${target}`);
    }
  }
}

const readme = readFileSync(resolve(root, "README.md"), "utf8");
const staleClaims = [
  'from "cardano-raw-sdk/types"',
  "docker-compose",
  "git clone https://github.com/fireblocks/cardano-raw-sdk",
  "Preview is not currently supported",
  "up to 90%",
  'error.code === "INSUFFICIENT_BALANCE"',
];
for (const staleClaim of staleClaims) {
  if (readme.includes(staleClaim)) failures.push(`README.md: stale claim '${staleClaim}'`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Documentation verification passed (${markdownFiles.length} files).`);
