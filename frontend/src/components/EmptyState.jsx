export default function EmptyState({ title, subtitle }) {
  return (
    <div className="empty-state">
      <h3 style={{ color: "var(--text-muted)" }}>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}
