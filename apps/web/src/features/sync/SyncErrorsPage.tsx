import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { endpoints } from "../../api/endpoints";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/toast";
import { formatDate } from "../../lib/format";

export function SyncErrorsPage() {
  const qc = useQueryClient();
  const { notify } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ["sync-jobs", "failed"],
    queryFn: () => endpoints.syncJobs("failed"),
  });

  const retry = async (jobId: string) => {
    try {
      await endpoints.retrySyncJob(jobId);
      notify("Retry queued");
      await qc.invalidateQueries({ queryKey: ["sync-jobs", "failed"] });
      await qc.invalidateQueries({ queryKey: ["returns"] });
    } catch (err) {
      notify(err instanceof Error ? err.message : "Retry failed", "error");
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Sync errors</h1>
      </div>

      {isLoading ? (
        <p className="muted">Loading...</p>
      ) : !data || data.items.length === 0 ? (
        <div className="empty">No failed sync jobs. Everything is healthy.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Return</th>
              <th>Attempts</th>
              <th>Error</th>
              <th>When</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((job) => (
              <tr key={job.id}>
                <td>{job.eventType}</td>
                <td>
                  <Link to={`/returns/${job.returnId}`}>{job.returnId.slice(0, 8)}</Link>
                </td>
                <td>{job.attemptCount}</td>
                <td className="muted" style={{ maxWidth: 320 }}>
                  {job.errorMessage ?? "-"}
                </td>
                <td>{formatDate(job.processedAt ?? job.createdAt)}</td>
                <td>
                  <button className="btn btn-secondary" onClick={() => void retry(job.id)}>
                    Retry
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
