# Quick Network Access Setup

## Your Current Setup
- **Your IP**: 192.168.1.9
- **Frontend URL**: http://192.168.1.9:3000
- **Backend URL**: http://192.168.1.9:8000

## Steps to Test

### 1. Make sure both servers are running:

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```
Should show: `Server running on port 8000`

**Terminal 2 - Frontend:**
```bash
cd frontend-v2
npm run dev
```
Should show:
```
  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.1.9:3000/
```

### 2. Test from your computer first:
Open browser: `http://192.168.1.9:3000`

### 3. Test from another device:
1. Make sure both devices are on **same Wi-Fi network**
2. Open browser on other device
3. Go to: `http://192.168.1.9:3000`

## If "Can't Reach" Error:

### Check 1: Is the server actually running?
```bash
lsof -i:3000
```
Should show Node.js process listening

### Check 2: Can you access from your own computer?
```bash
curl http://192.168.1.9:3000
```
Should return HTML (not connection refused)

### Check 3: Network connectivity
- Both devices must be on **same Wi-Fi**
- Try pinging your computer from the other device
- Check if router has AP isolation enabled (disable it)

### Check 4: Restart the dev server
Sometimes Vite needs a restart to properly bind to network:
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Restart
cd frontend-v2
npm run dev
```

## Common Fixes:

1. **Restart dev server** - Most common fix
2. **Check Wi-Fi network** - Both devices must be on same network
3. **Try different browser** - Sometimes browser cache causes issues
4. **Check router settings** - Some routers block device-to-device communication

## Still Not Working?

Run this diagnostic:
```bash
# Check server status
echo "=== Server Status ==="
lsof -i:3000
lsof -i:8000

# Check network binding
echo "=== Network Binding ==="
netstat -an | grep 3000

# Test local access
echo "=== Testing Access ==="
curl -I http://192.168.1.9:3000 2>&1 | head -3
```

Share the output if you need more help!

