export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "success" || status === "active" || status === "connected"
      ? "badge-success"
      : status === "failed" || status === "expired"
        ? "badge-failed"
        : "badge-pending";
  return <span className={`badge ${cls}`}>{status}</span>;
}
