import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { endpoints } from "../../api/endpoints";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/toast";
import { formatDate, formatMoney } from "../../lib/format";

export function ReturnDetailsPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const { notify } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ["return", id],
    queryFn: () => endpoints.returnDetail(id),
  });

  const retry = async (jobId: string) => {
    try {
      await endpoints.retrySyncJob(jobId);
      notify("Retry queued");
      await qc.invalidateQueries({ queryKey: ["return", id] });
    } catch (err) {
      notify(err instanceof Error ? err.message : "Retry failed", "error");
    }
  };

  if (isLoading) return <p className="muted">Loading...</p>;
  if (!data) return <div className="empty">Return not found.</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/returns" className="muted">
            &larr; Back to returns
          </Link>
          <h1 className="page-title">Return {data.orderNumber ?? data.shopifyReturnId}</h1>
        </div>
        <StatusBadge status={data.syncStatus} />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="grid grid-3">
          <Info label="Customer" value={data.customerEmail ?? "-"} />
          <Info label="Status" value={data.status} />
          <Info label="Total" value={formatMoney(data.totalReturnedValue, data.currency)} />
          <Info label="Shopify order" value={data.shopifyOrderId} />
          <Info label="Shopify return" value={data.shopifyReturnId} />
          <Info label="Created" value={formatDate(data.returnCreatedAt)} />
        </div>
      </div>

      <h2 className="card-title" style={{ marginBottom: 8 }}>
        Items
      </h2>
      <table style={{ marginBottom: 24 }}>
        <thead>
          <tr>
            <th>Product</th>
            <th>Variant</th>
            <th>SKU</th>
            <th>Qty</th>
            <th>Reason</th>
            <th>Category</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((it) => (
            <tr key={it.id}>
              <td>{it.title}</td>
              <td>{it.variantTitle ?? "-"}</td>
              <td>{it.sku ?? "-"}</td>
              <td>{it.quantity}</td>
              <td>{it.reason}</td>
              <td>{it.marketingCategory}</td>
              <td>{formatMoney(it.returnedValue, data.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="card-title" style={{ marginBottom: 8 }}>
        Sync attempts
      </h2>
      {data.syncJobs.length === 0 ? (
        <div className="empty">No sync attempts recorded.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Status</th>
              <th>Attempts</th>
              <th>Klaviyo event</th>
              <th>Error</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.syncJobs.map((job) => (
              <tr key={job.id}>
                <td>{job.eventType}</td>
                <td>
                  <StatusBadge status={job.status} />
                </td>
                <td>{job.attemptCount}</td>
                <td style={{ maxWidth: 200, wordBreak: "break-all" }}>
                  {job.klaviyoEventId ?? "-"}
                </td>
                <td className="muted" style={{ maxWidth: 220 }}>
                  {job.errorMessage ?? "-"}
                </td>
                <td>
                  {job.status === "failed" && (
                    <button className="btn btn-secondary" onClick={() => void retry(job.id)}>
                      Retry
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div style={{ fontWeight: 600, wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}
