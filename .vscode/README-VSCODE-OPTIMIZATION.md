VSCode Workspace Optimization (for low-memory/dev environments)

Goal: run the production-ready app locally (http://localhost:3000) while keeping VSCode stable.

Quick steps:

1) Apply memory-optimized settings for this workspace:

```bash
# Make a backup and apply optimized settings
cp .vscode/settings.json .vscode/settings.json.bak || true
cp .vscode/settings.memory-optimized.json .vscode/settings.json
```

2) Disable or uninstall heavy extensions. Example (non-destructive):

```bash
# Interactive: will ask before disabling each extension
./.vscode/extensions-manage.sh

# Non-interactive: keep only the listed extension IDs (comma-separated), and uninstall disabled ones
WHITELIST="coderabbit.coderabbit" ./.vscode/extensions-manage.sh --uninstall
```

Notes:
- Common heavy extensions: `ms-python.vscode-pylance`, `GitHub.copilot`, `GitHub.copilot-chat`, AI/code-reviewers. Keep only the extensions you trust.
- After changes restart VSCode. Monitor memory:

```bash
ps aux | egrep "(code|node|typescript|pylance)" | head -20
```

If you still see multiple TypeScript/Pylance servers:
- Ensure only one workspace folder is opened (use multi-root sparingly).
- Set `typescript.tsserver.maxTsServerMemory` in `.vscode/settings.json` (we set an optimized default).
- Use `tsconfig.performance.json` (created in the repo) to reduce language-server work for heavy files.

If you want, I can automatically apply the whitelist you want and push the changes to this branch. Provide the extension ID(s) you want to keep (example: `coderabbit.coderabbit`).