import type { ReactNode } from "react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="card" style={{ width: 380 }}>
        {children}
      </div>
    </div>
  );
}
