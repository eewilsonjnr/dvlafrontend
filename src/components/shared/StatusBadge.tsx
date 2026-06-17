export function statusClass(status: string): string {
  const map: Record<string, string> = {
    submitted:   "bg-yellow-100 text-yellow-800",
    processing:  "bg-blue-100 text-blue-800",
    issued:      "bg-green-100 text-green-800",
    approved:    "bg-green-100 text-green-800",
    rejected:    "bg-red-100 text-red-800",
    queued:      "bg-yellow-100 text-yellow-800",
    printing:    "bg-blue-100 text-blue-800",
    complete:    "bg-green-100 text-green-800",
    printed:     "bg-green-100 text-green-800",
    error:       "bg-red-100 text-red-800",
    encoded:     "bg-green-100 text-green-800",
    pending:     "bg-gray-100 text-gray-700",
    failed:      "bg-red-100 text-red-800",
    pass:        "bg-green-100 text-green-800",
    fail:        "bg-red-100 text-red-800",
    not_verified:"bg-gray-100 text-gray-700",
    draft:       "bg-gray-100 text-gray-700",
    success:     "bg-green-100 text-green-800",
    failure:     "bg-red-100 text-red-800",
    warning:     "bg-yellow-100 text-yellow-800",
  };
  return map[status] ?? "bg-gray-100 text-gray-700";
}
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize ${statusClass(status)}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
