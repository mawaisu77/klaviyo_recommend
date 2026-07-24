import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { endpoints } from "../../api/endpoints";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { formatDate, formatMoney } from "../../lib/format";

export function ReturnsActivityPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["returns", page],
    queryFn: () => endpoints.returns(page),
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Returns activity</h1>
      </div>

      {isLoading ? (
        <p className="muted">Loading...</p>
      ) : !data || data.items.length === 0 ? (
        <div className="empty">No returns synced yet. They will appear here as Shopify sends webhooks.</div>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Value</th>
                <th>Status</th>
                <th>Sync</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id}>
                  <td>{formatDate(r.returnCreatedAt)}</td>
                  <td>
                    <Link to={`/returns/${r.id}`}>{r.orderNumber ?? r.shopifyReturnId}</Link>
                  </td>
                  <td>{r.customerEmail ?? "-"}</td>
                  <td>{r.itemCount}</td>
                  <td>{formatMoney(r.totalReturnedValue, r.currency)}</td>
                  <td>{r.status}</td>
                  <td>
                    <StatusBadge status={r.syncStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={page}
            total={data.total}
            pageSize={data.pageSize}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}

function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
      <button className="btn btn-secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Prev
      </button>
      <span className="muted">
        Page {page} of {pages}
      </span>
      <button
        className="btn btn-secondary"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
