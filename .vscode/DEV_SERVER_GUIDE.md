# 🚀 Dev Server Guide

## Why the server isn't always alive on localhost:3000?

The Next.js development server **must be manually started** and doesn't run automatically when you open the workspace. Here's why and how to fix it:

### 🔍 Common Reasons

1. **Not Started**: The server was never started after opening the workspace
2. **Crashed**: The server encountered an error and stopped
3. **Stopped**: Someone manually stopped it (Ctrl+C)
4. **Out of Memory**: The process was killed due to memory issues
5. **Port Conflict**: Another process is using port 3000

---

## ✅ Solutions

### Option 1: Quick Start (Terminal Commands)

**VSCode tasks have been simplified - use npm scripts directly in the integrated terminal.**

Open the integrated terminal (`Ctrl+`` or `Cmd+``) and run:

```bash
# Start dev server (Turbopack - fastest)
pnpm dev

# Or with keep-alive monitoring (auto-restart on crash)
bash scripts/dev-server-keepalive.sh
```

### Option 2: Alternative Commands

```bash
# Start with webpack instead of Turbopack
pnpm dev:webpack

# Run E2E tests
pnpm qa:e2e

# Run tests in loop (3-hour unattended testing)
pnpm test:e2e:loop
```

### Option 3: Check if Running

```bash
# Check if server is running
lsof -i :3000

# Check the process
ps aux | grep "next dev"
```

---

## 🛠️ Troubleshooting

### Server Won't Start?

```bash
# 1. Check if port is occupied
lsof -i :3000

# 2. Kill the process if needed
kill -9 $(lsof -t -i :3000)

# 3. Start fresh
pnpm dev
```

### Server Keeps Crashing?

```bash
# Check the logs
tail -f /tmp/next-dev.log

# Use keep-alive script (auto-restarts)
bash scripts/dev-server-keepalive.sh
```

### Out of Memory?

```bash
# Clean up disk space
pnpm cleanup

# Check available memory
free -h

# Start with limited memory
NODE_OPTIONS="--max-old-space-size=4096" pnpm dev
```

---

## 📋 Status Indicators

**Server Running** ✅

- Terminal shows: `✓ Ready in Xs`
- Browser: http://localhost:3000 loads
- Command: `lsof -i :3000` shows a process

**Server Stopped** ❌

- Terminal: No "Ready" message
- Browser: "Connection refused"
- Command: `lsof -i :3000` shows nothing

---

## 💡 Tips

1. **Use Keep-Alive**: The script auto-restarts the server if it crashes
2. **Check Logs**: Always check terminal output for errors
3. **Free Space**: Keep at least 5GB free disk space
4. **Memory**: Monitor memory usage with `htop` or `free -h`
5. **Port 3000**: Make sure nothing else is using this port

---

## 🔗 Quick Links

- Dev Server Script: `scripts/dev-server-keepalive.sh`
- Package Scripts: `package.json` (see "dev" and "dev:webpack")
- Configuration: `next.config.js`

---

## ❓ Still Having Issues?

1. Restart VS Code workspace
2. Run `pnpm install` to ensure dependencies are installed
3. Check `.env.local` for required environment variables
4. Review error messages in terminal output
