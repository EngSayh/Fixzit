#!/usr/bin/env node
/**
 * Analyze PR comments across all closed and merged PRs
 * - Requires GitHub CLI (gh) authenticated
 * - Outputs:
 *   - reports/pr-comment-errors.json
 *   - reports/PR_COMMENT_ERRORS_REPORT.md
 */

const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

function runGh(args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile('gh', ['api', ...args], { maxBuffer: 1024 * 1024 * 64, ...options }, (err, stdout, stderr) => {
      if (err) {
        const error = new Error(`gh api failed: ${err.message}\nSTDERR: ${stderr}`);
        error.code = err.code;
        return reject(error);
      }
      resolve(stdout);
    });
  });
}

async function getRepoNameWithOwner() {
  return new Promise((resolve, reject) => {
    execFile('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'], { maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(`Failed to get repo: ${stderr || err.message}`));
      }
      resolve(stdout.trim());
    });
  });
}

async function fetchClosedPrs(owner, repo) {
  // Paginate manually to keep JSON parse straightforward
  const perPage = 100;
  let page = 1;
  const prs = [];

  while (true) {
    const endpoint = `/repos/${owner}/${repo}/pulls?state=closed&per_page=${perPage}&page=${page}`;
    const out = await runGh([endpoint]);
    let batch;
    try {
      batch = JSON.parse(out);
    } catch (e) {
      throw new Error(`Failed to parse PRs page ${page}: ${e.message}`);
    }
    if (!Array.isArray(batch) || batch.length === 0) break;
    prs.push(...batch.map(p => ({
      number: p.number,
      state: p.state,
      merged_at: p.merged_at,
      title: p.title,
      html_url: p.html_url,
      user: p.user?.login || null,
      created_at: p.created_at,
      closed_at: p.closed_at
    })));
    if (batch.length < perPage) break;
    page += 1;
    await sleep(200); // gentle pacing
  }
  return prs;
}

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function fetchIssueComments(owner, repo, prNumber) {
  const endpoint = `/repos/${owner}/${repo}/issues/${prNumber}/comments?per_page=100`;
  const out = await runGh([endpoint, '--paginate']);
  // When using --paginate, gh concatenates arrays; we can flatten by splitting into chunks and merging
  // Safer approach: use --jq '.[] | @json' to get NDJSON, then parse lines
  // However gojq is built-in; use --jq for robustness
  return fetchNdjson(`/repos/${owner}/${repo}/issues/${prNumber}/comments`, { per_page: 100 });
}

async function fetchReviewComments(owner, repo, prNumber) {
  return fetchNdjson(`/repos/${owner}/${repo}/pulls/${prNumber}/comments`, { per_page: 100 });
}

async function fetchReviews(owner, repo, prNumber) {
  return fetchNdjson(`/repos/${owner}/${repo}/pulls/${prNumber}/reviews`, { per_page: 100 });
}

async function fetchNdjson(endpoint, query = {}) {
  const queryArgs = Object.entries(query).flatMap(([k, v]) => ['--field', `${k}=${v}`]);
  const args = [endpoint, '--paginate', '--jq', '.[] | @json', ...queryArgs];
  const out = await runGh(args);
  const lines = out.split('\n').map(l => l.trim()).filter(Boolean);
  const items = [];
  for (const line of lines) {
    try { items.push(JSON.parse(line)); } catch (_) {
      // skip malformed line
    }
  }
  return items;
}

function buildCategoryMatchers() {
  // Each category has patterns; matching is case-insensitive
  const rx = (s) => new RegExp(s, 'i');
  return [
    { key: 'build_ci', label: 'Build/CI', patterns: [
      rx('\\b(build|ci|pipeline|workflow|actions|check(?:s)?)\\b.*\\b(fail|failed|failure|failing|error|exit code|status 1)\\b'),
      rx('workflow run|github actions|lint job failed')
    ]},
    { key: 'lint_ts', label: 'Lint/TypeScript', patterns: [
      rx('eslint|tsc|typescript|prettier|no-unused-vars|any-type'),
      rx('TS[0-9]{3,5}'),
      rx('type\u0020error|type\u002dmismatch')
    ]},
    { key: 'runtime_exception', label: 'Runtime/Exception', patterns: [
      rx('exception|\u005cberror:|stack\s*trace|TypeError|ReferenceError|SyntaxError|RangeError'),
      rx('\\b(cannot|can\'t)\\b.*\\b(read|set|call|find|access)\\b'),
      rx('undefined|null\s*reference')
    ]},
    { key: 'tests', label: 'Tests', patterns: [
      rx('tests? failed|failing tests|jest|vitest|mocha|assert(?:ion)?\s*failed|snapshot\s*failed')
    ]},
    { key: 'api_http', label: 'API/HTTP', patterns: [
      rx('\\b(4[0-9]{2}|5[0-9]{2})\\b'),
      rx('unauthorized|forbidden|not\s*found|bad\s*request|timeout|network\s*error'),
      rx('http|axios|fetch|response|request')
    ]},
    { key: 'merge_conflict', label: 'Merge Conflicts', patterns: [
      rx('merge\s*conflict|resolve\s*conflicts|cannot\s*merge|rebase\s*required')
    ]},
    { key: 'infrastructure', label: 'Infrastructure/Deploy', patterns: [
      rx('docker|kubernetes|k8s|helm|ingress|nginx|aws|gcp|azure|secrets?\s*|env(\s|\_|-)var'),
      rx('database|mongo(db)?|postgres(sql)?|mysql|redis|rabbitmq|queue|s3')
    ]},
    { key: 'security', label: 'Security', patterns: [
      rx('vuln|xss|csrf|sqli|injection|auth(entication|orization)?|rate\s*limit|secrets?\s*exposed')
    ]},
    { key: 'performance', label: 'Performance', patterns: [
      rx('slow|performance|optimi[sz]e|memory\s*leak|cpu|latency|throughput')
    ]},
  ];
}

function classifyText(text, matchers) {
  if (!text) return null;
  const t = String(text);
  const lower = t.toLowerCase();
  const likelyError = /\berror\b|\bexception\b|\bfail(ed|ure)?\b|\bbug\b|\bissue\b|\bproblem\b/i.test(t);
  let matchedCategory = null;
  for (const m of matchers) {
    if (m.patterns.some(p => p.test(t) || p.test(lower))) {
      matchedCategory = m.key;
      break;
    }
  }
  if (!matchedCategory && !likelyError) return null; // not error-related
  return matchedCategory || 'other_error';
}

function ensureReportsDir() {
  const reportsDir = path.resolve(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  return reportsDir;
}

function limitConcurrency(limit) {
  const queue = [];
  let active = 0;
  const next = () => {
    if (active >= limit || queue.length === 0) return;
    const { fn, resolve, reject } = queue.shift();
    active++;
    Promise.resolve()
      .then(fn)
      .then((res) => { active--; resolve(res); next(); })
      .catch((err) => { active--; reject(err); next(); });
  };
  return (fn) => new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    next();
  });
}

async function main() {
  const startTs = Date.now();
  const nameWithOwner = await getRepoNameWithOwner();
  const [owner, repo] = nameWithOwner.split('/');

  console.log(`Repo: ${owner}/${repo}`);
  console.log('Fetching closed PRs...');
  const prs = await fetchClosedPrs(owner, repo);
  console.log(`Total closed PRs: ${prs.length}`);

  const mergedPrs = prs.filter(p => !!p.merged_at);
  const closedOnlyPrs = prs.filter(p => !p.merged_at);
  console.log(`- merged: ${mergedPrs.length}`);
  console.log(`- closed (not merged): ${closedOnlyPrs.length}`);

  const matchers = buildCategoryMatchers();
  const limit = limitConcurrency(5);

  const perPrResults = [];

  const fetchOnePr = async (pr) => {
    const [issueComments, reviewComments, reviews] = await Promise.all([
      fetchIssueComments(owner, repo, pr.number),
      fetchReviewComments(owner, repo, pr.number),
      fetchReviews(owner, repo, pr.number)
    ]);

    const comments = [];

    for (const c of issueComments) {
      comments.push({
        type: 'issue_comment',
        id: c.id,
        body: c.body || '',
        user: c.user?.login || null,
        created_at: c.created_at,
        html_url: c.html_url || c?.url || null
      });
    }
    for (const c of reviewComments) {
      comments.push({
        type: 'review_comment',
        id: c.id,
        body: c.body || '',
        user: c.user?.login || null,
        created_at: c.created_at,
        html_url: c.html_url || c?.url || null
      });
    }
    for (const r of reviews) {
      comments.push({
        type: 'review',
        id: r.id,
        body: r.body || '',
        user: r.user?.login || null,
        state: r.state,
        submitted_at: r.submitted_at,
        html_url: r.html_url || r?.url || null
      });
    }

    const catCounts = {};
    const errorSamples = [];
    let errorCount = 0;

    for (const c of comments) {
      const category = classifyText(c.body, matchers);
      if (!category) continue;
      errorCount += 1;
      catCounts[category] = (catCounts[category] || 0) + 1;
      if (errorSamples.length < 10) {
        errorSamples.push({
          category,
          type: c.type,
          user: c.user,
          bodySnippet: (c.body || '').slice(0, 300),
          url: c.html_url || null,
          created_at: c.created_at || c.submitted_at || null
        });
      }
    }

    return {
      pr_number: pr.number,
      title: pr.title,
      state: pr.state,
      merged: !!pr.merged_at,
      created_at: pr.created_at,
      closed_at: pr.closed_at,
      url: pr.html_url,
      author: pr.user,
      total_comments_checked: comments.length,
      error_comments: errorCount,
      categories: catCounts,
      samples: errorSamples
    };
  };

  const tasks = prs.map(pr => limit(() => fetchOnePr(pr).catch(err => ({
    pr_number: pr.number,
    title: pr.title,
    state: pr.state,
    merged: !!pr.merged_at,
    error: true,
    error_message: String(err && err.message || err)
  }))));

  const results = await Promise.all(tasks);

  // Aggregate summary
  const summary = {
    repo: `${owner}/${repo}`,
    generated_at: new Date().toISOString(),
    totals: {
      prs_closed: prs.length,
      prs_merged: mergedPrs.length,
      prs_closed_only: closedOnlyPrs.length
    },
    category_counts: {},
    top_prs_by_error_comments: [],
  };

  for (const r of results) {
    if (r && !r.error && r.categories) {
      for (const [k, v] of Object.entries(r.categories)) {
        summary.category_counts[k] = (summary.category_counts[k] || 0) + v;
      }
    }
  }

  const sortedByErrors = results
    .filter(r => r && !r.error)
    .sort((a, b) => (b.error_comments || 0) - (a.error_comments || 0));

  summary.top_prs_by_error_comments = sortedByErrors.slice(0, 20).map(r => ({
    pr_number: r.pr_number,
    url: r.url,
    title: r.title,
    merged: r.merged,
    error_comments: r.error_comments,
  }));

  const reportsDir = ensureReportsDir();
  const jsonPath = path.join(reportsDir, 'pr-comment-errors.json');
  const mdPath = path.join(reportsDir, 'PR_COMMENT_ERRORS_REPORT.md');

  const output = { summary, results };
  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2), 'utf8');

  // Markdown report
  const md = [];
  md.push(`# PR Comment Errors Report`);
  md.push('');
  md.push(`Repo: ${summary.repo}`);
  md.push(`Generated: ${summary.generated_at}`);
  md.push('');
  md.push('## Totals');
  md.push(`- Closed PRs: ${summary.totals.prs_closed}`);
  md.push(`- Merged PRs: ${summary.totals.prs_merged}`);
  md.push(`- Closed (not merged): ${summary.totals.prs_closed_only}`);
  md.push('');
  md.push('## Category Counts');
  const prettyLabel = (key) => ({
    build_ci: 'Build/CI', lint_ts: 'Lint/TypeScript', runtime_exception: 'Runtime/Exception', tests: 'Tests', api_http: 'API/HTTP', merge_conflict: 'Merge Conflicts', infrastructure: 'Infrastructure/Deploy', security: 'Security', performance: 'Performance', other_error: 'Other'
  })[key] || key;
  const entries = Object.entries(summary.category_counts).sort((a,b) => b[1]-a[1]);
  if (entries.length === 0) {
    md.push('- No error-related comments detected.');
  } else {
    for (const [k,v] of entries) md.push(`- ${prettyLabel(k)}: ${v}`);
  }
  md.push('');
  md.push('## Top PRs by Error-Related Comments');
  if (summary.top_prs_by_error_comments.length === 0) {
    md.push('- None');
  } else {
    for (const p of summary.top_prs_by_error_comments) {
      md.push(`- #${p.pr_number} (${p.merged ? 'merged' : 'closed'}): ${p.error_comments} — ${p.title} \n  ${p.url}`);
    }
  }
  md.push('');
  md.push('## Samples');
  const sampleFrom = sortedByErrors.slice(0, 5);
  for (const pr of sampleFrom) {
    md.push(`### PR #${pr.pr_number} — ${pr.title}`);
    md.push(`${pr.url}`);
    if (!pr.samples || pr.samples.length === 0) { md.push('- No samples'); md.push(''); continue; }
    for (const s of pr.samples) {
      md.push(`- [${prettyLabel(s.category)}] ${s.user ? '@'+s.user+': ' : ''}${s.bodySnippet.replace(/\n/g, ' ')}`);
      if (s.url) md.push(`  ${s.url}`);
    }
    md.push('');
  }

  fs.writeFileSync(mdPath, md.join('\n'), 'utf8');

  const durationSec = ((Date.now() - startTs) / 1000).toFixed(1);
  console.log(`\n✅ Reports written:`);
  console.log(`- ${jsonPath}`);
  console.log(`- ${mdPath}`);
  console.log(`Took ${durationSec}s`);
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
