# Local Development Setup - Running Both Frontends

This guide explains how to run both the old frontend and new frontend (frontend-v2) simultaneously on your local machine.

## Port Configuration

- **Old Frontend** (`frontend/`): Port 8080 (or 3000 if you've configured it differently)
- **New Frontend** (`frontend-v2/`): Port 3001

## Running Both Frontends

### Terminal 1: Old Frontend
```bash
cd frontend
npm install  # if needed
npm run dev
```
Access at: `http://localhost:8080` (or `http://localhost:3000`)

### Terminal 2: New Frontend (frontend-v2)
```bash
cd frontend-v2
npm install  # if needed
npm run dev
```
Access at: `http://localhost:3001`

## Network Access

The new frontend (frontend-v2) is configured to be accessible on your local network:

- **Local access**: `http://localhost:3001`
- **Network access**: `http://YOUR_IP_ADDRESS:3001` (e.g., `http://192.168.1.100:3001`)

To find your IP address:
- **Mac/Linux**: Run `ifconfig` or `ip addr` and look for your local network IP
- **Windows**: Run `ipconfig` and look for IPv4 Address

## API Configuration

Make sure your backend is running and accessible. The frontend-v2 uses the API URL from:
- Environment variable: `VITE_API_URL` (defaults to `/api` if not set)
- Check `.env` file in `frontend-v2/` directory

## Troubleshooting

### Port Already in Use
If port 3001 is already in use, Vite will automatically try the next available port (3002, 3003, etc.). Check the terminal output for the actual port.

### Cannot Access from Network
1. Check your firewall settings
2. Make sure both devices are on the same network
3. Verify the IP address is correct

### API Connection Issues
1. Ensure backend is running on the expected port (usually 8000)
2. Check `VITE_API_URL` in `.env` file
3. Verify CORS settings in backend allow your frontend URLs

