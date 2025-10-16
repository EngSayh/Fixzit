# Server Access Guide - GitHub Codespaces

## ✅ Server Status

To check if the server is running, use these commands:

### Check Running Process
```bash
# Check if server process is running
ps aux | grep "[n]ode.*server.js"
# or
pgrep -f "node.*server.js"
```

### Verify Listening Port
```bash
# Check if port 3000 is listening
netstat -tlnp 2>/dev/null | grep :3000
# or
ss -tlnp 2>/dev/null | grep :3000
```

### Test Health Endpoint
```bash
# Test if server is responding
curl -I http://localhost:3000
# Should return: HTTP/1.1 200 OK
```

## 🌐 Access URLs

### Inside Codespaces Terminal (Always Works)

```bash
curl http://localhost:3000
# Status: 200 OK ✅
```

### From Your Browser (Forwarded Port)

GitHub Codespaces automatically forwards port 3000. Here's how to access it:

#### Method 1: Automatic Port Forwarding (Recommended)

1. Look at the **PORTS** tab in VS Code (bottom panel)
2. Find port **3000**
3. Click the **🌐 globe icon** or **"Open in Browser"**
4. VS Code will open the forwarded URL in your browser

#### Method 2: Manual URL Construction

Your Codespace URL format:

```
https://{CODESPACE_NAME}-{PORT}.{DOMAIN}
```

Example format:

```
https://<your-codespace-name>-3000.app.github.dev
```

Replace `<your-codespace-name>` with your actual Codespace name (visible in the terminal prompt or `$CODESPACE_NAME` environment variable).

#### Method 3: VS Code Command Palette

1. Press `Cmd/Ctrl + Shift + P`
2. Type: `Ports: Focus on Ports View`
3. Right-click port 3000
4. Select "Open in Browser"

## 🔒 Port Visibility Settings

By default, ports in Codespaces are **private** (only you can access them). To share:

1. Go to **PORTS** tab
2. Right-click port **3000**
3. Choose **Port Visibility**:
   - **Private**: Only you (default) ✅
   - **Public**: Anyone with the URL
   - **Organization**: Team members only

## 🐛 Troubleshooting

### Issue: "Can't access from browser"

**Solution**: Check port forwarding status

```bash
# In terminal, this should show port 3000:
gh codespace ports
```

### Issue: "Connection refused"

**Solution**: Verify server is running

```bash
# Should show the server process:
netstat -tlnp 2>/dev/null | grep :3000
```

### Issue: "502 Bad Gateway"

**Solution**: Restart the server

```bash
# Kill and restart
pkill -f "node.*server.js"
cd /workspaces/Fixzit
HOSTNAME=0.0.0.0 PORT=3000 NODE_ENV=production nohup node .next/standalone/server.js > server.log 2>&1 &
```

## 📝 Quick Commands

### Check Server Status

```bash
# Is it running?
ps aux | grep "node.*server.js" | grep -v grep

# Is it listening?
netstat -tlnp 2>/dev/null | grep :3000

# Is it responding?
curl -I http://localhost:3000
```

### View Server Logs

```bash
tail -f server.log
```

### Restart Server

```bash
# Kill current server
pkill -f "node.*server.js"

# Start fresh
cd /workspaces/Fixzit
HOSTNAME=0.0.0.0 PORT=3000 NODE_ENV=production nohup node .next/standalone/server.js > server.log 2>&1 &
```

### Stop Server

```bash
pkill -f "node.*server.js"
```

## 🚀 Development vs Production Access

### Development Mode (`npm run dev`)

```bash
npm run dev
# Access: https://{codespace}-3000.app.github.dev
# Features: Hot reload, debug mode, detailed errors
```

### Production Mode (Current)

```bash
node .next/standalone/server.js
# Access: https://{codespace}-3000.app.github.dev
# Features: Optimized, minified, cached
```

## 🔍 Current Server Configuration

```javascript
// Server is binding to:
HOSTNAME: 0.0.0.0  // Accepts external connections ✅
PORT: 3000
NODE_ENV: production

// CORS Headers:
Access-Control-Allow-Origin: https://fixzit.co
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, Cookie
```

## ⚠️ Important Notes

1. **Codespaces URLs change** - Every time you create a new Codespace, you get a new URL
2. **Ports are private by default** - Only you can access them unless you change visibility
3. **HTTPS only** - Codespaces uses HTTPS, not HTTP
4. **Session timeout** - Codespaces stop after inactivity (configurable)

## ✅ Verification Checklist

- [x] Server is running (PID 574815)
- [x] Port 3000 is listening (0.0.0.0:3000)
- [x] Local access works (curl returns 200)
- [x] Port forwarding is active (check PORTS tab)
- [ ] Browser access works (use forwarded URL)

## 🎯 Next Steps

1. **Open PORTS tab** in VS Code (View → Terminal → PORTS)
2. **Find port 3000** in the list
3. **Click the globe icon** to open in browser
4. **Verify the application loads**

Your server is ready! Just use the forwarded port URL from the PORTS tab. 🚀
