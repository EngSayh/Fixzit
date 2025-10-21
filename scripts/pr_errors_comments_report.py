#!/usr/bin/env python3
import subprocess
import json
import sys
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def run(cmd: List[str], input_str: Optional[str] = None) -> Tuple[int, str, str]:
    result = subprocess.run(
        cmd,
        input=input_str,
        text=True,
        capture_output=True,
        check=False,
    )
    return result.returncode, result.stdout, result.stderr


def get_repo() -> str:
    code, out, err = run([
        "gh", "repo", "view", "--json", "name,owner", "--jq", ".owner.login+\"/\"+.name",
    ])
    if code != 0:
        print(f"Failed to get repo: {err}", file=sys.stderr)
        sys.exit(1)
    return out.strip()


GRAPHQL_QUERY = r""""""


def fetch_all_prs(owner: str, name: str) -> List[Dict[str, Any]]:
    prs: List[Dict[str, Any]] = []
    page = 1
    while True:
        # Use REST API to avoid GraphQL scope issues
        path = f"repos/{owner}/{name}/pulls?state=all&per_page=100&sort=created&direction=asc&page={page}"
        code, out, err = run(["gh", "api", path])
        if code != 0:
            print(f"Failed to list PRs (page {page}): {err}", file=sys.stderr)
            sys.exit(1)
        batch = json.loads(out)
        if not isinstance(batch, list) or not batch:
            break
        prs.extend(batch)
        if len(batch) < 100:
            break
        page += 1
    return prs


def fetch_reviews_counts(owner: str, name: str, pr_number: int) -> Dict[str, int]:
    code, out, _err = run(["gh", "api", f"repos/{owner}/{name}/pulls/{pr_number}/reviews"])
    if code != 0:
        # Graceful fallback on permission issues
        return {"approved": 0, "changes_requested": 0, "commented": 0, "dismissed": 0}
    reviews = json.loads(out)
    counts = {"APPROVED": 0, "CHANGES_REQUESTED": 0, "COMMENTED": 0, "DISMISSED": 0}
    for r in reviews:
        state = (r.get("state") or "").upper()
        if state in counts:
            counts[state] += 1
    return {
        "approved": counts["APPROVED"],
        "changes_requested": counts["CHANGES_REQUESTED"],
        "commented": counts["COMMENTED"],
        "dismissed": counts["DISMISSED"],
    }


def fetch_ci_summary(owner: str, name: str, sha: Optional[str]) -> Dict[str, Any]:
    result = {
        "total": 0,
        "check_run": {
            "failure": 0,
            "timed_out": 0,
            "cancelled": 0,
            "action_required": 0,
            "neutral": 0,
            "skipped": 0,
            "success": 0,
            "other": 0,
            "failing_runs": [],
        },
        "status_context": {
            "error": 0,
            "failure": 0,
            "pending": 0,
            "success": 0,
            "other": 0,
            "failing_statuses": [],
        },
    }
    if not sha:
        return result

    # Check runs
    code, out, _err = run(["gh", "api", f"repos/{owner}/{name}/commits/{sha}/check-runs"])
    if code == 0:
        data = json.loads(out)
        check_runs = data.get("check_runs", [])
        result["total"] += len(check_runs)
        for cr in check_runs:
            conclusion = (cr.get("conclusion") or "").lower()
            name = cr.get("name")
            url = cr.get("html_url") or cr.get("details_url")
            if conclusion in ("failure", "timed_out", "cancelled", "action_required"):
                result["check_run"][conclusion] += 1
                result["check_run"]["failing_runs"].append({
                    "name": name,
                    "conclusion": conclusion,
                    "url": url,
                })
            elif conclusion in ("neutral", "skipped", "success"):
                result["check_run"][conclusion] += 1
            elif conclusion:
                result["check_run"]["other"] += 1

    # Commit statuses
    code, out, _err = run(["gh", "api", f"repos/{owner}/{name}/commits/{sha}/status"])
    if code == 0:
        data = json.loads(out)
        statuses = data.get("statuses", [])
        result["total"] += len(statuses)
        for st in statuses:
            state = (st.get("state") or "").lower()  # error, failure, pending, success
            context = st.get("context")
            url = st.get("target_url")
            if state in ("error", "failure", "pending"):
                result["status_context"][state] += 1
                if state in ("error", "failure"):
                    result["status_context"]["failing_statuses"].append({
                        "context": context,
                        "state": state,
                        "url": url,
                    })
            elif state == "success":
                result["status_context"]["success"] += 1
            elif state:
                result["status_context"]["other"] += 1

    return result


def classify_ci_contexts(pr: Dict[str, Any]) -> Dict[str, Any]:
    result = {
        "total": 0,
        "check_run": {
            "failure": 0,
            "timed_out": 0,
            "cancelled": 0,
            "action_required": 0,
            "neutral": 0,
            "skipped": 0,
            "success": 0,
            "other": 0,
            "failing_runs": [],  # list of {name, conclusion, url}
        },
        "status_context": {
            "error": 0,
            "failure": 0,
            "pending": 0,
            "success": 0,
            "other": 0,
            "failing_statuses": [],  # list of {context, state, url}
        },
    }
    # This function is no longer used with GraphQL; replaced by REST summary built in fetch_ci_summary
    return result


def build_report(owner: str, name: str, prs: List[Dict[str, Any]]) -> str:
    lines: List[str] = []
    lines.append("# PR Errors and Comments by Category (Oldest → Newest)\n")

    totals = {
        "issue_comments": 0,
        "review_comments": 0,
        "reviews": {
            "approved": 0,
            "changes_requested": 0,
            "commented": 0,
            "dismissed": 0,
        },
        "ci": {
            "check_run": {"failure": 0, "timed_out": 0, "cancelled": 0, "action_required": 0},
            "status_context": {"error": 0, "failure": 0},
        },
    }

    for pr in prs:
        num = pr.get("number")
        title = pr.get("title")
        url = pr.get("html_url")
        state = pr.get("state")  # open/closed
        is_draft = pr.get("draft")
        created_at = pr.get("created_at")
        closed_at = pr.get("closed_at")
        merged_at = pr.get("merged_at")
        user = pr.get("user") or {}
        author = user.get("login")

        issue_comments = pr.get("comments", 0)
        review_comments = pr.get("review_comments", 0)

        reviews_counts = fetch_reviews_counts(owner, name, num)

        head = pr.get("head") or {}
        sha = (head.get("sha") or "").strip()
        ci_summary = fetch_ci_summary(owner, name, sha)

        # Update totals
        totals["issue_comments"] += issue_comments
        totals["review_comments"] += review_comments
        totals["reviews"]["approved"] += reviews_counts["approved"]
        totals["reviews"]["changes_requested"] += reviews_counts["changes_requested"]
        totals["reviews"]["commented"] += reviews_counts["commented"]
        totals["reviews"]["dismissed"] += reviews_counts["dismissed"]
        totals["ci"]["check_run"]["failure"] += ci_summary["check_run"]["failure"]
        totals["ci"]["check_run"]["timed_out"] += ci_summary["check_run"]["timed_out"]
        totals["ci"]["check_run"]["cancelled"] += ci_summary["check_run"]["cancelled"]
        totals["ci"]["check_run"]["action_required"] += ci_summary["check_run"]["action_required"]
        totals["ci"]["status_context"]["error"] += ci_summary["status_context"]["error"]
        totals["ci"]["status_context"]["failure"] += ci_summary["status_context"]["failure"]

        # PR header
        state_label = state
        if is_draft:
            state_label = f"{state} (draft)"
        
        lines.append(f"## PR #{num}: {title}")
        lines.append("")
        lines.append(f"- URL: <{url}>")
        lines.append(f"- State: {state_label} | Author: {author} | Created: {created_at}")
        if merged_at:
            lines.append(f"- Merged at: {merged_at}")
        elif closed_at:
            lines.append(f"- Closed at: {closed_at}")

        # Comments summary
        lines.append("- Comments:")
        lines.append(f"  - Issue comments: {issue_comments}")
        lines.append(f"  - Review comments: {review_comments}")

        # Reviews summary
        lines.append("- Review decisions:")
        lines.append(f"  - Approved: {reviews_counts['approved']}")
        lines.append(f"  - Changes requested: {reviews_counts['changes_requested']}")
        lines.append(f"  - Commented: {reviews_counts['commented']}")
        lines.append(f"  - Dismissed: {reviews_counts['dismissed']}")

        # CI summary
        cr = ci_summary["check_run"]
        sc = ci_summary["status_context"]
        lines.append("- CI:")
        lines.append(f"  - Check runs failing: failure={cr['failure']}, timed_out={cr['timed_out']}, cancelled={cr['cancelled']}, action_required={cr['action_required']}")
        lines.append(f"  - Status contexts failing: error={sc['error']}, failure={sc['failure']}")
        if cr["failing_runs"]:
            lines.append("  - Failing check runs:")
            for fr in cr["failing_runs"]:
                name = fr.get("name")
                conc = fr.get("conclusion")
                url_f = fr.get("url")
                lines.append(f"    - {name}: {conc} ({url_f})")
        if sc["failing_statuses"]:
            lines.append("  - Failing statuses:")
            for fs in sc["failing_statuses"]:
                ctx = fs.get("context")
                st = fs.get("state")
                url_s = fs.get("url")
                lines.append(f"    - {ctx}: {st} ({url_s})")

        lines.append("")

    # Totals section
    lines.append("# Totals across all PRs")
    lines.append(f"- Issue comments: {totals['issue_comments']}")
    lines.append(f"- Review comments: {totals['review_comments']}")
    lines.append("- Reviews:")
    lines.append(f"  - Approved: {totals['reviews']['approved']}")
    lines.append(f"  - Changes requested: {totals['reviews']['changes_requested']}")
    lines.append(f"  - Commented: {totals['reviews']['commented']}")
    lines.append(f"  - Dismissed: {totals['reviews']['dismissed']}")
    lines.append("- CI failing counts:")
    lines.append(f"  - Check runs: failure={totals['ci']['check_run']['failure']}, timed_out={totals['ci']['check_run']['timed_out']}, cancelled={totals['ci']['check_run']['cancelled']}, action_required={totals['ci']['check_run']['action_required']}")
    lines.append(f"  - Status contexts: error={totals['ci']['status_context']['error']}, failure={totals['ci']['status_context']['failure']}")

    return "\n".join(lines) + "\n"


def main() -> None:
    repo = get_repo()
    owner, name = repo.split("/", 1)
    prs = fetch_all_prs(owner, name)
    # Build and write report
    report = build_report(owner, name, prs)
    
    # Use environment variable or default to current directory
    output_dir = Path(os.getenv("OUTPUT_DIR", "."))
    output_dir.mkdir(parents=True, exist_ok=True)
    
    out_path = output_dir / "PR_ERRORS_COMMENTS_REPORT.md"
    json_path = output_dir / "PR_ERRORS_COMMENTS_SUMMARY.json"
    
    try:
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(report)
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(prs, f, ensure_ascii=False, indent=2)
    except IOError as e:
        print(f"Failed to write output files: {e}", file=sys.stderr)
        sys.exit(1)
    
    print(str(out_path))


if __name__ == "__main__":
    main()
