# VS Code Agent Mode Setup - No Confirmation Prompts

## Overview

This document describes the VS Code Copilot Agent Mode configuration implemented in Fixzit to eliminate confirmation prompts while maintaining PR-based workflow and branch protection.

## Configuration Files

### 1. Workspace Settings (`.vscode/settings.json`)

The workspace settings enable Agent Mode with full auto-approval:

```json
{
  "chat.agent.enabled": true,
  "chat.agent.maxRequests": 999,
  "chat.tools.global.autoApprove": true,
  "chat.tools.terminal.autoReplyToPrompts": true,
  "github.copilot.chat.agent.runTasks": true,
  "chat.notifyWindowOnConfirmation": false,
  "github.copilot.chat.codeGeneration.useInstructionFiles": true
}
```

**Key Settings:**
- `chat.agent.enabled: true` - Enables Agent Mode
- `chat.agent.maxRequests: 999` - Allows long-running agent sessions without interruption
- `chat.tools.global.autoApprove: true` - Removes "Allow?" prompts for all tools
- `chat.tools.terminal.autoReplyToPrompts: true` - Auto-answers CLI prompts to prevent hangs
- `github.copilot.chat.agent.runTasks: true` - Allows agent to execute tasks automatically
- `chat.notifyWindowOnConfirmation: false` - Suppresses notification balloons
- `github.copilot.chat.codeGeneration.useInstructionFiles: true` - Uses repo instructions

### 2. Dev Container Settings (`.devcontainer/devcontainer.json`)

The dev container configuration applies the same settings in remote/container environments:

```json
{
  "customizations": {
    "vscode": {
      "settings": {
        "chat.agent.enabled": true,
        "chat.agent.maxRequests": 999,
        "chat.tools.global.autoApprove": true,
        "chat.tools.terminal.autoReplyToPrompts": true,
        "github.copilot.chat.agent.runTasks": true,
        "chat.notifyWindowOnConfirmation": false,
        "github.copilot.chat.codeGeneration.useInstructionFiles": true
      },
      "extensions": [
        "GitHub.copilot",
        "GitHub.copilot-chat"
      ]
    }
  }
}
```

**Extensions:**
- `GitHub.copilot` - Main Copilot extension
- `GitHub.copilot-chat` - Copilot Chat and Agent Mode support

### 3. Repository Instructions (`.github/copilot-instructions.md`)

Provides guidance to Copilot Agent about PR workflow and best practices:

- Always work in feature branches (`bot/*` or `copilot/*`)
- Never push to `main` directly
- Open PRs after tests pass
- Follow testing and code quality standards
- Maintain security guidelines

### 4. GitHub Copilot Config (`.github/copilot.yaml`)

Already configured with auto-approval rules and run permissions (existing file).

## Branch Protection

**IMPORTANT:** To enforce PR-only workflow:

1. Go to GitHub Repository Settings → Branches
2. Add branch protection rule for `main`:
   - ✅ Require a pull request before merging
   - ✅ Require approvals (optional but recommended)
   - ✅ Dismiss stale approvals (optional)
   - ✅ Restrict who can push to matching branches (optional: "No one")

This ensures all changes (including agent edits) go through PRs, even with local auto-approval enabled.

## User Settings (Optional)

For additional global auto-approval on your machine, add to VS Code User Settings:

**Command Palette** → `Preferences: Open User Settings (JSON)`:

```json
{
  "chat.agent.enabled": true,
  "chat.agent.maxRequests": 999,
  "chat.tools.global.autoApprove": true,
  "chat.tools.terminal.autoReplyToPrompts": true,
  "github.copilot.chat.agent.runTasks": true,
  "chat.notifyWindowOnConfirmation": false,
  "security.workspace.trust.enabled": false  // Nuclear option - use with caution
}
```

## SSH / WSL / Remote Settings

When connected to a remote (green "><" indicator):

**Command Palette** → `Preferences: Open Remote Settings (JSON)` and paste the same settings as above.

## Troubleshooting

If you still see confirmation prompts:

1. **Reset Confirmations**: Command Palette → `Chat: Reset Tool Confirmations`
2. **Check Versions**: Ensure VS Code 1.99+ and latest Copilot Chat extension
3. **Trust Workspace**: If not disabled, trust the folder or set `security.workspace.trust.enabled: false`
4. **Remote Scope**: Verify settings landed in remote via `Preferences: Open Remote Settings (JSON)`
5. **Container Scope**: Verify `devcontainer.json` customizations applied

## Security Considerations

**Risk Level: High Auto-Approval**

The configuration enables `chat.tools.global.autoApprove: true` which disables critical security protections in VS Code.

**Mitigation:**
- Branch protection enforces PR review workflow on GitHub side
- All changes must go through pull requests
- CI/CD pipelines verify all changes
- Agent Governor system tracks and verifies automated actions

**Alternative (Safer):**
Instead of global auto-approve, use allowlist via `chat.tools.terminal.autoApprove`:

```json
{
  "chat.tools.terminal.autoApprove": {
    "npm": true,
    "node": true,
    "git": true,
    "python": true,
    "pytest": true
  }
}
```

This is safer but requires manual approval for commands not in the allowlist.

## Governance Alignment

This configuration aligns with Fixzit's Agent Governor governance:

- ✅ Fully automatic execution without confirmation prompts
- ✅ PR-based workflow enforced via branch protection
- ✅ Evidence-based verification through CI/CD
- ✅ No direct pushes to main branch
- ✅ Comprehensive logging and audit trails

See `docs/FINAL_VERIFICATION_REPORT.md` for Agent Governor details.

## Quick Reference

| Setting | Purpose | Risk |
|---------|---------|------|
| `chat.agent.enabled` | Enable Agent Mode | Low |
| `chat.agent.maxRequests` | Max iterations before stopping | Low |
| `chat.tools.global.autoApprove` | Skip all "Allow?" prompts | **HIGH** |
| `chat.tools.terminal.autoReplyToPrompts` | Auto-answer CLI prompts | Medium |
| `github.copilot.chat.agent.runTasks` | Allow running tasks | Medium |
| `chat.notifyWindowOnConfirmation` | Suppress notification balloons | Low |

## Version Requirements

- **VS Code**: 1.99 or later
- **GitHub Copilot Extension**: Latest version
- **GitHub Copilot Chat Extension**: Latest version

## Related Documentation

- [VS Code Copilot Agent Documentation](https://code.visualstudio.com/docs/copilot/copilot-chat)
- [Dev Containers Documentation](https://containers.dev)
- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- `docs/FINAL_VERIFICATION_REPORT.md` - Agent Governor setup
- `tools/agent-runner.sh` - Command wrapper with allowlist/denylist
