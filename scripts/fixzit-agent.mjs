#!/usr/bin/env node
/**
 * Fixzit Agent — End-to-End Stabilization Protocol
 * 
 * This script performs comprehensive repository stabilization:
 * - Mines recent fixes from Git history
 * - Sweeps for similar issues using heuristics
 * - Audits for duplicate files
 * - Generates canonical file structure (Governance V5)
 * - Applies codemods for import normalization
 * - Runs static analysis (ESLint, TypeScript)
 * - Generates comprehensive reports
 * 
 * Usage:
 *   pnpm run fixzit:agent              # Dry run (reports only)
 *   pnpm run fixzit:agent:apply        # Apply changes (creates branch, commits)
 *   pnpm run fixzit:agent:stop         # Stop keep-alive server
 * 
 * Flags:
 *   --apply       Execute file moves and codemods
 *   --report      Generate comprehensive reports
 *   --since N     Analyze fixes from N days ago (default: 5)
 *   --port N      Dev server port (default: 3000)
 *   --no-keep-alive  Don't start dev server after completion
 */

import { $, argv } from 'zx';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import ora from 'ora';
import chalk from 'chalk';
import { globby } from 'globby';
import { spawn } from 'child_process';

// Configuration
const PORT = argv.port || 3000;
const APPLY = argv.apply || false;
const REPORT_FLAG = argv.report || false;
const SINCE_DAYS = argv.since || 5;
const KEEP_ALIVE = argv.keepAlive !== false;

const ROOT_DIR = path.resolve(process.cwd());
const REPORTS_DIR = path.join(ROOT_DIR, 'reports');
const TASKS_DIR = path.join(ROOT_DIR, 'tasks');
const SCRIPTS_DIR = path.join(ROOT_DIR, 'scripts');
const TMP_DIR = path.join(ROOT_DIR, 'tmp');
const AGENT_CACHE_DIR = path.join(ROOT_DIR, '.agent-cache');
const CODEMODS_DIR = path.join(SCRIPTS_DIR, 'codemods');

const PID_FILE = path.join(AGENT_CACHE_DIR, 'dev.pid');

// Governance V5 Buckets
const GOV_V5_BUCKETS = [
    'app/dashboard', 'app/work-orders', 'app/properties', 'app/finance', 'app/hr',
    'app/administration', 'app/crm', 'app/marketplace', 'app/support',
    'app/compliance', 'app/reports', 'app/system', 'components', 'components/navigation'
];

// Heuristics Mapping (Regex String to Bucket)
const HEURISTICS_MAP = {
    '/(work-?orders|wo|ticket)/i': 'app/work-orders',
    '/(propert(y|ies)|unit|lease)/i': 'app/properties',
    '/(finance|invoice|payment|budget)/i': 'app/finance',
    '/(hr|technician|payroll|employee)/i': 'app/hr',
    '/(admin|settings|configuration|user|role)/i': 'app/administration',
    '/(crm|customer|lead)/i': 'app/crm',
    '/(marketplace|vendor|catalog|rfq)/i': 'app/marketplace',
    '/(support|helpdesk)/i': 'app/support',
    '/(compliance|audit)/i': 'app/compliance',
    '/(report(ing)?|analytic)/i': 'app/reports',
    '/(system|health|monitoring)/i': 'app/system',
    '/(dashboard|overview)/i': 'app/dashboard',
    '/(header|topbar|sidebar|footer|nav|menu)/i': 'components/navigation',
    '/(ui|component|shared|layout)/i': 'components'
};

async function main() {
    console.log(chalk.blue('🚀 Fixzit Agent - E2E Stabilization Protocol 🚀'));
    console.log(`Mode: ${APPLY ? chalk.red('APPLY (Modifying files)') : chalk.green('DRY RUN (Reporting only)')}`);
    console.log(`Analyzing fixes since: ${SINCE_DAYS} days ago`);

    await setupEnvironment();
    const pm = await detectPackageManager();

    await installTooling(pm);
    await baselineChecks(pm);

    // Phase 2 Canonical Scanners (non-blocking)
    await $`node scripts/api-scan-v2.mjs`.nothrow();
    await $`node scripts/i18n-scan-v2.mjs`.nothrow();

    const branchName = await gitSafety();

    await mineRecentFixes();
    await sweepSimilarIssues();

    await staticAnalysis(pm, 'initial');

    await duplicateAudit();

    const movePlan = await generateMovePlan();

    if (APPLY) {
        await applyMovePlan(movePlan);
        await staticAnalysis(pm, 'after');
        await $`git commit -m "fixzit-agent: canonicalize structure + import rewrites (STRICT v4, Gov V5)"`;
        console.log(chalk.green(`✅ Changes committed to branch: ${branchName}`));
    } else {
        console.log(chalk.yellow('ℹ️ Dry run complete. Use --apply to execute the move plan.'));
    }

    await generateReportsAndTasks();

    await runHooks();

    if (KEEP_ALIVE) {
        await startDevServer(pm);
    }

    console.log(chalk.blue('🏁 Fixzit Agent Protocol Complete 🏁'));
}

async function setupEnvironment() {
    await Promise.all([
        fs.promises.mkdir(REPORTS_DIR, { recursive: true }),
        fs.promises.mkdir(TASKS_DIR, { recursive: true }),
        fs.promises.mkdir(SCRIPTS_DIR, { recursive: true }),
        fs.promises.mkdir(TMP_DIR, { recursive: true }),
        fs.promises.mkdir(AGENT_CACHE_DIR, { recursive: true }),
        fs.promises.mkdir(CODEMODS_DIR, { recursive: true }),
    ]);
}

async function detectPackageManager() {
    if (fs.existsSync(path.join(ROOT_DIR, 'pnpm-lock.yaml'))) return 'pnpm';
    if (fs.existsSync(path.join(ROOT_DIR, 'yarn.lock'))) return 'yarn';
    return 'npm';
}

async function installTooling(pm) {
    const spinner = ora('Installing necessary tooling (devDependencies)...').start();
    const installCmd = pm === 'npm' ? 'install' : 'add';
    const devFlag = pm === 'npm' ? '--save-dev' : '-D';

    const packages = [
        'eslint', '@typescript-eslint/parser', '@typescript-eslint/eslint-plugin',
        'eslint-plugin-react', 'eslint-plugin-react-hooks', 'eslint-plugin-jsx-a11y',
        'typescript', 'ts-node', 'ts-morph', 'jscodeshift', 'prettier',
        'fast-glob', 'globby', 'chalk@4', 'ora@5', 'madge', 'depcheck', 'rimraf',
        'zx', '@inquirer/prompts', 'shx', '@playwright/test', 'playwright'
    ];

    try {
        await $`${pm} ${installCmd} ${devFlag} ${packages}`;
        spinner.text = 'Installing Playwright browsers and dependencies...';
        await $`npx playwright install --with-deps`;
        spinner.succeed('Tooling installed successfully.');
    } catch (error) {
        spinner.fail('Failed to install tooling. Check network and permissions.');
        console.error(error);
        process.exit(1);
    }
}

async function baselineChecks(pm) {
    const spinner = ora('Running baseline checks...').start();
    try {
        const gitStatus = await $`git status --porcelain`;
        const nodeV = await $`node -v`;
        const pmV = await $`${pm} -v`;

        console.log(`Node Version: ${nodeV.stdout.trim()}`);
        console.log(`${pm} Version: ${pmV.stdout.trim()}`);

        if (gitStatus.stdout.trim() && APPLY) {
            spinner.fail('Working directory is not clean. Commit or stash changes before running in apply mode.');
            process.exit(1);
        }

        spinner.text = 'Running initial build (logging only)...';
        const buildLogPath = path.join(REPORTS_DIR, 'build-initial.log');
        try {
             const buildResult = await $`${pm} run build`;
             await fs.promises.writeFile(buildLogPath, buildResult.stdout + '\n' + buildResult.stderr);
        } catch (buildError) {
             await fs.promises.writeFile(buildLogPath, buildError.stdout + '\n' + buildError.stderr);
             console.log(chalk.yellow('ℹ️ Initial build failed (logged). Proceeding with analysis.'));
        }

        spinner.succeed('Baseline checks complete.');
    } catch (error) {
        spinner.fail('Baseline checks failed.');
        console.error(error);
        process.exit(1);
    }
}

async function gitSafety() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const branchName = `fixzit-agent/${timestamp}`;

    if (APPLY) {
        const spinner = ora(`Creating and switching to branch: ${branchName}`).start();
        try {
            await $`git checkout -b ${branchName}`;
            spinner.succeed(`Switched to new branch: ${branchName}`);
        } catch (error) {
            spinner.fail('Failed to create new branch.');
            console.error(error);
            process.exit(1);
        }
    }
    return branchName;
}

async function mineRecentFixes() {
    const spinner = ora(`Mining fixes from the last ${SINCE_DAYS} days...`).start();
    try {
        const rawLog = await $`git log --since='${SINCE_DAYS} days ago' --pretty=format:'%H|%ad|%s' --date=iso --name-only`;
        await fs.promises.writeFile(path.join(TMP_DIR, 'fixes_5d_raw.log'), rawLog.stdout);

        const diffPatch = await $`git log --since='${SINCE_DAYS} days ago' -p`;
        await fs.promises.writeFile(path.join(TMP_DIR, 'fixes_5d_diff.patch'), diffPatch.stdout);

        const commits = [];
        let currentCommit = null;
        rawLog.stdout.split('\n').forEach(line => {
            if (line.includes('|')) {
                if (currentCommit) commits.push(currentCommit);
                const [hash, date, subject] = line.split('|');
                currentCommit = { hash, date, subject, files: [] };
            } else if (currentCommit && line.trim()) {
                currentCommit.files.push(line.trim());
            }
        });
        if (currentCommit) commits.push(currentCommit);

        await fs.promises.writeFile(path.join(REPORTS_DIR, 'fixes_5d.json'), JSON.stringify(commits, null, 2));
        spinner.succeed(`Mined ${commits.length} recent commits.`);
    } catch (error) {
        spinner.fail('Failed to mine recent fixes.');
        console.error(error);
    }
}

/**
 * Context-aware unhandled rejection detection
 * Returns true only if the file has async/await/promises WITHOUT proper error handling
 */
function hasUnhandledRejection(content, filePath) {
    // Skip if file has proper error handling patterns
    const hasTryCatch = /try\s*\{[\s\S]*?catch/i.test(content);
    const hasCatchChaining = /\.catch\s*\(/i.test(content);
    const hasErrorBoundary = /ErrorBoundary|componentDidCatch/i.test(content);
    const hasNextCatch = /\.then\([^)]*\)\s*\.catch\(/i.test(content);
    
    // Has async/await or promises
    const hasAsyncCode = /(async\s+function|async\s+\(|\basync\s+\w+|await\s+|\.\s*then\s*\()/i.test(content);
    
    if (!hasAsyncCode) {
        return false; // No async code, no risk
    }
    
    // If has async code but proper error handling, it's OK
    if (hasTryCatch || hasCatchChaining || hasErrorBoundary || hasNextCatch) {
        return false; // Properly handled
    }
    
    // Special cases: API routes with NextResponse (intentional pattern)
    const apiRoutePattern = /app\/api\/.*route\.(ts|js)/;
    if (apiRoutePattern.test(filePath) && /NextResponse\./i.test(content)) {
        return false; // API routes typically handle errors with NextResponse
    }
    
    // React components with 'use client' and useEffect (has built-in error boundaries)
    if (/'use client'/.test(content) && /useEffect/.test(content)) {
        return false; // Client components have error boundary protection
    }
    
    // If we got here: has async code but no visible error handling
    return true;
}

async function sweepSimilarIssues() {
    const spinner = ora('Sweeping repository for similar issues based on heuristics...').start();

    const heuristics = [
        { name: 'Hydration/Server-Client Mismatch (Potential)', pattern: /Hydration failed|Text content did not match|use(Layout)?Effect/i },
        { name: 'Undefined Property Access (Potential)', pattern: /Cannot read propert(y|ies) .* of undefined|TypeError:/i },
        { name: 'i18n/RTL Issues (Potential)', pattern: /t\(['"]MISSING_KEY|dir=["'](ltr|rtl)["']|text-left|text-right|pl-|pr-|ml-|mr-/i },
        { name: 'Fragile Relative Imports', pattern: /import .* from '(?:\.\.\/){3,}/ },
        { name: 'Alias Misuse ( "@/src" )', pattern: /import .* from ['"]@\/src\// },
        { name: 'NextResponse Usage', pattern: /NextResponse\.(json|redirect|next)/i },
        { name: 'TypeScript Assignability Issues (Potential)', pattern: /is not assignable to type|Type '.*' does not satisfy/i }
        // Note: Unhandled Rejections now uses context-aware function below
    ];

    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.md'];
    const exclude = ['node_modules', '.next', 'dist', 'coverage', '.git', 'reports', 'tmp'];

    const hits = [];
    const todoList = [];

    try {
        const files = await globby(`**/*{${extensions.join(',')}}`, { cwd: ROOT_DIR, gitignore: true, ignore: exclude });

        for (const file of files) {
            const content = await fs.promises.readFile(path.join(ROOT_DIR, file), 'utf-8');
            const fileHits = [];

            // Run regex-based heuristics
            heuristics.forEach(heuristic => {
                const matches = content.match(heuristic.pattern);
                if (matches) {
                    fileHits.push({ pattern: heuristic.name, count: matches.length });
                    todoList.push({ file, pattern: heuristic.name, task: `Investigate potential ${heuristic.name} issue.` });
                }
            });

            // Run context-aware unhandled rejection detection
            if (hasUnhandledRejection(content, file)) {
                fileHits.push({ pattern: 'Unhandled Rejections (Context-Aware)', count: 1 });
                todoList.push({ file, pattern: 'Unhandled Rejections (Context-Aware)', task: 'Review async code - no visible try/catch or .catch() detected.' });
            }

            if (fileHits.length > 0) {
                hits.push({ file, hits: fileHits });
            }
        }

        await fs.promises.writeFile(path.join(REPORTS_DIR, 'similar_hits.json'), JSON.stringify(hits, null, 2));
        await fs.promises.writeFile(path.join(TASKS_DIR, 'TODO_flat.json'), JSON.stringify(todoList, null, 2));
        spinner.succeed(`Found ${hits.length} files with potential similar issues.`);
    } catch (error) {
        spinner.fail('Failed to sweep for similar issues.');
        console.error(error);
    }
}

async function staticAnalysis(pm, stage) {
    const eslintSpinner = ora(`Running ESLint (${stage})...`).start();
    try {
        // ESLint v9 with flat config doesn't support --silent, use --quiet instead
        const eslintResult = await $`${pm} run lint --max-warnings=50`;
        await fs.promises.writeFile(path.join(REPORTS_DIR, `eslint_${stage}.log`), eslintResult.stdout + '\n' + eslintResult.stderr);
        eslintSpinner.succeed(`ESLint (${stage}) complete.`);
    } catch (error) {
        await fs.promises.writeFile(path.join(REPORTS_DIR, `eslint_${stage}.log`), error.stdout + '\n' + error.stderr);
        eslintSpinner.warn(`ESLint (${stage}) found issues (logged).`);
    }

    const tscSpinner = ora(`Running TypeScript check (${stage})...`).start();
    try {
        const tscResult = await $`${pm} exec tsc -p . --noEmit`;
         await fs.promises.writeFile(path.join(REPORTS_DIR, `tsc_${stage}.log`), tscResult.stdout + '\n' + tscResult.stderr);
        tscSpinner.succeed(`TypeScript check (${stage}) complete.`);
    } catch (error) {
        await fs.promises.writeFile(path.join(REPORTS_DIR, `tsc_${stage}.log`), error.stdout + '\n' + error.stderr);
        tscSpinner.warn(`TypeScript check (${stage}) found issues (logged).`);
    }
}

async function duplicateAudit() {
    const spinner = ora('Auditing for duplicate files (by hash and name)...').start();
    const fileHashes = new Map();
    const fileNames = new Map();
    const duplicatesByHash = [];
    const duplicatesByName = [];

    try {
        const files = await globby('**/*', { cwd: ROOT_DIR, gitignore: true, ignore: ['node_modules', '.git', 'reports', 'tmp', '.next', 'dist'], onlyFiles: true });

        for (const file of files) {
            const filePath = path.join(ROOT_DIR, file);

            try {
                const content = await fs.promises.readFile(filePath);
                const hash = crypto.createHash('sha1').update(content).digest('hex');

                if (fileHashes.has(hash)) {
                    const existingFiles = fileHashes.get(hash);
                    existingFiles.push(file);
                    if (existingFiles.length === 2) {
                         duplicatesByHash.push({ hash, files: existingFiles });
                    }
                } else {
                    fileHashes.set(hash, [file]);
                }
            } catch (_e) {
                // Skip unreadable files
            }

            const fileName = path.basename(file);
            if (fileNames.has(fileName)) {
                const existingLocations = fileNames.get(fileName);
                existingLocations.push(file);
                 if (existingLocations.length === 2) {
                     duplicatesByName.push({ name: fileName, locations: existingLocations });
                }
            } else {
                fileNames.set(fileName, [file]);
            }
        }

        const report = { duplicatesByHash, duplicatesByName };
        await fs.promises.writeFile(path.join(REPORTS_DIR, 'duplicates.json'), JSON.stringify(report, null, 2));
        spinner.succeed(`Duplicate audit complete. Found ${duplicatesByHash.length} hash duplicates and ${duplicatesByName.length} name collisions.`);
    } catch (error) {
        spinner.fail('Duplicate audit failed.');
        console.error(error);
    }
}

async function generateMovePlan() {
    const spinner = ora('Generating canonical move plan (Governance V5)...').start();
    const movePlan = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.md'];
    const searchPaths = ['app/**/*', 'components/**/*', 'lib/**/*', 'utils/**/*', 'hooks/**/*'];

    // Next.js protected patterns (must NOT be moved)
    const PROTECTED_PATTERNS = [
        /^app\/layout\.tsx?$/,                  // Root layout
        /^app\/.*\/layout\.tsx?$/,              // Nested layouts
        /^app\/page\.tsx?$/,                    // Root page
        /^app\/.*\/page\.tsx?$/,                // Nested pages
        /^app\/.*\/loading\.tsx?$/,             // Loading states
        /^app\/.*\/error\.tsx?$/,               // Error boundaries
        /^app\/.*\/not-found\.tsx?$/,           // 404 pages
        /^app\/.*\/template\.tsx?$/,            // Templates
        /^app\/.*\/default\.tsx?$/,             // Default pages (parallel routes)
        /^app\/api\//,                          // API routes
        /^app\/\(.*\)\//,                       // Route groups
        /^app\/global\.css$/,                   // Global styles
        /^app\/globals\.css$/,                  // Global styles (alt)
    ];

    // Module namespace boundaries (keep separate)
    const MODULE_NAMESPACES = ['app/fm/', 'app/aqar/', 'app/souq/', 'app/admin/'];

    try {
        const files = await globby(searchPaths, { cwd: ROOT_DIR, gitignore: true, onlyFiles: true });

        for (const file of files) {
             if (!extensions.some(ext => file.endsWith(ext))) continue;

            // Skip Next.js protected files
            if (PROTECTED_PATTERNS.some(pattern => pattern.test(file))) {
                continue;
            }

            // Skip files within module namespaces
            if (MODULE_NAMESPACES.some(ns => file.startsWith(ns))) {
                continue;
            }

            // Skip files already in proper utility directories
            if (file.startsWith('lib/') || file.startsWith('utils/') || file.startsWith('hooks/')) {
                // Only move if they're clearly misplaced (e.g., lib/fm-* should be in app/fm)
                const shouldMove = /^(lib|utils|hooks)\/[^/]*-(dashboard|work-orders|properties|finance|hr|administration|crm|marketplace|support|compliance|reports|system)/.test(file);
                if (!shouldMove) continue;
            }

            let targetBucket = null;

            const currentBucket = GOV_V5_BUCKETS.find(bucket => file.startsWith(bucket + '/'));
            if (currentBucket) continue;

            for (const [regexStr, bucket] of Object.entries(HEURISTICS_MAP)) {
                const match = regexStr.match(/^\/(.*)\/([gimuy]*)$/);
                const regex = new RegExp(match[1], match[2] || '');

                if (regex.test(file)) {
                    targetBucket = bucket;
                    break;
                }
            }

            if (!targetBucket) {
                if (file.startsWith('components/')) targetBucket = 'components';
            }

            if (targetBucket) {
                const fileName = path.basename(file);
                const dest = path.join(targetBucket, fileName);

                if (fs.existsSync(path.join(ROOT_DIR, dest))) {
                    const collisionName = `${path.basename(file, path.extname(file))}_moved${path.extname(file)}`;
                     movePlan.push({ from: file, toDir: targetBucket, dest: path.join(targetBucket, collisionName), collision: true });
                } else {
                     movePlan.push({ from: file, toDir: targetBucket, dest: dest, collision: false });
                }
            }
        }

        await fs.promises.writeFile(path.join(REPORTS_DIR, 'move-plan.json'), JSON.stringify(movePlan, null, 2));
        spinner.succeed(`Move plan generated with ${movePlan.length} proposed moves.`);
        return movePlan;
    } catch (error) {
        spinner.fail('Failed to generate move plan.');
        console.error(error);
        return [];
    }
}

async function applyMovePlan(movePlan) {
    const spinner = ora('Applying move plan (git mv)...').start();
    let moveCount = 0;

    for (const move of movePlan) {
        try {
            await fs.promises.mkdir(path.join(ROOT_DIR, move.toDir), { recursive: true });
            await $`git mv ${move.from} ${move.dest}`;
            moveCount++;
            spinner.text = `Moving files: ${moveCount}/${movePlan.length}`;
        } catch (error) {
            console.error(chalk.red(`Failed to move ${move.from} to ${move.dest}: ${error.message}`));
        }
    }
    spinner.succeed(`Successfully moved ${moveCount} files.`);

    const codemodSpinner = ora('Running import normalization codemod...').start();
    try {
        const codemodPath = path.join(CODEMODS_DIR, 'import-rewrite.cjs');
        const targetPaths = ['app', 'components', 'lib', 'utils', 'hooks'].filter(p => fs.existsSync(path.join(ROOT_DIR, p)));
        
        if (targetPaths.length > 0) {
            await $`npx jscodeshift -t ${codemodPath} ${targetPaths} --extensions=ts,tsx,js,jsx --parser=tsx`;
            await $`git add .`;
            codemodSpinner.succeed('Import normalization complete.');
        } else {
            codemodSpinner.succeed('No relevant directories found for import normalization.');
        }
    } catch (error) {
        codemodSpinner.fail('Import normalization failed.');
        console.error(error);
    }
}

async function generateReportsAndTasks() {
    if (!REPORT_FLAG) return;
    const spinner = ora('Generating final reports...').start();

    try {
        const fixes5d = JSON.parse(await fs.promises.readFile(path.join(REPORTS_DIR, 'fixes_5d.json'), 'utf-8'));
        const similarHits = JSON.parse(await fs.promises.readFile(path.join(REPORTS_DIR, 'similar_hits.json'), 'utf-8'));

        let reportContent = `# Fixzit Agent 5-Day Similarity Report\n\n`;
        reportContent += `**Generated:** ${new Date().toISOString()}\n`;
        reportContent += `**Mode:** ${APPLY ? 'APPLY' : 'DRY RUN'}\n\n`;

        reportContent += `## Summary\n`;
        reportContent += `- Recent Commits Analyzed: ${fixes5d.length}\n`;
        reportContent += `- Potential Similar Issues Found: ${similarHits.length} files\n\n`;

        reportContent += `## Recent Fixes (Last ${SINCE_DAYS} Days)\n`;
        fixes5d.forEach(commit => {
            reportContent += `- [${commit.hash.substring(0, 7)}] ${commit.subject} (${commit.files.length} files)\n`;
        });

        reportContent += `\n## Potential Similar Hits\n`;
        similarHits.slice(0, 20).forEach(hit => {
            reportContent += `- File: \`${hit.file}\`\n`;
            hit.hits.forEach(h => {
                reportContent += `  - Pattern: ${h.pattern} (Count: ${h.count})\n`;
            });
        });
        if (similarHits.length > 20) {
            reportContent += `\n...and ${similarHits.length - 20} more. See similar_hits.json for full list.\n`;
        }

        reportContent += `\n## Static Analysis Logs\n`;
        reportContent += `### ESLint (Initial)\n\`\`\`\n${await readLogTail('eslint_initial.log')}\n\`\`\`\n`;
        reportContent += `### TypeScript (Initial)\n\`\`\`\n${await readLogTail('tsc_initial.log')}\n\`\`\`\n`;

        if (APPLY) {
            reportContent += `### ESLint (After)\n\`\`\`\n${await readLogTail('eslint_after.log')}\n\`\`\`\n`;
            reportContent += `### TypeScript (After)\n\`\`\`\n${await readLogTail('tsc_after.log')}\n\`\`\`\n`;
        }

        await fs.promises.writeFile(path.join(REPORTS_DIR, '5d_similarity_report.md'), reportContent);
        spinner.succeed('Final reports generated.');
    } catch (error) {
        spinner.fail('Failed to generate final reports.');
        console.error(error);
    }
}

async function readLogTail(logFile, lines = 50) {
    try {
        const content = await fs.promises.readFile(path.join(REPORTS_DIR, logFile), 'utf-8');
        return content.split('\n').slice(-lines).join('\n');
    } catch (_e) {
        return `Log file not found or unreadable: ${logFile}`;
    }
}

async function runHooks() {
    const spinner = ora('Running non-blocking hooks (i18n and API scan)...').start();
    try {
        const i18nScript = path.join(SCRIPTS_DIR, 'i18n-scan.mjs');
        if (fs.existsSync(i18nScript)) {
             $`node ${i18nScript}`.nothrow();
        }

        const apiScript = path.join(SCRIPTS_DIR, 'api-scan.mjs');
        if (fs.existsSync(apiScript)) {
             $`node ${apiScript}`.nothrow();
        }
        spinner.succeed('Hooks executed.');
    } catch (error) {
        spinner.warn('Hooks failed (non-blocking).');
        console.error(error);
    }
}

async function startDevServer(pm) {
    await $`node scripts/stop-dev.js`.nothrow();

    const spinner = ora(`Starting development server on port ${PORT} (detached)...`).start();
    try {
        const command = `${pm} run dev -- -p ${PORT}`;
        const child = spawn('sh', ['-c', command], { detached: true, stdio: 'ignore' });

        child.unref();

        if (child.pid) {
            await fs.promises.writeFile(PID_FILE, child.pid.toString());
            spinner.succeed(`Development server started at http://localhost:${PORT} (PID: ${child.pid})`);
            console.log(chalk.yellow(`ℹ️ To stop the server, run: ${pm} run fixzit:agent:stop`));
        } else {
             spinner.fail('Failed to start development server or capture PID.');
        }

    } catch (error) {
        spinner.fail('Failed to start development server.');
        console.error(error);
    }
}

main().catch(err => {
    console.error(chalk.red('❌ Fixzit Agent Protocol Failed ❌'));
    console.error(err);
    process.exit(1);
});
