import { spawnSync } from "node:child_process";

const result = spawnSync("eslint", ["."], {
  stdio: "inherit",
  env: { ...process.env, ESLINT_USE_FLAT_CONFIG: "false" },
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

if (result.signal) {
  console.error(`eslint terminated by signal ${result.signal}`);
  process.exit(1);
}

process.exit(result.status ?? 0);
