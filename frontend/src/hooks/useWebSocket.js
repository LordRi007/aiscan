import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket(url, onMessageCallback) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    // Determine ws protocol and host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // When running under Vite dev server (port 5173 or 3000), connect directly to FastAPI port 8000
    // to bypass Vite's dev server proxy which drops high-throughput video frames
    const isDev = window.location.port === '5173' || window.location.port === '3000';
    const customWs = typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_BASE_URL;
    const host = isDev ? `${window.location.hostname}:8000` : window.location.host;
    const wsUrl = url.startsWith('ws') ? url : (customWs ? `${customWs}${url}` : `${protocol}//${host}${url}`);

    try {
      console.log(`[WebSocket] Connecting directly to ${wsUrl}...`);
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
