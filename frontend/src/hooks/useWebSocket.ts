import { useEffect, useRef, useState } from 'react';

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

  // WebSocket URL - для работы через nginx прокси используем текущий хост
  // nginx проксирует WebSocket запросы на backend
  const getWebSocketURL = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    // Если порт не указан, используем стандартные (80 для ws, 443 для wss)
    let port = window.location.port;
    if (!port) {
      port = window.location.protocol === 'https:' ? '443' : '80';
    }
    // Убираем порт для стандартных портов, чтобы избежать проблем
    const hostPort = (port === '80' || port === '443') ? host : `${host}:${port}`;
    return `${protocol}//${hostPort}/api/v1/rooms/${roomId}/ws?user_id=${userId}`;
  };
  const wsUrl = getWebSocketURL();

  const connect = () => {
    // Не подключаемся, если нет roomId или userId, или если отключено
    if (!roomId || !userId || !enabled) {
      return;
    }
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
          const data: WebSocketMessage = JSON.parse(event.data);
          
          if (data.type === 'match' && data.payload) {
            // Обработка уведомления о матче
            const matchNotification = data.payload as any;
            if (matchNotification.type === 'match' && matchNotification.match) {
              onMatch?.(matchNotification.match);
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
