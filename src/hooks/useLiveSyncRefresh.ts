import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import SocketService, { type DataChangeEvent } from '@/services/socketService';

interface UseLiveSyncRefreshOptions {
  modules: DataChangeEvent['module'][];
  onRefresh: () => void;
  pollingMs?: number;
}

export const useLiveSyncRefresh = ({
  modules,
  onRefresh,
  pollingMs = 6000,
}: UseLiveSyncRefreshOptions) => {
  const { user } = useAuth();
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const refreshRef = useRef(onRefresh);
  const modulesRef = useRef(modules);
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    modulesRef.current = modules;
  }, [modules]);

  useEffect(() => {
    if (!user?.email || !user?.role) return;

    const socketService = SocketService.getInstance();
    socketService.connect(user.email, user.role);
    setIsSocketConnected(socketService.isConnected());

    const handleDataChanged = (event: DataChangeEvent) => {
      const activeModules = modulesRef.current;
      if (!activeModules.includes(event.module) && !activeModules.includes('system')) return;
      if (document.visibilityState !== 'visible') return;

      const now = Date.now();
      // Prevent duplicate refresh bursts when multiple writes happen quickly.
      if (now - lastRefreshAtRef.current < 400) return;
      lastRefreshAtRef.current = now;
      refreshRef.current();
    };

    const handleConnectionChange = ({ connected }: { connected: boolean }) => {
      setIsSocketConnected(Boolean(connected));
    };

    socketService.on('data-changed', handleDataChanged);
    socketService.on('connection-change', handleConnectionChange);

    return () => {
      socketService.off('data-changed', handleDataChanged);
      socketService.off('connection-change', handleConnectionChange);
    };
  }, [user?.email, user?.role]);

  useEffect(() => {
    if (isSocketConnected) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      refreshRef.current();
    }, pollingMs);

    return () => window.clearInterval(interval);
  }, [isSocketConnected, pollingMs]);

  return { isSocketConnected };
};

