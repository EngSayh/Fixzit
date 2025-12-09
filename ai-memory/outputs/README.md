# AI Memory Outputs

This directory is where AI-generated memory extractions should be saved.

## Expected Format

Each output file should be a JSON file with the following structure:

```json
[
  {
    "id": "unique-identifier",
    "type": "pattern|convention|architecture|api|component|hook|util|model|route|config|test|documentation|integration|security|performance|i18n",
    "content": {
      "title": "Short descriptive title",
      "description": "Detailed description of the pattern/component/etc",
      "examples": ["Optional array of code examples"],
      "files": ["Optional array of related file paths"],
      "tags": ["optional", "tags"]
    },
    "confidence": 0.9
  }
]
```

## Workflow

1. Open a batch file from `../batches/`
2. Use AI (Inline Chat) to analyze and extract knowledge
3. Save output as `output-XXX.json` in this directory
4. Run `node tools/merge-memory.js` to consolidate

## After Processing

Processed files are automatically moved to `./archived/` after merge.
