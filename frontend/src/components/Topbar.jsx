import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { listNotifications, markNotificationRead } from "../services/api";
import { useAlertSound } from "../hooks/useAlertSound";

export default function Topbar({ title, wsConnected }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const { isMuted, setMuted } = useAlertSound();
  const [muted, setMutedState] = useState(isMuted());

  const refresh = () => listNotifications().then((r) => setNotifs(r.data)).catch(() => {});

  useEffect(() => {
    refresh();
    const handler = (event) => {
      const incoming = event.detail;
      if (!incoming) return;
      setNotifs((current) => [{ ...incoming, id: incoming.id || `ws-${Date.now()}`, is_read: false }, ...current].slice(0, 100));
    };
    window.addEventListener("bs:notification", handler);
    return () => window.removeEventListener("bs:notification", handler);
  }, []);

  const unread = notifs.filter((n) => !n.is_read).length;

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  const openRead = async (n) => {
    if (!n.is_read) {
      await markNotificationRead(n.id).catch(() => {});
      refresh();
    }
  };

  return (
    <header style={{
      height: 64, borderBottom: "1px solid var(--border)", display: "flex",
      alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0,
    }}>
      <div>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <span style={{ fontSize: 11, color: wsConnected ? "var(--risk-low)" : "var(--text-faint)" }}>
          ● {wsConnected ? "Live alerts connected" : "Connecting..."}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={toggleMute} title="Toggle alert sound">
          {muted ? "🔇 Muted" : "🔊 Alerts on"}
        </button>
        <div style={{ position: "relative" }}>
          <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={() => setOpen((o) => !o)}>
            🔔 {unread > 0 && <span className="badge badge-high" style={{ marginLeft: 4 }}>{unread}</span>}
          </button>
          {open && (
            <div className="card" style={{
              position: "absolute", right: 0, top: 42, width: 340, maxHeight: 380,
              overflowY: "auto", zIndex: 50, padding: 8,
            }}>
              {notifs.length === 0 && <EmptyRow />}
              {notifs.slice(0, 20).map((n) => (
                <div key={n.id} onClick={() => openRead(n)} style={{
                  padding: 10, borderRadius: 8, cursor: "pointer",
                  background: n.is_read ? "transparent" : "var(--surface-hover)", marginBottom: 4,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong style={{ fontSize: 12.5 }}>{n.title}</strong>
                    <span className="badge badge-neutral" style={{ fontSize: 10 }}>{n.type}</span>
                  </div>
                  <p style={{ fontSize: 12, margin: "4px 0 0" }}>{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%", background: "var(--surface-hover)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600,
          }}>{(user?.full_name || "?").slice(0, 1)}</div>
          <span style={{ fontSize: 13 }}>{user?.full_name}</span>
        </div>
        <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12.5 }}
          onClick={() => { logout(); navigate("/login"); }}>
          Logout
        </button>
      </div>
    </header>
  );
}

function EmptyRow() {
  return <p style={{ padding: 12, fontSize: 12.5 }}>No notifications yet.</p>;
}
