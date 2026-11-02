import { useState, useEffect, useRef, useCallback } from 'react';

export function getBaseWsUrl(url = '/ws/camera') {
  if (url.startsWith('ws://') || url.startsWith('wss://')) {
    return url;
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('visionface_backend_url');
    if (saved) {
      const clean = saved.replace(/^http/, 'ws').replace(/\/+$/, '');
      return `${clean}${url}`;
    }

    if (window.location.port === '5173' || window.location.port === '3000') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.hostname}:8000${url}`;
    }
  }

  const customWs = typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_BASE_URL;
  if (customWs) {
    return `${customWs.replace(/\/+$/, '')}${url}`;
  }

  const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:8000';
  return `${protocol}//${host}${url}`;
}

export function useWebSocket(url, onMessageCallback) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    const wsUrl = getBaseWsUrl(url);

    try {
      console.log(`[WebSocket] Connecting to ${wsUrl}...`);
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log(`[WebSocket] Connected successfully to ${wsUrl}`);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          setLastMessage(parsed);
          if (onMessageCallback) {
            onMessageCallback(parsed);
          }
        } catch (e) {
          console.warn('[WebSocket] Error parsing message:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (shouldReconnectRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 2000);
        }
      };

      ws.onerror = (err) => {
        console.warn('[WebSocket] Connection error:', err);
        ws.close();
      };
    } catch (err) {
      console.error('[WebSocket] Setup error:', err);
    }
  }, [url, onMessageCallback]);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((data) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  return { isConnected, lastMessage, sendMessage };
}
