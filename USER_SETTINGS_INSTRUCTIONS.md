# GitHub Copilot Agent - Complete Auto-Approval Setup

## ✅ Status

- **Workspace Settings**: ✅ Applied (`.vscode/settings.json`)
- **User Settings (Global)**: ⚠️ **YOU MUST APPLY MANUALLY** (see Step 1 below)

---

## Step 1: Apply User Settings (Global - Your Mac)

### Instructions

1. Open VS Code
1. Press `Cmd+Shift+P` → Type **"Preferences: Open User Settings (JSON)"**
1. **Merge** (don't replace) the following JSON into your User Settings:

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
  "chat.notifyWindowOnConfirmation": false,

  "chat.mcp.discovery.enabled": false,

  "security.workspace.trust.enabled": false,
  "security.workspace.trust.untrustedFiles": "open",

  "github.copilot.chat.agent.runTasks": true
}
```

1. Save the file

---

## Step 2: One-Time Reset (Do in Order)

1. **Switch to Agent Mode**: In the Chat panel, select **Agent** from the mode dropdown
2. **Reset Confirmations**: Press `Cmd+Shift+P` → **"Chat: Reset Tool Confirmations"**
3. **Reload Window**: Press `Cmd+Shift+P` → **"Developer: Reload Window"** (or fully quit/reopen VS Code)

---

## Step 3: Handle Any Remaining Prompts

If you see an "Allow" button after the reset:

- Click the **▾** dropdown next to "Allow"
- Choose **"Always allow"** (this writes a persistent policy)

---

## Troubleshooting

If prompts **still** appear, check:

1. **Wrong key lingering**: Remove any `chat.editing.autoAccept` (must be `chat.editing.autoAcceptDelay`)
2. **Scope mismatch**: Ensure both User Settings (global) and Workspace Settings have the same values
3. **Not in Agent mode**: Chat vs Agent are different modes
4. **Other extensions**: Disable Cursor/Windsurf/MCP or mirror these settings there
5. **Old cache**: Run Step 2 reset sequence again

---

## What These Settings Do

### Nuclear Switches (Zero Prompts)

- `chat.tools.global.autoApprove: true` - All tools auto-approved
- `chat.tools.terminal.autoApprove: true` - All terminal commands auto-approved
- `chat.tools.edits.autoApprove: true` - All file edits auto-approved
- `chat.tools.terminal.autoReplyToPrompts: true` - CLI prompts auto-answered
- `chat.editing.autoAcceptDelay: 3` - Diffs auto-accept after 3 seconds
- `chat.notifyWindowOnConfirmation: false` - No popup notifications

### Safety

- **GitHub Branch Protection**: Keep PR requirements on `main` branch
- **Local autonomy** with **server-side safety** via PR review process

---

## Verification Test

After completing Steps 1-2, run this in chat:

```text
Run these commands:
1. echo "test1"
2. pwd
3. git status
```

**Expected**: All commands execute **without** any Allow prompts.

**If prompts appear**: You missed Step 1 (User Settings) or Step 2 (Reset).

---

## Current Configuration Status

✅ **Workspace Settings** - Applied to `.vscode/settings.json`  
✅ **DevContainer Settings** - Applied to `.devcontainer/devcontainer.json`  
⚠️ **User Settings (Global)** - **YOU MUST APPLY** (Step 1 above)

Once you complete Step 1 and Step 2, you'll have **complete zero-prompt autonomous operation**.
