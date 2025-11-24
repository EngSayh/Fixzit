import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const projectRoot = process.cwd();
const WORKFLOW_PATH =
  process.env.ROUTE_ALIAS_WORKFLOW_PATH ||
  path.join(projectRoot, "_artifacts/alias-workflow.json");

export type AliasWorkflowEntry = {
  owner: string;
  resolved: boolean;
  updatedAt: string;
};

export type AliasWorkflowMap = Record<string, AliasWorkflowEntry>;

function ensureDefaults(entry?: AliasWorkflowEntry): AliasWorkflowEntry {
  return (
    entry ?? {
      owner: "",
      resolved: false,
      updatedAt: new Date().toISOString(),
    }
  );
}

export function readAliasWorkflow(): AliasWorkflowMap {
  if (!existsSync(WORKFLOW_PATH)) {
    return {};
  }

  try {
    const raw = readFileSync(WORKFLOW_PATH, "utf8");
    const data = JSON.parse(raw) as AliasWorkflowMap;
    return data;
  } catch {
    return {};
  }
}

export function writeAliasWorkflow(map: AliasWorkflowMap) {
  writeFileSync(WORKFLOW_PATH, JSON.stringify(map, null, 2));
}

export function upsertAliasWorkflow(
  aliasFile: string,
  updates: Partial<AliasWorkflowEntry>,
): AliasWorkflowEntry {
  const currentMap = readAliasWorkflow();
  const baseline = ensureDefaults(currentMap[aliasFile]);
  const next: AliasWorkflowEntry = {
    ...baseline,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  const nextMap: AliasWorkflowMap = {
    ...currentMap,
    [aliasFile]: next,
  };
  writeAliasWorkflow(nextMap);
  return next;
}
