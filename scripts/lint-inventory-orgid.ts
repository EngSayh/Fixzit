import fg from "fast-glob";
import fs from "fs";
import path from "path";
import ts from "typescript";

type Violation = { file: string; line: number; col: number; message: string };

const inventoryVarName = "inventoryService";
const listingModels = new Set(["SouqListing", "SouqProduct"]);

// Methods that take an object literal and must include orgId
const objectArgMethods = new Set([
  "initializeInventory",
  "reserveInventory",
  "releaseReservation",
  "convertReservationToSale",
  "processReturn",
  "adjustInventory",
]);

// Methods with an object filters arg that must include orgId
const objectFilterMethods = new Set(["getSellerInventory"]);

// Methods with positional orgId requirements: map method -> zero-based arg index
const positionalOrgIndex: Record<string, number> = {
  receiveStock: 3, // listingId, quantity, performedBy, orgId, reason?
  getInventory: 1, // listingId, orgId
  getInventoryHealthReport: 1, // sellerId, orgId
  cleanExpiredReservations: 0, // orgId
  updateHealthMetrics: 1, // sellerId, orgId
  queueLowStockAlerts: 1, // sellerId, orgId
};

function hasOrgIdProp(arg: ts.ObjectLiteralExpression): boolean {
  return arg.properties.some((prop) => {
    if (
      ts.isPropertyAssignment(prop) ||
      ts.isShorthandPropertyAssignment(prop)
    ) {
      const name = prop.name ?? (ts.isShorthandPropertyAssignment(prop) ? prop.name : undefined);
      return name?.getText() === "orgId";
    }
    return false;
  });
}

function recordViolation(
  violations: Violation[],
  sf: ts.SourceFile,
  node: ts.Node,
  message: string,
) {
  const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  violations.push({
    file: path.relative(process.cwd(), sf.fileName),
    line: line + 1,
    col: character + 1,
    message,
  });
}

function checkCall(node: ts.CallExpression, sf: ts.SourceFile, violations: Violation[]) {
  if (!ts.isPropertyAccessExpression(node.expression)) return;
  const callee = node.expression;
  const target = callee.expression.getText(sf);

  // Inventory service guardrails
  if (target === inventoryVarName) {
    const method = callee.name.getText(sf);
  
    // Object literal methods
    if (objectArgMethods.has(method)) {
      const [arg] = node.arguments;
      if (!arg || !ts.isObjectLiteralExpression(arg) || !hasOrgIdProp(arg)) {
        recordViolation(
          violations,
          sf,
          node,
          `${method}() must be called with an object argument containing orgId`,
        );
      }
      return;
    }
  
    // Object filter methods (second arg must have orgId)
    if (objectFilterMethods.has(method)) {
      const [, arg] = node.arguments;
      if (!arg || !ts.isObjectLiteralExpression(arg) || !hasOrgIdProp(arg)) {
        recordViolation(
          violations,
          sf,
          node,
          `${method}() second argument must include orgId`,
        );
      }
      return;
    }
  
    // Positional orgId methods
    if (method in positionalOrgIndex) {
      const idx = positionalOrgIndex[method];
      const arg = node.arguments[idx];
      if (!arg || ts.isOmittedExpression(arg)) {
        recordViolation(
          violations,
          sf,
          node,
          `${method}() argument ${idx + 1} must be orgId`,
        );
        return;
      }
      return;
    }
    return;
  }

  // Listing/Product model guardrails: queries must include orgId in filter object
  if (listingModels.has(target)) {
    const method = callee.name.getText(sf);
    const firstArg = node.arguments[0];
    const methodsRequiringFilter = new Set([
      "find",
      "findOne",
      "findOneAndUpdate",
      "updateOne",
      "updateMany",
      "deleteOne",
      "deleteMany",
      "countDocuments",
    ]);

    if (methodsRequiringFilter.has(method)) {
      if (!firstArg || !ts.isObjectLiteralExpression(firstArg) || !hasOrgIdProp(firstArg)) {
        recordViolation(
          violations,
          sf,
          node,
          `${target}.${method}() must include orgId in the filter`,
        );
      }
    }
  }
}

async function main() {
  const files = await fg(
    [
      "app/api/souq/inventory/**/*.ts",
      "services/souq/**/*.ts",
      "app/api/souq/returns/**/*.ts",
    ],
    { ignore: ["**/node_modules/**", "**/.next/**"] },
  );

  const violations: Violation[] = [];

  for (const file of files) {
    const code = fs.readFileSync(file, "utf8");
    const sf = ts.createSourceFile(
      file,
      code,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    function visit(node: ts.Node) {
      if (ts.isCallExpression(node)) {
        checkCall(node, sf, violations);
      }
      ts.forEachChild(node, visit);
    }

    visit(sf);
  }

  if (violations.length > 0) {
    for (const v of violations) {
      console.error(`${v.file}:${v.line}:${v.col} ${v.message}`);
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("lint-inventory-orgid failed", err);
  process.exitCode = 1;
});
