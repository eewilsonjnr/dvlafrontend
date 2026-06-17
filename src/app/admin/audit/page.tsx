"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, RefreshCw, Search, Download } from "lucide-react";
import api from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { AuditLog } from "@/types";

export default function AuditLogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = usePermissions();

  useEffect(() => {
    if (!hasPermission("VIEW_AUDIT_LOGS")) router.replace("/admin/dashboard");
  }, []);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const canExport = hasPermission("EXPORT_AUDIT");

  const handleExport = async () => {
    try {
      const params = actionFilter ? `?action=${encodeURIComponent(actionFilter)}` : "";
      const response = await api.get(`/admin/audit-logs/export${params}`, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { setMsg({ type: "error", text: "Export failed." }); }
  };

  const operatorId = searchParams.get("operatorId");

  const fetch = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (actionFilter) qs.set("action", actionFilter);
      if (operatorId)   qs.set("operatorId", operatorId);
      const r = await api.get(`/admin/audit-logs${qs.toString() ? `?${qs}` : ""}`);
      setLogs(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const filtered = logs.filter(l =>
    !actionFilter || l.action.toLowerCase().includes(actionFilter.toLowerCase())
  );

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">Full system activity trail for compliance and investigation.</p>
        </div>
        <div className="flex gap-2">
          {canExport && (
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded border border-gray-300 text-sm font-medium hover:bg-gray-50">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          )}
          <button onClick={fetch} className="flex items-center gap-1.5 px-3 py-2 rounded border border-gray-300 text-sm font-medium hover:bg-gray-50">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {msg && (
        <div className={`p-3 rounded text-sm ${msg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input className="pl-9" placeholder="Filter by action…" value={actionFilter} onChange={e => setActionFilter(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardList className="w-4 h-4" style={{ color: "#1a3a6b" }} />
            {filtered.length} Event{filtered.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading audit logs…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm text-gray-400">No audit events found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Timestamp","Operator","Action","Outcome","Applicant Ref","IP Address","Details"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(log => (
                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-900">{log.operatorName ?? "—"}</td>
                      <td className="px-4 py-3 text-xs font-mono">{log.action.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3"><StatusBadge status={log.outcome} /></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{log.applicantRef ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{log.ipAddress ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{log.details ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
