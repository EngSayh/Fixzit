# Outputs Directory

This directory stores the JSON outputs from processing AI Memory batches through Copilot Inline Chat.

## Naming Convention

Files should be named to match their source batch:
- `components-batch-001.json` (from `batches/components-batch-001.xml`)
- `lib-batch-002.json` (from `batches/lib-batch-002.xml`)
- etc.

## Workflow

1. Open a batch file from `ai-memory/batches/*.xml`
2. Select all content and run through Copilot Inline Chat
3. Copy the JSON array output
4. Save to this directory with matching name (`.json` extension)
5. Run `node tools/merge-memory.js` to update master index

## Expected JSON Format

```json
[
  {
    "file": "components/ui/Button.tsx",
    "category": "components",
    "summary": "Reusable button component with variants",
    "exports": ["Button", "ButtonProps"],
    "dependencies": ["@/lib/utils", "react"]
  }
]
```

## Validation

Run `node tools/merge-memory.js --validate` to check all files for errors.
