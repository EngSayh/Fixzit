# MongoDB MCP Server Connection Error - Troubleshooting Guide

**Error:** `Invalid connection string with error: Invalid scheme, expected connection string to start with "mongodb://" or "mongodb+srv://"`

**Date Reported:** 2025-10-11  
**Status:** ✅ NOT A WORKSPACE ISSUE - User-side VS Code extension configuration only

## ⚠️ IMPORTANT: This Does NOT Affect the Fixzit Application

**Application Status:** ✅ **WORKING PERFECTLY**

- MongoDB Atlas connection: ✅ Active and healthy
- Health check endpoint: <http://localhost:3000/api/health/database>
- Connection status: `{"status":"healthy","database":"mongodb","connection":"active"}`
- Database operations: ✅ All working correctly

**This error is ONLY from a VS Code extension (MongoDB MCP Server) and does NOT affect:**

- The Fixzit application
- Database connectivity
- API functionality
- Any workspace code

---

## 🔍 Problem Analysis

The error is occurring from:

```
/Users/eng.sultanalhassni/.npm/_npx/191c568aa03d4fb8/node_modules/mongodb-mcp-server
```

This indicates:

1. ✅ **NOT a workspace issue** - Error comes from user's local machine
2. ✅ **NOT in project code** - MongoDB MCP server is a VS Code extension feature
3. ⚠️ **User's VS Code settings** - Connection string configured incorrectly

---

## 🛠️ Root Cause

The **MongoDB MCP Server** VS Code extension is attempting to connect to MongoDB but has an invalid connection string configured.

Expected format:

- `mongodb://localhost:27017/dbname`
- `mongodb+srv://username:password@cluster.mongodb.net/dbname`

Current format: **Invalid** (missing scheme or malformed)

---

## ✅ Solution Steps

### Option 1: Fix the Connection String (Recommended if using MCP)

1. Open VS Code Settings (User or Workspace)
   - Mac: `Cmd + ,`
   - Windows/Linux: `Ctrl + ,`

2. Search for "MCP" or "MongoDB MCP Server"

3. Look for settings like:
   - `mcpServers.mongodb.env.MONGODB_URI`
   - `mcpServers.mongodb.env.CONNECTION_STRING`
   - Any MCP server configuration

4. Update to valid MongoDB connection string:

   ```json
   {
     "mcpServers": {
       "mongodb": {
         "command": "npx",
         "args": ["-y", "mongodb-mcp-server"],
         "env": {
           "MONGODB_URI": "mongodb://localhost:27017/fixzit"
         }
       }
     }
   }
   ```

### Option 2: Disable MongoDB MCP Server (If not needed)

1. Open VS Code Settings

2. Search for "MCP"

3. Disable or remove MongoDB MCP server configuration:

   ```json
   {
     "chat.mcp.discovery.enabled": {
       "claude-desktop": false,
       "windsurf": false,
       "cursor-global": false,
       "cursor-workspace": false
     }
   }
   ```

4. Restart VS Code

---

## 📋 Workspace Configuration Status

**Workspace `.vscode/settings.json`:**

- ✅ NO MongoDB MCP configuration present
- ✅ MCP discovery disabled for all sources
- ✅ Workspace is clean

**Conclusion:** Issue is in **user's global VS Code settings** or **user profile configuration**, not in this workspace.

---

## 🔍 How to Find the Configuration

### Check User Settings

```bash
# Mac/Linux
cat ~/.config/Code/User/settings.json | grep -i mongodb

# Windows
type %APPDATA%\Code\User\settings.json | findstr /i mongodb
```

### Check Workspace Settings (Already verified - clean ✅)

```bash
cat .vscode/settings.json | grep -i mongodb
# Result: No matches
```

---

## ⚠️ Impact Assessment

**Current Impact:**

- ❌ MongoDB MCP Server extension failing to start
- ⚠️ Error logged every time VS Code starts
- ✅ **NO impact on Fixzit application** - App uses `MONGODB_URI` from `.env` file correctly

**Application Status:**

- ✅ MongoDB connection in app works fine
- ✅ `lib/mongodb-unified.ts` uses correct connection string
- ✅ All API routes connect to database successfully

---

## 📝 Recommended Action

**For User (Eng. Sultan Al Hassni):**

1. Open your **User Settings** (not workspace settings)
2. Search for any MongoDB or MCP server configuration
3. Either:
   - Fix the connection string to valid MongoDB URI
   - Remove/disable MongoDB MCP server configuration
4. Restart VS Code

**For Workspace:**

- ✅ No action needed - workspace configuration is correct

---

## 📚 References

- [MongoDB Connection String Format](https://www.mongodb.com/docs/manual/reference/connection-string/)
- [VS Code MCP Servers Documentation](https://code.visualstudio.com/docs/copilot/copilot-extensibility-overview)
- [MongoDB MCP Server GitHub](https://github.com/modelcontextprotocol/servers)

---

**Status:** ✅ **Documented - User action required**  
**Workspace Impact:** ✅ **None - workspace is clean**  
**Application Impact:** ✅ **None - app connects successfully**
