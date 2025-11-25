/**
 * Import Path Normalization Codemod
 *
 * Transforms import statements to use canonical path aliases:
 * - Rewrites "@/src/..." to "@/..."
 * - Simplifies deep relative imports (../../../...) to "@/..."
 * - Preserves existing valid "@/..." aliases
 *
 * Usage:
 *   npx jscodeshift -t scripts/codemods/import-rewrite.cjs app/ --parser=tsx
 */

module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let modified = false;

  /**
   * Normalize import path
   * @param {string} importPath - The import path to normalize
   * @returns {string} - Normalized path
   */
  function normalizeImportPath(importPath) {
    // Skip external modules (no relative or alias markers)
    if (!importPath.startsWith(".") && !importPath.startsWith("@/")) {
      return importPath;
    }

    // Fix "@/src/..." to "@/..."
    if (importPath.startsWith("@/src/")) {
      return importPath.replace("@/src/", "@/");
    }

    // Simplify deep relative imports (../../../)
    // Count how many levels deep
    const relativeMatch = importPath.match(/^(\.\.\/)+/);
    if (relativeMatch && relativeMatch[0].split("../").length > 3) {
      // Assume deep relative imports should be aliased
      // This is a heuristic; may need manual review
      const cleanPath = importPath.replace(/^(\.\.\/)+/, "");
      return `@/${cleanPath}`;
    }

    // Already valid "@/..." alias
    if (importPath.startsWith("@/")) {
      return importPath;
    }

    // Leave other relative imports (./...) as-is
    return importPath;
  }

  // Transform import declarations: import X from 'Y'
  root.find(j.ImportDeclaration).forEach((path) => {
    const oldSource = path.node.source.value;
    const newSource = normalizeImportPath(oldSource);
    if (oldSource !== newSource) {
      path.node.source.value = newSource;
      modified = true;
    }
  });

  // Transform dynamic imports: import('Y')
  root
    .find(j.CallExpression, { callee: { type: "Import" } })
    .forEach((path) => {
      if (path.node.arguments[0] && path.node.arguments[0].type === "Literal") {
        const oldSource = path.node.arguments[0].value;
        const newSource = normalizeImportPath(oldSource);
        if (oldSource !== newSource) {
          path.node.arguments[0].value = newSource;
          modified = true;
        }
      }
    });

  // Transform require() calls: require('Y')
  root
    .find(j.CallExpression, { callee: { name: "require" } })
    .forEach((path) => {
      if (path.node.arguments[0] && path.node.arguments[0].type === "Literal") {
        const oldSource = path.node.arguments[0].value;
        const newSource = normalizeImportPath(oldSource);
        if (oldSource !== newSource) {
          path.node.arguments[0].value = newSource;
          modified = true;
        }
      }
    });

  return modified ? root.toSource() : null;
};
