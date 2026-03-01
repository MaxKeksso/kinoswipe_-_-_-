import { useEffect, useRef, useState } from 'react';
import { authStorage } from '../api/api';

export interface WebSocketMessage {
  type: string;
  payload?: any;
  timestamp: number;
}

export interface UseWebSocketOptions {
  roomId: string;
  userId: string;
  onMessage?: (message: WebSocketMessage) => void;
  onMatch?: (match: any) => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
}

export const useWebSocket = ({
  roomId,
  userId,
  onMessage,
  onMatch,
  onError,
  enabled = true,
}: UseWebSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket URL: user_id (обязательно) + token (для авторизации, fallback на X-User-ID на бэкенде)
  const getWebSocketURL = (rid: string, uid: string) => {
    if (!rid || !uid) return '';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    let port = window.location.port;
    if (!port) port = window.location.protocol === 'https:' ? '443' : '80';
    const hostPort = (port === '80' || port === '443') ? host : `${host}:${port}`;
    let url = `${protocol}//${hostPort}/api/v1/rooms/${rid}/ws?user_id=${encodeURIComponent(uid)}`;
    const token = authStorage.getAccessToken();
    if (token) {
      url += `&token=${encodeURIComponent(token)}`;
    }
    return url;
  };

  const connect = () => {
    if (!roomId || !userId || !enabled) return;
    const wsUrl = getWebSocketURL(roomId, userId);
    if (!wsUrl) return;
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setReconnectAttempts(0);
      };

      ws.onmessage = (event) => {
        try {
          const raw = typeof event.data === 'string' ? event.data : '';
          if (!raw) return;
          const data: WebSocketMessage = JSON.parse(raw);
          if (!data || typeof data !== 'object') return;

          // Прямой формат от BroadcastMatch: { type: "match", match: {...} }
          if (data.type === 'match') {
            const match = (data as { match?: unknown }).match;
            if (match && typeof match === 'object' && (match as { id?: string }).id) {
              onMatch?.(match);
            }
          }
          // Обёрнутый формат от broadcastToRoom: { type: "broadcast", payload: { type: "match", match: {...} } }
          if (data.type === 'broadcast') {
            const payload = (data as { payload?: unknown }).payload;
            if (payload && typeof payload === 'object' && (payload as Record<string, unknown>)['type'] === 'match') {
              const match = (payload as Record<string, unknown>)['match'];
              if (match && typeof match === 'object' && (match as { id?: string }).id) {
                onMatch?.(match);
              }
            }
          }

          onMessage?.(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Попытка переподключения (максимум 5 попыток)
        if (reconnectAttempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts((prev) => prev + 1);
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      onError?.(error as Event);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  };

  useEffect(() => {
    if (roomId && userId && enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId, enabled]);

  return {
    isConnected,
    send: (data: any) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(data));
      }
    },
    disconnect,
  };
};
