#!/usr/bin/env python3
import json
import re
import subprocess
import sys
from typing import Dict, List, Tuple, Any


def run_json(cmd: List[str]) -> Any:
    """Run a shell command and parse stdout as JSON."""
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    except FileNotFoundError:
        raise RuntimeError(f"Command not found: {cmd[0]}")
    if res.returncode != 0:
        raise RuntimeError(res.stderr.strip() or f"Command failed: {' '.join(cmd)}")
    try:
        return json.loads(res.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid JSON from command: {' '.join(cmd)}\n{res.stdout[:4000]}") from exc


def run_text(cmd: List[str]) -> str:
    """Run a shell command and return stdout as text."""
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    except FileNotFoundError:
        raise RuntimeError(f"Command not found: {cmd[0]}")
    if res.returncode != 0:
        raise RuntimeError(res.stderr.strip() or f"Command failed: {' '.join(cmd)}")
    return res.stdout


def detect_categories(body: str, compiled: List[Tuple[str, re.Pattern]]) -> List[str]:
    matched: List[str] = []
    for name, pat in compiled:
        if pat.search(body):
            matched.append(name)
    return matched or ["uncategorized"]


def main() -> int:
    # Ensure gh works and figure out repo
    try:
        name_with_owner = run_json(["gh", "repo", "view", "--json", "nameWithOwner"]).get("nameWithOwner")
    except Exception as e:
        print(json.dumps({
            "error": "gh CLI not configured or repository not accessible",
            "details": str(e)
        }))
        return 0

    owner, repo = name_with_owner.split("/", 1)

    # Fetch up to 1000 PRs of any state
    try:
        prs = run_json(["gh", "pr", "list", "--state", "all", "--limit", "1000", "--json", "number,state,mergedAt,closedAt,url,title"])  # type: ignore[assignment]
    except Exception as e:
        print(json.dumps({"error": "Failed to list PRs", "details": str(e)}))
        return 0

    # Filter closed or merged
    closed_or_merged = [p for p in prs if p.get("state") in ("MERGED", "CLOSED")]

    # Error hint patterns
    error_hint = re.compile(r"\b(error|exception|fail(?:ed|ure)?|bug|broken|crash|panic|segfault|leak|vuln\w*|xss|csrf|ssrf|timeout|null\s*pointer|npe|undefined|stack\s*trace)\b", re.IGNORECASE)

    category_patterns: List[Tuple[str, re.Pattern]] = [
        ("security", re.compile(r"\b(xss|csrf|ssrf|sqli|injection|rce|vuln\w*|security|secrets?|credentials?|token\s*leak|secret\s*expos\w*)\b", re.I)),
        ("performance", re.compile(r"\b(perf|performance|slow|latency|optimi[sz]e|memory\s*leak|leak|allocat\w+|gc|hot\s*path|throughput)\b", re.I)),
        ("build", re.compile(r"\b(build|compile|compiler|linker|tsc|webpack|vite|babel|cmake|make|gradle|maven|cargo\s*build|yarn\s*build|npm\s*run\s*build|gcc|clang)\b", re.I)),
        ("test", re.compile(r"\b(test|tests|unit\s*test|integration\s*test|e2e|jest|pytest|flak\w+|failing\s*test)\b", re.I)),
        ("lint/style", re.compile(r"\b(lint|eslint|prettier|stylelint|pep8|formatter|formatting)\b", re.I)),
        ("types", re.compile(r"\b(typescript|type\s*error|typing|mypy|tsc|implicit\s*any|property\s+.*\s+does\s+not\s+exist|assignable\s+to|type\s+mismatch)\b", re.I)),
        ("runtime", re.compile(r"\b(exception|crash|panic|segfault|sigsegv|undefined|null\s*pointer|npe|stack\s*trace|500|404|timeout|unhandled|runtime)\b", re.I)),
        ("logic/bug", re.compile(r"\b(bug|incorrect|wrong|off[-\s]?by[-\s]?one|race\s*condition|deadlock|edge\s*case)\b", re.I)),
        ("docs", re.compile(r"\b(doc|docs|documentation|readme|comment)\b", re.I)),
        ("config", re.compile(r"\b(config|configuration|env(?:\s|_)?vars?|environment\s*variable|settings|yaml|yml|json\s*schema)\b", re.I)),
        ("dependencies", re.compile(r"\b(dependenc(?:y|ies)|package\.json|package-lock|requirements\.txt|pip|npm|yarn|pnpm|upgrade|downgrade|version\s*bump|dependabot)\b", re.I)),
        ("ci_cd", re.compile(r"\b(ci|github\s*actions|workflow|pipeline|runner|job\s*failed|status\s*check)\b", re.I)),
    ]

    summary: Dict[str, Any] = {
        "repo": name_with_owner,
        "total_prs_closed_or_merged": len(closed_or_merged),
        "total_prs_processed": 0,
        "total_resolved_threads": 0,
        "total_error_comments": 0,
        "categories": {},
        "samples": {},
    }

    for pr in closed_or_merged:
        pr_number = pr.get("number")
        if not pr_number:
            continue
        page = 1
        while True:
            # Prefer the review-threads endpoint; fall back to plain comments if needed
            try:
                # REST: Pull request review threads
                threads = run_json([
                    "gh", "api", f"repos/{owner}/{repo}/pulls/{pr_number}/review-threads",
                    "-F", f"per_page=100",
                    "-F", f"page={page}",
                ])
            except Exception:
                # Fallback: treat each review comment as a singleton thread (unresolved info unavailable)
                try:
                    comments = run_json([
                        "gh", "api", f"repos/{owner}/{repo}/pulls/{pr_number}/comments",
                        "-F", f"per_page=100",
                        "-F", f"page={page}",
                    ])
                except Exception:
                    break
                if not comments:
                    break
                # Process as unresolved-unknown threads
                for c in comments:
                    body = (c.get("body") or "").strip()
                    if not body or not error_hint.search(body):
                        continue
                    cats = detect_categories(body, category_patterns)
                    summary["total_error_comments"] += 1
                    for cat in cats:
                        summary["categories"][cat] = summary["categories"].get(cat, 0) + 1
                        store = summary["samples"].setdefault(cat, [])
                        if len(store) < 5:
                            excerpt = re.sub(r"\s+", " ", body)[:200]
                            store.append({
                                "pr": pr_number,
                                "pr_url": pr.get("url"),
                                "comment_url": c.get("html_url"),
                                "author": (c.get("user") or {}).get("login"),
                                "excerpt": excerpt,
                            })
                if len(comments) < 100:
                    break
                page += 1
                continue

            if not threads:
                break

            for thread in threads:
                # 'resolved' or 'is_resolved' depending on API
                is_resolved = bool(thread.get("is_resolved") or thread.get("resolved"))
                if not is_resolved:
                    continue
                summary["total_resolved_threads"] += 1
                comments = thread.get("comments") or []
                for c in comments:
                    body = (c.get("body") or "").strip()
                    if not body or not error_hint.search(body):
                        continue
                    cats = detect_categories(body, category_patterns)
                    summary["total_error_comments"] += 1
                    for cat in cats:
                        summary["categories"][cat] = summary["categories"].get(cat, 0) + 1
                        store = summary["samples"].setdefault(cat, [])
                        if len(store) < 5:
                            excerpt = re.sub(r"\s+", " ", body)[:200]
                            store.append({
                                "pr": pr_number,
                                "pr_url": pr.get("url"),
                                "comment_url": c.get("html_url"),
                                "author": (c.get("user") or {}).get("login"),
                                "excerpt": excerpt,
                            })

            if len(threads) < 100:
                break
            page += 1

        summary["total_prs_processed"] += 1

    # Sort categories by count desc
    summary["categories"] = dict(sorted(summary["categories"].items(), key=lambda kv: kv[1], reverse=True))

    print(json.dumps(summary))
    return 0


if __name__ == "__main__":
    sys.exit(main())
