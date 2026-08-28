const STATUS_STYLES = {
  COMPLETED: "badge-low",
  PENDING: "badge-neutral",
  FAILED: "badge-high",
  FLAGGED: "badge-medium",
  ON_HOLD: "badge-medium",
  BLOCKED: "badge-high",
  OPEN: "badge-medium",
  UNDER_REVIEW: "badge-accent",
  RESOLVED: "badge-low",
  FALSE_POSITIVE: "badge-neutral",
};

export default function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_STYLES[status] || "badge-neutral"}`}>{status}</span>;
}
