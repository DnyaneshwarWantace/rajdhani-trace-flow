import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_URL.replace('/api', '');

export interface ActivityLog {
  _id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  action: string;
  action_category: string;
  description: string;
  method: string;
  endpoint: string;
  status_code: number;
  response_time: number;
  target_resource?: string;
  target_resource_type?: string;
  changes?: Record<string, { old?: any; new?: any }>;
  metadata?: any;
  created_at: string;
  ip_address?: string;
}

export class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect(userEmail: string, userRole: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Connected to Socket.IO');
      
      // Join admin logs room if admin
      if (userRole === 'admin') {
        this.socket?.emit('join-admin-logs', {
          email: userEmail,
          role: userRole,
        });
      }
    });

    this.socket.on('joined-logs-room', (data: { success: boolean; error?: string }) => {
      if (data.success) {
        console.log('✅ Joined admin logs room');
      } else {
        console.warn('⚠️ Failed to join logs room:', data.error);
      }
    });

    this.socket.on('new-activity', (activityLog: ActivityLog) => {
      console.log('📨 New activity log:', activityLog);
      this.notifyListeners('new-activity', activityLog);
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from Socket.IO');
    });

    this.socket.on('error', (error: Error) => {
      console.error('❌ Socket.IO error:', error);
    });
  }

  disconnect(): void {
    if (this.socket && this.socket.connected) {
      try {
        this.socket.emit('leave-admin-logs');
        this.socket.disconnect();
      } catch (error) {
        console.warn('Error disconnecting socket:', error);
      }
      this.socket = null;
    }
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  private notifyListeners(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in socket listener:', error);
        }
      });
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export default SocketService;

