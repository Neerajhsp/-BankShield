import { NavLink } from "react-router-dom";

export default function Sidebar({ items, brandSub }) {
  return (
    <aside style={{
      width: 236, background: "var(--surface)", borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column", padding: "22px 14px", flexShrink: 0,
    }}>
      <div style={{ padding: "0 10px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)",
            fontWeight: 700, color: "#fff", fontSize: 14,
          }}>B</div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>BankShield</span>
        </div>
        <span style={{ fontSize: 11, color: "var(--text-faint)", paddingLeft: 36 }}>{brandSub}</span>
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={({ isActive }) => ({
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              borderRadius: 8, fontSize: 13.5, fontWeight: 500,
              color: isActive ? "#fff" : "var(--text-muted)",
              background: isActive ? "var(--accent)" : "transparent",
            })}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
