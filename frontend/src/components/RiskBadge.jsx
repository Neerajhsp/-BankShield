export default function RiskBadge({ level, score, pulse }) {
  const cls = { LOW: "badge-low", MEDIUM: "badge-medium", HIGH: "badge-high" }[level] || "badge-neutral";
  return (
    <span className={`badge ${cls}`}>
      {pulse && level === "HIGH" && <span className="risk-pulse" aria-hidden="true" />}
      {level}{typeof score === "number" ? ` · ${score}/100` : ""}
    </span>
  );
}
