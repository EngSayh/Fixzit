# VSCode Copilot Agent Configuration for Fixzit Souq

This guide explains how to set up VSCode Copilot to work optimally with the Fixzit Souq codebase, including:

1. **Custom Agent (Chat Mode)** for Fixzit development
2. **Custom Instructions** for coding style
3. **Extension setup** for Issue Tracker integration
4. **TODO/FIXME auto-issue generation**

---

## 1. Custom Agent Setup (Recommended for VSCode 1.99+)

Create a custom agent file that VSCode Copilot will use when you invoke it.

### File: `.vscode/fixzit-developer.chatmode.md`

```markdown
---
name: Fixzit Developer
description: Expert assistant for Fixzit Souq facility management platform development. Specializes in Next.js 14, TypeScript, RTL support, and Arabic/English interfaces.
tools: ['codebase', 'search', 'usages', 'problems', 'terminal']
model: claude-sonnet-4
---

# Fixzit Souq Development Assistant

You are an expert developer working on **Fixzit Souq**, a comprehensive facility management platform for Saudi Arabia.

## Project Context

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with RTL-first approach
- **UI**: shadcn/ui + Radix primitives
- **State**: Zustand + TanStack Query
- **Database**: MongoDB with Mongoose
- **Auth**: JWT with refresh tokens

## Brand Colors (ALWAYS USE)

- Primary Blue: #0061A8
- Dark Blue: #023047
- Orange (CTAs): #F6851F
- Green (Success): #00A859
- Yellow (Warning): #FFB400

## Coding Standards

### TypeScript
- Always use strict typing
- Define interfaces for all props
- Use Zod for runtime validation
- Export types from dedicated .types.ts files

### Components
- Use 'use client' only when necessary
- Prefer Server Components
- Use Server Actions for mutations
- Implement proper loading/error states

### Styling
- Use logical CSS properties (start/end, not left/right)
- Support RTL: `ps-4` not `pl-4`, `text-start` not `text-left`
- Dark theme first
- Follow Fixzit design system

### Naming
- Components: PascalCase (IssueTable.tsx)
- Hooks: camelCase with use prefix (useIssueSelection.ts)
- Utils: kebab-case (format-date.ts)
- Constants: SCREAMING_SNAKE_CASE

## Common Tasks

When asked to:

### Create a component
1. Ask about server vs client requirement
2. Include proper TypeScript types
3. Add loading and error states
4. Support RTL
5. Use Fixzit colors

### Fix a bug
1. Search codebase for related code
2. Check for TypeScript errors
3. Review recent changes
4. Suggest test coverage

### Add a feature
1. Understand the module context
2. Follow existing patterns
3. Consider Arabic/English support
4. Add to relevant API routes

### Review code
1. Check TypeScript compliance
2. Verify RTL support
3. Ensure accessibility
4. Look for performance issues

## Response Format

- Be concise and direct
- Show code examples
- Explain RTL implications
- Mention testing needs
- Reference relevant Fixzit modules
```

---

## 2. Workspace Settings

### File: `.vscode/settings.json`

```json
{
  // Copilot settings
  "github.copilot.enable": {
    "*": true,
    "markdown": true,
    "yaml": true
  },
  "github.copilot.advanced": {
    "debug.overrideChatEngine": "claude-sonnet-4"
  },
  "github.copilot.chat.codeGeneration.instructions": [
    {
      "text": "Always use TypeScript with strict types. Use logical CSS properties for RTL support (start/end not left/right). Follow Fixzit brand colors (#0061A8 blue, #F6851F orange). Use shadcn/ui components. Add proper loading states. Support Arabic/English."
    }
  ],
  "github.copilot.chat.testGeneration.instructions": [
    {
      "text": "Use Vitest for unit tests, React Testing Library for components, Playwright for E2E. Test RTL rendering. Test keyboard navigation. Test Arabic text display."
    }
  ],
  
  // Editor settings for project
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  
  // TypeScript
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  
  // Tailwind
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "'([^']*)'"],
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ],
  
  // File associations
  "files.associations": {
    "*.css": "tailwindcss"
  },
  
  // Search exclusions
  "search.exclude": {
    "**/node_modules": true,
    "**/.next": true,
    "**/dist": true,
    "**/.git": true
  }
}
```

---

## 3. Custom Instructions File

### File: `.github/copilot-instructions.md`

```markdown
# Copilot Instructions for Fixzit Souq

## Project Overview
Fixzit Souq is a facility management platform for Saudi Arabia with 13 modules, 14 roles, and full Arabic/English RTL support.

## Tech Stack
- Next.js 14 (App Router)
- TypeScript (strict)
- Tailwind CSS + shadcn/ui
- MongoDB + Mongoose
- Zustand + TanStack Query

## Code Style Requirements

### Always
- Use TypeScript strict mode
- Add proper types for all functions and components
- Use `cn()` utility from `@/lib/utils` for className merging
- Implement loading, error, and empty states
- Support RTL with logical properties

### Never
- Use `any` type
- Use `left`/`right` in CSS (use `start`/`end`)
- Skip TypeScript errors with @ts-ignore
- Use client components unnecessarily
- Hardcode Arabic strings (use i18n)

### Components Pattern
```tsx
'use client'; // Only if needed

import { cn } from '@/lib/utils';

interface ComponentProps {
  // Always define props interface
}

export function Component({ prop }: ComponentProps) {
  return (
    <div className={cn('base-classes', conditionalClasses)}>
      {/* Content */}
    </div>
  );
}
```

### Server Action Pattern
```tsx
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const Schema = z.object({...});

export async function serverAction(formData: FormData) {
  const parsed = Schema.safeParse({...});
  if (!parsed.success) return { error: 'Invalid input' };
  
  try {
    // Database operation
    revalidatePath('/path');
    return { success: true };
  } catch (error) {
    return { error: 'Operation failed' };
  }
}
```

## Module Structure
Each module follows:
```
app/[module]/
├── page.tsx           # Server component entry
├── loading.tsx        # Skeleton loading
├── error.tsx          # Error boundary
├── layout.tsx         # Module layout
└── _components/       # Module-specific components
```

## API Routes
```
app/api/[module]/
├── route.ts           # GET, POST handlers
└── [id]/
    └── route.ts       # GET, PUT, DELETE handlers
```

## Testing Requirements
- Unit tests for utilities
- Component tests for UI
- E2E tests for workflows
- RTL rendering tests
- Keyboard navigation tests
```

---

## 4. Issue Tracker Integration Script

### File: `scripts/sync-issues.ts`

This script scans your codebase for TODO/FIXME comments and creates issues in your System Issue Tracker.

```typescript
#!/usr/bin/env tsx
/**
 * Sync TODO/FIXME comments to Fixzit Issue Tracker
 * 
 * Usage:
 *   npx tsx scripts/sync-issues.ts
 *   npx tsx scripts/sync-issues.ts --dry-run
 */

import { glob } from 'glob';
import * as fs from 'fs/promises';
import * as path from 'path';

// Configuration
const CONFIG = {
  API_URL: process.env.FIXZIT_API_URL || 'http://localhost:3000/api',
  API_KEY: process.env.FIXZIT_API_KEY || '',
  SCAN_PATTERNS: ['src/**/*.ts', 'src/**/*.tsx', 'app/**/*.ts', 'app/**/*.tsx'],
  IGNORE_PATTERNS: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
  DRY_RUN: process.argv.includes('--dry-run'),
};

// Types
interface TodoComment {
  type: 'TODO' | 'FIXME' | 'HACK' | 'BUG' | 'XXX';
  message: string;
  file: string;
  line: number;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  category: string;
}

interface Issue {
  title: string;
  description: string;
  priority: string;
  category: string;
  module: string;
  status: string;
  source: 'code-scan';
  sourceFile: string;
  sourceLine: number;
}

// Priority mapping
const PRIORITY_MAP: Record<string, TodoComment['priority']> = {
  'FIXME': 'P1',
  'BUG': 'P0',
  'XXX': 'P0',
  'HACK': 'P2',
  'TODO': 'P3',
};

// Category mapping based on file path
function getCategory(filePath: string): string {
  if (filePath.includes('/api/')) return 'Documentation';
  if (filePath.includes('/components/')) return 'Bug';
  if (filePath.includes('/hooks/')) return 'Efficiency';
  if (filePath.includes('test') || filePath.includes('spec')) return 'Missing Test';
  if (filePath.includes('/lib/')) return 'Documentation';
  return 'Bug';
}

// Module mapping based on file path
function getModule(filePath: string): string {
  const moduleMatch = filePath.match(/\/(workorders|properties|finance|hr|crm|marketplace|support|compliance|reports|admin|auth)\//i);
  if (moduleMatch) return moduleMatch[1].toLowerCase();
  
  if (filePath.includes('/superadmin/')) return 'superadmin';
  if (filePath.includes('/api/')) return 'api';
  if (filePath.includes('/components/ui/')) return 'core';
  return 'core';
}

// Parse TODO comments from file
async function parseTodoComments(filePath: string): Promise<TodoComment[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const comments: TodoComment[] = [];

  const todoRegex = /\/\/\s*(TODO|FIXME|HACK|BUG|XXX)(?:\(([^)]+)\))?[:\s]+(.+)/gi;
  const blockCommentRegex = /\*\s*(TODO|FIXME|HACK|BUG|XXX)(?:\(([^)]+)\))?[:\s]+(.+)/gi;

  lines.forEach((line, index) => {
    // Single line comments
    let match = todoRegex.exec(line);
    if (match) {
      comments.push({
        type: match[1].toUpperCase() as TodoComment['type'],
        message: match[3].trim(),
        file: filePath,
        line: index + 1,
        priority: PRIORITY_MAP[match[1].toUpperCase()] || 'P3',
        category: getCategory(filePath),
      });
    }

    // Block comments
    match = blockCommentRegex.exec(line);
    if (match) {
      comments.push({
        type: match[1].toUpperCase() as TodoComment['type'],
        message: match[3].trim(),
        file: filePath,
        line: index + 1,
        priority: PRIORITY_MAP[match[1].toUpperCase()] || 'P3',
        category: getCategory(filePath),
      });
    }

    // Reset regex lastIndex
    todoRegex.lastIndex = 0;
    blockCommentRegex.lastIndex = 0;
  });

  return comments;
}

// Convert TODO to Issue
function todoToIssue(todo: TodoComment): Issue {
  const relativeFile = path.relative(process.cwd(), todo.file);
  
  return {
    title: `[${todo.type}] ${todo.message.substring(0, 100)}`,
    description: `
**Source**: ${todo.type} comment in code

**File**: \`${relativeFile}\`
**Line**: ${todo.line}

**Original Comment**:
\`\`\`
${todo.message}
\`\`\`

---
*Auto-generated from code scan*
    `.trim(),
    priority: todo.priority,
    category: todo.category,
    module: getModule(todo.file),
    status: 'open',
    source: 'code-scan',
    sourceFile: relativeFile,
    sourceLine: todo.line,
  };
}

// Check if issue already exists
async function issueExists(issue: Issue): Promise<boolean> {
  try {
    const response = await fetch(
      `${CONFIG.API_URL}/superadmin/issues/search?` + 
      new URLSearchParams({
        sourceFile: issue.sourceFile,
        sourceLine: issue.sourceLine.toString(),
      }),
      {
        headers: {
          'Authorization': `Bearer ${CONFIG.API_KEY}`,
        },
      }
    );
    
    if (!response.ok) return false;
    const data = await response.json();
    return data.issues?.length > 0;
  } catch {
    return false;
  }
}

// Create issue in tracker
async function createIssue(issue: Issue): Promise<void> {
  if (CONFIG.DRY_RUN) {
    console.log(`[DRY RUN] Would create issue: ${issue.title}`);
    return;
  }

  const response = await fetch(`${CONFIG.API_URL}/superadmin/issues`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.API_KEY}`,
    },
    body: JSON.stringify(issue),
  });

  if (!response.ok) {
    throw new Error(`Failed to create issue: ${response.statusText}`);
  }

  console.log(`✓ Created issue: ${issue.title}`);
}

// Main function
async function main() {
  console.log('🔍 Scanning codebase for TODO/FIXME comments...\n');
  
  if (CONFIG.DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No issues will be created\n');
  }

  // Find all matching files
  const files = await glob(CONFIG.SCAN_PATTERNS, {
    ignore: CONFIG.IGNORE_PATTERNS,
  });

  console.log(`Found ${files.length} files to scan\n`);

  // Parse all files
  const allComments: TodoComment[] = [];
  for (const file of files) {
    const comments = await parseTodoComments(file);
    allComments.push(...comments);
  }

  console.log(`Found ${allComments.length} TODO/FIXME comments\n`);

  // Group by priority
  const byPriority = allComments.reduce((acc, comment) => {
    acc[comment.priority] = (acc[comment.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('Priority breakdown:');
  Object.entries(byPriority).forEach(([priority, count]) => {
    console.log(`  ${priority}: ${count}`);
  });
  console.log('');

  // Create issues
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const comment of allComments) {
    const issue = todoToIssue(comment);
    
    try {
      const exists = await issueExists(issue);
      if (exists) {
        skipped++;
        continue;
      }

      await createIssue(issue);
      created++;
    } catch (error) {
      console.error(`✗ Error creating issue: ${error}`);
      errors++;
    }
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log(`  Created: ${created}`);
  console.log(`  Skipped (existing): ${skipped}`);
  console.log(`  Errors: ${errors}`);
}

// Run
main().catch(console.error);
```

### Add to package.json

```json
{
  "scripts": {
    "issues:scan": "tsx scripts/sync-issues.ts",
    "issues:scan:dry": "tsx scripts/sync-issues.ts --dry-run"
  }
}
```

---

## 5. Git Hooks for Issue Validation

### File: `.husky/commit-msg`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Validate commit message references an issue
commit_msg=$(cat "$1")

# Check for issue reference pattern (FIXZIT-123 or #123)
if ! echo "$commit_msg" | grep -qE '(FIXZIT-[0-9]+|#[0-9]+|Merge|Revert)'; then
  echo "❌ Commit message must reference an issue (e.g., FIXZIT-123 or #123)"
  echo "   Your message: $commit_msg"
  echo ""
  echo "   Examples:"
  echo "   - feat: add bulk actions FIXZIT-123"
  echo "   - fix: resolve RTL issue #456"
  exit 1
fi

echo "✓ Commit message validated"
```

### File: `.husky/pre-push`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run TODO scan before push (optional - can be slow)
if [ "$SKIP_TODO_SCAN" != "1" ]; then
  echo "🔍 Checking for new TODO/FIXME comments..."
  npm run issues:scan:dry
fi

# Run type check
echo "📝 Running type check..."
npm run type-check

# Run tests
echo "🧪 Running tests..."
npm run test:ci
```

---

## 6. VSCode Tasks

### File: `.vscode/tasks.json`

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Scan TODOs",
      "type": "shell",
      "command": "npm run issues:scan",
      "problemMatcher": [],
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    },
    {
      "label": "Scan TODOs (Dry Run)",
      "type": "shell",
      "command": "npm run issues:scan:dry",
      "problemMatcher": [],
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    },
    {
      "label": "Dev Server",
      "type": "shell",
      "command": "npm run dev",
      "isBackground": true,
      "problemMatcher": {
        "pattern": {
          "regexp": "^$"
        },
        "background": {
          "activeOnStart": true,
          "beginsPattern": "^.*Starting.*",
          "endsPattern": "^.*Ready.*"
        }
      }
    },
    {
      "label": "Generate Component",
      "type": "shell",
      "command": "npx plop component",
      "problemMatcher": []
    }
  ]
}
```

---

## 7. Keyboard Shortcuts

### File: `.vscode/keybindings.json` (User level)

```json
[
  {
    "key": "cmd+shift+i",
    "command": "workbench.action.tasks.runTask",
    "args": "Scan TODOs (Dry Run)"
  },
  {
    "key": "cmd+shift+g",
    "command": "workbench.action.tasks.runTask", 
    "args": "Generate Component"
  }
]
```

---

## Quick Start

1. Copy all files to your Fixzit project
2. Install dependencies: `npm install`
3. Set environment variables:
   ```bash
   export FIXZIT_API_URL=http://localhost:3000/api
   export FIXZIT_API_KEY=your-api-key
   ```
4. Enable the custom agent in VSCode Copilot Chat
5. Start using `@fixzit-developer` in chat

## Usage Examples

### In Copilot Chat

```
@fixzit-developer Create a new component for displaying issue priority badges with proper RTL support

@fixzit-developer Review this file for potential issues

@fixzit-developer Add bulk selection to the issue table

@fixzit-developer Fix the loading state in the dashboard
```

### Terminal Commands

```bash
# Scan for TODOs and create issues
npm run issues:scan

# Dry run to see what would be created
npm run issues:scan:dry
```

---

## Troubleshooting

### Copilot not using custom agent
- Ensure VSCode is 1.99+
- Check that the .chatmode.md file is in .vscode folder
- Restart VSCode

### Issues not being created
- Verify API_URL and API_KEY environment variables
- Check API endpoint is running
- Review console output for errors

### TypeScript errors in components
- Run `npm run type-check`
- Ensure all imports are correct
- Check for missing type definitions
