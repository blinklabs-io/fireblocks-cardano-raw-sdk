import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const temporaryRoot = mkdtempSync(join(tmpdir(), "cardano-raw-sdk-package-"));

const run = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, npm_config_update_notifier: "false" },
  });
  if (result.status !== 0) {
    throw new Error(
      [`Command failed: ${command} ${args.join(" ")}`, result.stdout, result.stderr]
        .filter(Boolean)
        .join("\n")
    );
  }
  return result.stdout;
};

try {
  const packOutput = run(
    npmCommand,
    ["pack", "--json", "--ignore-scripts", "--pack-destination", temporaryRoot],
    root
  );
  const [packed] = JSON.parse(packOutput);
  if (!packed || packed.name !== packageJson.name || packed.version !== packageJson.version) {
    throw new Error(
      `Packed identity mismatch: expected ${packageJson.name}@${packageJson.version}`
    );
  }

  const paths = packed.files.map(({ path }) => path);
  const requiredPaths = ["README.md", "SECURITY.md", "dist/index.d.ts", "dist/index.js"];
  for (const requiredPath of requiredPaths) {
    if (!paths.includes(requiredPath)) {
      throw new Error(`Required package file is missing: ${requiredPath}`);
    }
  }
  const unexpectedPaths = paths.filter(
    (path) =>
      path !== "package.json" &&
      path !== "README.md" &&
      path !== "SECURITY.md" &&
      !path.startsWith("dist/")
  );
  if (unexpectedPaths.length > 0) {
    throw new Error(`Unexpected package files:\n${unexpectedPaths.join("\n")}`);
  }

  const consumer = join(temporaryRoot, "consumer");
  mkdirSync(consumer);
  writeFileSync(
    join(consumer, "package.json"),
    JSON.stringify({ private: true, type: "module" }, null, 2)
  );
  const tarball = join(temporaryRoot, packed.filename);
  run(
    npmCommand,
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--package-lock=false", tarball],
    consumer
  );

  const expectedExports = ["DemeterBlockfrostProvider", "FireblocksCardanoRawSDK", "Networks"];
  run(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `import * as sdk from ${JSON.stringify(packageJson.name)};
for (const name of ${JSON.stringify(expectedExports)}) {
  if (!(name in sdk)) throw new Error(\`Missing runtime export: \${name}\`);
}`,
    ],
    consumer
  );

  writeFileSync(
    join(consumer, "smoke.ts"),
    `import {
  DemeterBlockfrostProvider,
  FireblocksCardanoRawSDK,
  Networks,
} from ${JSON.stringify(packageJson.name)};

const network: Networks = Networks.PREVIEW;
void [DemeterBlockfrostProvider, FireblocksCardanoRawSDK, network];
`
  );
  const typeScript = resolve(root, "node_modules", "typescript", "bin", "tsc");
  run(
    process.execPath,
    [
      typeScript,
      "--noEmit",
      "--strict",
      "--skipLibCheck",
      "--target",
      "ES2022",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      "smoke.ts",
    ],
    consumer
  );

  console.log(
    `Package smoke test passed for ${packed.name}@${packed.version} (${packed.entryCount} files, ${packed.unpackedSize} bytes unpacked).`
  );
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
