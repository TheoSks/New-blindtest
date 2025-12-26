import { useEffect, useCallback } from 'react';
import socketManager from '@/lib/socket';

export function useSocket() {
  useEffect(() => {
    const socket = socketManager.connect();

    return () => {
      // Don't disconnect on unmount, keep connection alive
    };
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    socketManager.emit(event, data);
  }, []);

  const on = useCallback((event: string, callback: Function) => {
    socketManager.on(event, callback);
  }, []);

  const off = useCallback((event: string, callback: Function) => {
    socketManager.off(event, callback);
  }, []);

  return { emit, on, off, socket: socketManager.getSocket() };
}

export function useSocketEvent<T = unknown>(
  event: string,
  callback: (data: T) => void
) {
  const { on, off } = useSocket();

  useEffect(() => {
    on(event, callback);
    return () => off(event, callback);
  }, [event, callback, on, off]);
}
