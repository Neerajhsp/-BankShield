export default function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(5,8,14,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 900,
      }}
      onClick={onClose}
    >
      <div className="card" style={{ width: 440, maxWidth: "92vw" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="btn-ghost btn" style={{ padding: "4px 10px" }} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div>{children}</div>
        {footer && <div style={{ marginTop: 18, display: "flex", gap: 10, justifyContent: "flex-end" }}>{footer}</div>}
      </div>
    </div>
  );
}
