import { useEffect, useCallback, useRef, useState } from 'react';
import Ably from 'ably';
import { useAuthStore } from '@/stores/authStore';

const ABLY_API_KEY = import.meta.env.VITE_ABLY_API_KEY;

export function useAbly() {
  const { guestName, user } = useAuthStore();
  const clientRef = useRef<Ably.Realtime | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const clientId = user?.id || guestName || `guest-${Date.now()}`;

  useEffect(() => {
    if (!ABLY_API_KEY) {
      console.warn('Ably API key not configured');
      return;
    }

    const client = new Ably.Realtime({
      key: ABLY_API_KEY,
      clientId,
    });

    client.connection.on('connected', () => {
      console.log('Ably connected');
      setIsConnected(true);
    });

    client.connection.on('disconnected', () => {
      console.log('Ably disconnected');
      setIsConnected(false);
    });

    clientRef.current = client;

    return () => {
      client.close();
    };
  }, [clientId]);

  const getChannel = useCallback((channelName: string) => {
    if (!clientRef.current) return null;
    return clientRef.current.channels.get(channelName);
  }, []);

  const publish = useCallback(
    (channelName: string, eventName: string, data: unknown) => {
      const channel = getChannel(channelName);
      if (channel) {
        channel.publish(eventName, data);
      }
    },
    [getChannel]
  );

  const subscribe = useCallback(
    (
      channelName: string,
      eventName: string,
      callback: (message: Ably.Message) => void
    ) => {
      const channel = getChannel(channelName);
      if (channel) {
        channel.subscribe(eventName, callback);
        return () => channel.unsubscribe(eventName, callback);
      }
      return () => {};
    },
    [getChannel]
  );

  const enterPresence = useCallback(
    (channelName: string, data: unknown) => {
      const channel = getChannel(channelName);
      if (channel) {
        channel.presence.enter(data);
      }
    },
    [getChannel]
  );

  const leavePresence = useCallback(
    (channelName: string) => {
      const channel = getChannel(channelName);
      if (channel) {
        channel.presence.leave();
      }
    },
    [getChannel]
  );

  const getPresence = useCallback(
    async (channelName: string) => {
      const channel = getChannel(channelName);
      if (channel) {
        return channel.presence.get();
      }
      return [];
    },
    [getChannel]
  );

  const subscribePresence = useCallback(
    (
      channelName: string,
      callback: (member: Ably.PresenceMessage) => void
    ) => {
      const channel = getChannel(channelName);
      if (channel) {
        channel.presence.subscribe(callback);
        return () => channel.presence.unsubscribe(callback);
      }
      return () => {};
    },
    [getChannel]
  );

  return {
    client: clientRef.current,
    isConnected,
    clientId,
    getChannel,
    publish,
    subscribe,
    enterPresence,
    leavePresence,
    getPresence,
    subscribePresence,
  };
}
