import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { connectRealtime, disconnectRealtime, subscribeRealtime, isRealtimeConnected } from '../mockApi';

type EventHandler = (data: any) => void;

const POLL_INTERVAL_MS = 30000;

export function useRealtime() {
  const { token, user } = useAuth();
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!token || !user) {
      disconnectRealtime();
      connectedRef.current = false;
      return;
    }

    if (!connectedRef.current) {
      connectRealtime(token);
      connectedRef.current = true;
    }

    return () => {
      disconnectRealtime();
      connectedRef.current = false;
    };
  }, [token, user]);

  const subscribe = useCallback((event: string, handler: EventHandler): (() => void) => {
    return subscribeRealtime(event, handler);
  }, []);

  return { subscribe, isConnected: isRealtimeConnected() };
}

export function useRealtimeEvent(event: string, handler: EventHandler, deps: any[] = []) {
  const { subscribe } = useRealtime();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const wrappedHandler = (data: any) => handlerRef.current(data);
    return subscribe(event, wrappedHandler);
  }, [event, subscribe, ...deps]);
}

export function useRealtimeRefresh(events: string[], refreshFn: () => void) {
  const { subscribe } = useRealtime();
  const refreshRef = useRef(refreshFn);
  refreshRef.current = refreshFn;
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    const eventList = Array.from(new Set(['connected', ...(eventsRef.current || [])]));
    const unsubs = eventList.map(event =>
      subscribe(event, () => {
        setTimeout(() => refreshRef.current(), 100);
      })
    );
    const interval = setInterval(() => {
      if (!isRealtimeConnected()) {
        refreshRef.current();
      }
    }, POLL_INTERVAL_MS);
    return () => {
      unsubs.forEach(unsub => unsub());
      clearInterval(interval);
    };
  }, [subscribe]);
}
