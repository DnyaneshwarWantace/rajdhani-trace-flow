# Network Access Troubleshooting Guide

If other devices on your network can't access the frontend, follow these steps:

## 1. Check if Server is Running

Make sure the frontend dev server is running:
```bash
cd frontend-v2
npm run dev
```

You should see output like:
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.1.9:3000/
```

## 2. Check macOS Firewall

### Option A: Disable Firewall Temporarily (for testing)
1. Open **System Settings** (or System Preferences on older macOS)
2. Go to **Network** → **Firewall**
3. Turn off firewall temporarily to test
4. Try accessing from another device

### Option B: Allow Node.js Through Firewall
1. Open **System Settings** → **Network** → **Firewall** → **Options**
2. Click **+** to add an application
3. Navigate to `/usr/local/bin/node` or wherever Node.js is installed
4. Set it to **Allow incoming connections**
5. Click **OK**

### Option C: Allow Port 3000 via Terminal
```bash
# Check firewall status
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# If firewall is on, you may need to allow Node.js
# Or temporarily disable it for testing:
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off
```

## 3. Verify Network IP

Find your computer's IP address:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

You should see something like:
```
inet 192.168.1.9 netmask 0xffffff00 broadcast 192.168.1.255
```

Use this IP address (192.168.1.9 in this example) to access from other devices.

## 4. Test from Another Device

1. Make sure both devices are on the **same Wi-Fi network**
2. From another device, open browser and go to:
   ```
   http://192.168.1.9:3000
   ```
   (Replace 192.168.1.9 with your actual IP)

## 5. Check Backend is Also Accessible

The backend must also be running and accessible:
```bash
cd backend
npm start
```

The backend should be running on port 8000. The frontend will automatically connect to:
- `http://YOUR_IP:8000/api` when accessed via network IP
- `https://rajdhani.wantace.com/api` when accessed via localhost

## 6. Common Issues

### "Site can't be reached" or "Connection refused"
- **Firewall blocking**: Disable firewall temporarily or allow Node.js
- **Wrong IP**: Verify the IP address with `ifconfig`
- **Different network**: Make sure both devices are on same Wi-Fi
- **Server not running**: Check if `npm run dev` is still running

### "CORS error" or "Access control" error
- Backend CORS is already configured to allow all origins in development
- Make sure backend is running on port 8000
- Check backend logs for CORS errors

### Port already in use
- Kill the process: `lsof -ti:3000 | xargs kill -9`
- Or use a different port in `vite.config.ts`

## 7. Quick Test Commands

```bash
# Check if port 3000 is listening
lsof -i:3000

# Check if port 8000 (backend) is listening
lsof -i:8000

# Test connection from same machine
curl http://192.168.1.9:3000

# Check firewall status
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
```

## 8. Alternative: Use ngrok for Testing

If firewall issues persist, you can use ngrok to create a public tunnel:

```bash
# Install ngrok
brew install ngrok

# Create tunnel
ngrok http 3000
```

This will give you a public URL that works from anywhere (useful for testing).

