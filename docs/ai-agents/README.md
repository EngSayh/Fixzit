# AI Agents Documentation

This directory contains standardized instructions and guidelines for AI-assisted development workflows in the Fixzit project.

## Available Documentation

### [Multi-Agent PR Review Instructions](./multi-agent-review-instructions.md)

**Purpose**: Comprehensive template for coordinating multiple AI code review agents (@codex, @CodeRabbit, @copilot, @gemini-code-assist, @qodo-merge-pro) to ensure zero-error, zero-warning delivery.

**When to Use**:
- Complex PRs touching multiple system modules (FM, Souq, HR, CRM, Finance)
- PRs requiring comprehensive quality gate validation
- When you need consistent review across multiple AI agents
- Critical PRs requiring 100% coverage of: i18n/RTL, OpenAPI contracts, RBAC, accessibility, performance

**How to Use**:
1. Open the PR requiring comprehensive review
2. Copy the template from `multi-agent-review-instructions.md`
3. Paste as a PR comment
4. All mentioned agents will respond with coordinated, system-aware reviews

**Key Features**:
- ✅ Zero-tolerance quality gates (EN/AR translations, OpenAPI sync, MongoDB security, RBAC)
- ✅ Mandatory missed-comments inventory
- ✅ BEFORE→AFTER→DIFF format for all fixes
- ✅ Self-scoring mechanism (100/100 only when all gates green)
- ✅ Ready-to-apply diffs and command matrices
- ✅ Comprehensive system awareness (all Fixzit modules)

---

## Quick Reference

**Source**: Extracted from [PR #323](https://github.com/EngSayh/Fixzit/pull/323)  
**Created**: 2025-11-24  
**Maintained By**: Engineering Team
