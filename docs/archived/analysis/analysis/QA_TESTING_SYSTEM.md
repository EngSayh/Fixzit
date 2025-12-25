# Fixzit QA Testing System

## Overview

A comprehensive real-time click tracer + error capture + auto-heal agent that runs while you use Fixzit. It attaches to every button and navigation event, halts on errors, records evidence, applies safe auto-fix patterns, and logs everything to MongoDB for audit and follow-up.

## Features

### 🎯 Real-Time Click Tracking

- Captures every click on buttons, links, and clickable elements
- Records DOM path, element text, and context
- Tags with current route, role, and organization

### 🛑 Halt-Fix-Verify Protocol

- Immediately halts navigation on any error
- Captures before/after screenshots (via html2canvas)
- Applies safe, reversible auto-heals
- Waits 10 seconds per STRICT protocol
- Re-tests and only then un-halts

### 🔧 Auto-Heal Patterns

Safe client-side actions that do NOT change your layout:

- **Hydration mismatch** → Re-mount client islands
- **webpack_require.n error** → Shallow route refresh
- **'call' undefined** → Re-order provider sequence
- **Network 4xx/5xx** → Exponential backoff retry

### 📊 HUD Overlay

- Draggable status panel (non-invasive)
- Shows CE (Console Errors), NE (Network Errors), HY (Hydration Errors)
- Role and current route display
- Agent On/Off toggle
- Clear counters button

### 💾 MongoDB Audit Trail

- All events logged to `fixzit.qaevents` collection
- Click traces, errors, screenshots, fixes
- Searchable by role, module, timestamp
- Evidence for QA sign-off

## Setup

### 1. Environment Variables

Add to `.env.local`:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://USER:PASS@cluster0.mongodb.net/fixzit

# QA Agent Settings
NEXT_PUBLIC_QA_AGENT=1           # 0/1 to toggle agent
NEXT_PUBLIC_QA_AUTOFIX=1         # 0/1 to toggle auto-heal
NEXT_PUBLIC_QA_STRICT=1          # keep HALT–FIX–VERIFY strict
```

### 2. Installation

```bash
npm install mongoose nanoid html2canvas
```

### 3. Usage

The QA Agent automatically starts when `NEXT_PUBLIC_QA_AGENT=1`. You'll see the HUD in the top-left corner.

## Architecture

### Components

- **QAProvider** (`src/providers/QAProvider.tsx`) - Wraps the app, provides context
- **AutoFixAgent** (`src/qa/AutoFixAgent.tsx`) - Main agent with HUD and event capture
- **ErrorBoundary** (`src/qa/ErrorBoundary.tsx`) - Catches React crashes
- **Console Hijack** (`src/qa/consoleHijack.ts`) - Mirrors console errors
- **QA Patterns** (`src/qa/qaPatterns.ts`) - Auto-heal heuristics
- **DOM Path** (`src/qa/domPath.ts`) - Precise element tracking

### Data Flow

1. User clicks → captured with DOM path
2. Error occurs → agent halts
3. Screenshot taken (before)
4. Auto-heal applied
5. Wait 10s (STRICT)
6. Screenshot taken (after)
7. Gate check (0 errors required)
8. Events batched to MongoDB
9. Navigation resumes

## Alignment with Governance

### Layout Freeze ✓

- No DOM structure changes
- Header/Sidebar/Footer untouched
- HUD uses portal with `pointer-events: none`

### STRICT v4 Acceptance ✓

- 0 console errors required
- 0 network failures required
- 0 hydration errors required
- Artifacts captured for proof

### Role-Based Modules ✓

- Events tagged with role from headers
- Maps to authoritative navigation
- Supports multi-tenant tracking

### Branding & RTL ✓

- No color/theme changes
- RTL/LTR preserved
- Uses brand colors (#023047, #0061A8, #00A859, #FFB400)

## Extending

### Custom Heuristics

Add to `src/qa/qaPatterns.ts`:

```typescript
{
  id: 'my-pattern',
  test: ({ message }) => /my-error/i.test(message),
  apply: async () => {
    // Your safe fix
    return { note: 'Fixed my-error', ok: true };
  }
}
```

### Admin Dashboard

Query MongoDB for insights:

```javascript
// Most clicked buttons by role
db.qaevents.aggregate([
  { $match: { type: "click" } },
  {
    $group: { _id: { role: "$role", text: "$meta.text" }, count: { $sum: 1 } },
  },
  { $sort: { count: -1 } },
]);

// Error frequency by route
db.qaevents.aggregate([
  { $match: { type: { $in: ["console", "runtime-error"] } } },
  { $group: { _id: "$route", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
]);
```

## Troubleshooting

### HUD Not Visible

- Check `NEXT_PUBLIC_QA_AGENT=1` in `.env.local`
- Verify browser console for errors
- Try clearing localStorage

### MongoDB Connection Failed

- Verify `MONGODB_URI` is correct
- Check network/firewall
- Logging endpoint returns 500 gracefully

### Auto-Heal Not Working

- Check `NEXT_PUBLIC_QA_AUTOFIX=1`
- Verify error matches a heuristic pattern
- Check browser console for heal attempts

## Security Notes

- Screenshots are compressed JPEG at 60% quality
- MongoDB batch inserts capped at 100 events
- No sensitive data in DOM paths
- Agent can be disabled per environment
