import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const projectRoot = process.cwd();
const sourcePath = path.join(projectRoot, "_artifacts/route-aliases.json");
const historyDir = path.join(projectRoot, "reports/route-metrics/history");

if (!existsSync(sourcePath)) {
  console.error(
    "Missing _artifacts/route-aliases.json. Run npm run check:route-aliases:json first.",
  );
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
mkdirSync(historyDir, { recursive: true });

const destination = path.join(historyDir, `route-aliases-${timestamp}.json`);
const payload = readFileSync(sourcePath, "utf8");
writeFileSync(destination, payload);

console.log(
  `Saved route alias snapshot to ${path.relative(projectRoot, destination)}`,
);
