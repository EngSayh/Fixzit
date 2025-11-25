/**
 * Console → Logger Replacement Codemod
 *
 * Transforms console.* calls to logger.* with automatic import injection:
 * - console.log → logger.info
 * - console.warn → logger.warn
 * - console.error → logger.error
 * - Adds "import { logger } from '@/lib/logger'" if not present
 *
 * Usage:
 *   npx jscodeshift -t scripts/codemods/replace-console.cjs app/ --parser=tsx
 */

module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let modified = false;

  const LOGGER_IMPORT = "@/lib/logger";
  const CONSOLE_MAP = {
    log: "info",
    warn: "warn",
    error: "error",
    info: "info",
    debug: "debug",
  };

  // Transform console.* calls to logger.*
  root
    .find(j.CallExpression, {
      callee: {
        type: "MemberExpression",
        object: { name: "console" },
      },
    })
    .forEach((path) => {
      const method = path.node.callee.property.name;
      const loggerMethod = CONSOLE_MAP[method] || "info";

      // Replace console.method with logger.method
      path.node.callee.object.name = "logger";
      path.node.callee.property.name = loggerMethod;
      modified = true;
    });

  // If modifications were made, ensure logger is imported
  if (modified) {
    const hasLoggerImport = root
      .find(j.ImportDeclaration, {
        source: { value: LOGGER_IMPORT },
      })
      .some((path) => {
        return path.node.specifiers.some(
          (specifier) =>
            specifier.type === "ImportSpecifier" &&
            specifier.imported.name === "logger",
        );
      });

    if (!hasLoggerImport) {
      // Find existing imports from @/lib/logger
      const existingLibImport = root.find(j.ImportDeclaration, {
        source: { value: LOGGER_IMPORT },
      });

      if (existingLibImport.length > 0) {
        // Add logger to existing import
        existingLibImport.forEach((path) => {
          const hasLogger = path.node.specifiers.some(
            (spec) => spec.imported && spec.imported.name === "logger",
          );
          if (!hasLogger) {
            path.node.specifiers.push(
              j.importSpecifier(j.identifier("logger")),
            );
          }
        });
      } else {
        // Create new import statement
        const newImport = j.importDeclaration(
          [j.importSpecifier(j.identifier("logger"))],
          j.literal(LOGGER_IMPORT),
        );

        // Insert at the top (after existing imports or at the beginning)
        const firstImport = root.find(j.ImportDeclaration).at(0);
        if (firstImport.length > 0) {
          firstImport.insertBefore(newImport);
        } else {
          root.get().node.program.body.unshift(newImport);
        }
      }
    }
  }

  return modified ? root.toSource() : null;
};
