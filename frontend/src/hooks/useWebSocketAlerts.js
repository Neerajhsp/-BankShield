import { useEffect, useRef, useState } from "react";
import { useAlertSound } from "./useAlertSound";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000";

/**
 * Connects to /ws/alerts with the current JWT, plays the alert beep
 * and surfaces live notification/fraud events to the caller. No page
 * refresh required — matches spec section 10/11.
 */
export function useWebSocketAlerts(onEvent) {
  const [connected, setConnected] = useState(false);
  const { playBeep } = useAlertSound();
  const wsRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("bs_token");
    if (!token) return undefined;

    let cancelled = false;
    let retryTimer = null;

    function connect() {
      const ws = new WebSocket(`${WS_URL}/ws/alerts?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => !cancelled && setConnected(true);
      ws.onclose = () => {
        if (cancelled) return;
        setConnected(false);
        retryTimer = setTimeout(connect, 3000); // WebSocket disconnect -> auto-reconnect
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === "notification") {
            if (data.notification?.type === "FRAUD") playBeep();
            onEvent && onEvent(data.notification);
            window.dispatchEvent(new CustomEvent("bs:notification", { detail: data.notification }));
          }
        } catch (e) {
          console.warn("Malformed alert payload", e);
        }
      };
    }

    connect();
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { connected };
}
