import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

/**
 * Transpile a .ts/.tsx file on demand and import it as ESM.
 * Caches compiled output under ./.cache/ts-import/<file>.<hash>.mjs
 * Pass compilerOptions to override defaults (module/moduleResolution/etc.).
 */
export async function importTs(tsPath, opts = {}) {
  const { esm = true, force = false, compilerOptions = {} } = opts;
  const abs = path.resolve(tsPath);
  const src = await fs.readFile(abs, 'utf8');

  let ts;
  try {
    ts = await import('typescript');
  } catch {
    throw new Error(
      `TypeScript is required to load ${tsPath}. Install it with: pnpm add -D typescript`
    );
  }

  const moduleResolution =
    compilerOptions.moduleResolution ?? (esm ? ts.ModuleResolutionKind.NodeNext : ts.ModuleResolutionKind.Node10);
  let moduleKind = compilerOptions.module ?? (esm ? ts.ModuleKind.ESNext : ts.ModuleKind.CommonJS);

  if (moduleResolution === ts.ModuleResolutionKind.NodeNext && moduleKind !== ts.ModuleKind.NodeNext) {
    moduleKind = ts.ModuleKind.NodeNext;
  }

  const baseCompilerOptions = {
    module: moduleKind,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
    moduleResolution,
    sourceMap: false
  };

  const result = ts.transpileModule(src, {
    compilerOptions: {
      ...baseCompilerOptions,
      ...compilerOptions
    },
    fileName: path.basename(abs),
    reportDiagnostics: true
  });

  if (result.diagnostics?.length) {
    const msg = result.diagnostics
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
      .join('\n');
    throw new Error(`TypeScript transpile diagnostics for ${tsPath}:\n${msg}`);
  }

  const hash = crypto.createHash('sha1').update(src).digest('hex');
  const outDir = path.join(process.cwd(), '.cache', 'ts-import');
  await fs.mkdir(outDir, { recursive: true });
  const rel = path.relative(process.cwd(), abs) || path.basename(abs);
  const safeName = rel.replace(/[\\/]/g, '__');
  const outFile = path.join(outDir, `${safeName}.${hash}.mjs`);

  try {
    if (force) throw new Error('force');
    await fs.access(outFile);
  } catch {
    await fs.writeFile(outFile, result.outputText, 'utf8');
  }

  const mod = await import(pathToFileURL(outFile).href);
  return mod.default ?? mod;
}
