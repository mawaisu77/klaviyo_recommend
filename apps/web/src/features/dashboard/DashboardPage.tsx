import { useQuery } from "@tanstack/react-query";
import { endpoints } from "../../api/endpoints";
import { formatMoney } from "../../lib/format";

export function DashboardPage() {
  const summary = useQuery({ queryKey: ["summary"], queryFn: endpoints.summary });
  const reasons = useQuery({ queryKey: ["reasons"], queryFn: endpoints.reasons });

  const s = summary.data;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <StatCard label="Total returns" value={String(s?.totalReturns ?? 0)} />
        <StatCard label="Returned items" value={String(s?.totalReturnedItems ?? 0)} />
        <StatCard
          label="Returned value"
          value={formatMoney(s?.totalReturnedValue ?? 0)}
        />
        <StatCard label="Events synced" value={String(s?.eventsSuccess ?? 0)} />
        <StatCard label="Events failed" value={String(s?.eventsFailed ?? 0)} />
      </div>

      <div className="grid grid-2">
        <BreakdownCard
          title="Top return categories"
          rows={reasons.data?.byCategory ?? []}
        />
        <BreakdownCard title="Top returned products" rows={reasons.data?.topProducts ?? []} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className="stat">{value}</div>
    </div>
  );
}

function BreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ key: string; count: number }>;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="card">
      <h2 className="card-title">{title}</h2>
      {rows.length === 0 ? (
        <p className="muted">No data yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {rows.map((r) => (
            <div key={r.key}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span>{r.key}</span>
                <span className="muted">{r.count}</span>
              </div>
              <div style={{ background: "#eef0f4", borderRadius: 6, height: 8 }}>
                <div
                  style={{
                    width: `${(r.count / max) * 100}%`,
                    background: "var(--primary)",
                    height: 8,
                    borderRadius: 6,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
