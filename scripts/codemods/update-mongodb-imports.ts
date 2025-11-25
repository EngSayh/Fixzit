import fg from "fast-glob";
import fs from "fs";
import recast from "recast";
import * as typescriptParser from "recast/parsers/typescript";

const files = await fg(["**/*.{ts,tsx,js,jsx}", "!node_modules/**"]);

for (const f of files) {
  const code = fs.readFileSync(f, "utf8");
  if (!/mongodb/.test(code)) continue;

  const ast = recast.parse(code, { parser: typescriptParser });
  let changed = false;

  recast.visit(ast, {
    visitImportDeclaration(p) {
      const s = p.value.source.value as string;
      if (/mongodb/.test(s)) {
        p.value.source.value = "@/lib/db";
        p.value.specifiers = [
          recast.types.builders.importSpecifier(
            recast.types.builders.identifier("collection"),
          ),
          recast.types.builders.importSpecifier(
            recast.types.builders.identifier("withOrg"),
          ),
        ];
        changed = true;
      }
      this.traverse(p);
    },
  });

  if (changed) {
    fs.writeFileSync(f, recast.print(ast).code, "utf8");
    console.log(`Rewired Mongo import in ${f}`);
  }
}
