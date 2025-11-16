# User Settings Configuration for Full Auto-Approval

## ⚠️ IMPORTANT: Apply to Your User Settings

The workspace and devcontainer settings have been configured. You now need to apply the same settings to your **User Settings** (global on your Mac).

## How to Apply User Settings

1. Open VS Code
2. Press `Cmd+Shift+P` (Command Palette)
3. Type: `Preferences: Open User Settings (JSON)`
4. **Merge or add** the following JSON block into your user settings:

```json
{
  "chat.agent.enabled": true,
  "chat.agent.maxRequests": 999,

  "chat.tools.global.autoApprove": true,
  "chat.tools.terminal.autoApprove": true,
  "chat.tools.edits.autoApprove": true,

  "chat.tools.terminal.autoReplyToPrompts": true,
  "chat.editing.autoAcceptDelay": 3,
  "chat.checkpoints.enabled": true,

  "chat.mcp.discovery.enabled": false,

  "security.workspace.trust.enabled": false,
  "security.workspace.trust.untrustedFiles": "open",

  "github.copilot.chat.agent.runTasks": true,
  "chat.notifyWindowOnConfirmation": false
}
```

## One-Time Reset Sequence (After Applying Settings)

1. In the **Chat panel**, select **Agent mode**
2. Open Command Palette (`Cmd+Shift+P`) → `Chat: Reset Tool Confirmations`
3. Open Command Palette → `Developer: Reload Window` (or fully quit/reopen VS Code)
4. If you ever see "Allow" again, click the **▾ dropdown** → Choose **"Always allow"**

## Verification Test (30 seconds)

Ask the agent in Agent mode:

> "Install deps, build the app, create src/utils/date.ts with 3 helpers and tests, and save all."

**Expected Result:** Runs end-to-end with **ZERO prompts**.

## What This Configuration Does

### Full Unconditional Auto-Approval:

- ✅ **All terminal commands** auto-approved (no command-specific rules)
- ✅ **All file edits** auto-approved (no file guards)
- ✅ **All tools** auto-approved (global approval)
- ✅ **Y/N prompts** auto-answered
- ✅ **Edit diffs** auto-accepted after 3 seconds
- ✅ **MCP discovery** disabled (no external tool prompts)
- ✅ **Workspace trust** disabled (no trust banners)

### Security & Workflow:

- 🔒 **PR-only workflow** enforced via GitHub Branch Protection on `main`
- 🔒 Local agent has full power; merges still require PR review
- 📸 **Checkpoints enabled** for easy rollback if needed

## Current Status

✅ **Workspace settings** (.vscode/settings.json) - Configured
✅ **Devcontainer settings** (.devcontainer/devcontainer.json) - Configured
⏳ **User settings** - **YOU MUST APPLY MANUALLY** (see steps above)

## After Configuration

Once all three scopes (User, Workspace, Remote) have the same settings:
- The agent will operate with **ZERO permission prompts**
- All changes still go through **PR workflow** (cannot push to main directly)
- You can focus on high-level instructions while agent executes autonomously

---

**Last Updated:** 2025-11-13
**Branch:** fix/date-hydration-complete-system-wide
**Commit:** e257c2cae
