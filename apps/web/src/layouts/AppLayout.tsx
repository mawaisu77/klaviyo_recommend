import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../store/auth";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/returns", label: "Returns" },
  { to: "/sync-errors", label: "Sync Errors" },
  { to: "/mappings", label: "Reason Mapping" },
  { to: "/integrations", label: "Integrations" },
];

export function AppLayout() {
  const { me, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">ReturnSense</div>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            {l.label}
          </NavLink>
        ))}
        <div style={{ marginTop: "auto", paddingTop: 20 }}>
          <div className="muted" style={{ padding: "0 12px 8px", fontSize: 12 }}>
            {me?.user.email}
          </div>
          <button className="nav-link" style={{ width: "100%", textAlign: "left" }} onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
