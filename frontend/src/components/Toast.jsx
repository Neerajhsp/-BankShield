import { useEffect } from "react";

export default function Toast({ toasts, onDismiss }) {
  return (
    <div style={{
      position: "fixed", top: 16, right: 16, zIndex: 1000,
      display: "flex", flexDirection: "column", gap: 8, maxWidth: 360,
    }}>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 6000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const border = toast.type === "error" ? "var(--risk-high)"
    : toast.type === "fraud" ? "var(--risk-high)"
    : toast.type === "success" ? "var(--risk-low)" : "var(--accent)";

  return (
    <div className="card" style={{ borderLeft: `3px solid ${border}`, padding: 14, cursor: "pointer" }}
      onClick={() => onDismiss(toast.id)}>
      <strong style={{ fontSize: 13.5 }}>{toast.title}</strong>
      {toast.message && <p style={{ margin: "4px 0 0", fontSize: 13 }}>{toast.message}</p>}
    </div>
  );
}
