"use client";
import { useEffect, useState } from "react";
import { Printer, RefreshCw, Play, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectOption } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { PrintJob } from "@/types";

interface Stats { queued: number; printing: number; complete: number; error: number; }

export default function PrintQueuePage() {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission("MANAGE_PRINT");
  const [jobs, setJobs]     = useState<PrintJob[]>([]);
  const [stats, setStats]   = useState<Stats | null>(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading]   = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Per-job inline state for booklet number (on Start) and error reason (on Error)
  const [bookletInputs, setBookletInputs] = useState<Record<string, string>>({});
  const [errorInputs,   setErrorInputs]   = useState<Record<string, string>>({});
  // Track which job has the booklet/error inline expanded
  const [startExpanded, setStartExpanded] = useState<string | null>(null);
  const [errorExpanded, setErrorExpanded] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const [j, s] = await Promise.all([api.get(`/print-jobs${params}`), api.get("/print-jobs/stats")]);
      setJobs(j.data); setStats(s.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 10000);
    return () => clearInterval(id);
  }, [filter]);

  const updateStatus = async (id: string, status: string, extra?: Record<string, string>) => {
    setUpdating(id);
    try {
      await api.put(`/print-jobs/${id}/status`, { status, ...extra });
      setStartExpanded(null);
      setErrorExpanded(null);
      fetchData();
    } catch (e) { console.error(e); }
    finally { setUpdating(null); }
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Print Job Queue</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitor and manage IDP/ICMV booklet print jobs.</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-2 rounded border border-gray-300 text-sm font-medium hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Queued",   value: stats?.queued,   icon: Clock,        color: "#d97706" },
          { label: "Printing", value: stats?.printing, icon: Play,         color: "#2563eb" },
          { label: "Complete", value: stats?.complete, icon: CheckCircle2, color: "#006B3F" },
          { label: "Error",    value: stats?.error,    icon: XCircle,      color: "#dc2626" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className="w-8 h-8 shrink-0" style={{ color }} />
              <div>
                <p className="text-2xl font-bold text-gray-900">{value ?? "—"}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter + table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Printer className="w-4 h-4" style={{ color: "#1a3a6b" }} />
              Print Jobs
            </CardTitle>
            <div className="w-40">
              <Select value={filter} onValueChange={setFilter}>
                <SelectOption value="all">All Statuses</SelectOption>
                <SelectOption value="queued">Queued</SelectOption>
                <SelectOption value="printing">Printing</SelectOption>
                <SelectOption value="complete">Complete</SelectOption>
                <SelectOption value="error">Error</SelectOption>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading print jobs…</div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center">
              <Printer className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm text-gray-400">No print jobs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Job ID","Permit","Type","Status / Error","Reprint","Created","Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(j => (
                    <tr key={j.id} className="border-b border-gray-50 hover:bg-gray-50 align-top">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{j.id.slice(0, 8)}…</td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: "#1a3a6b" }}>{j.permit?.referenceNumber ?? j.permitId.slice(0, 8)}</td>
                      <td className="px-4 py-3"><span className="border border-gray-300 rounded px-1.5 py-0.5 text-xs">{j.permit?.permitType ?? "—"}</span></td>
                      <td className="px-4 py-3">
                        <StatusBadge status={j.status} />
                        {j.status === "error" && j.errorMessage && (
                          <p className="flex items-center gap-1 mt-1 text-xs text-red-600">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            {j.errorMessage}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">{j.isReprint ? <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-xs font-medium">Reprint</span> : "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(j.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {canManage && j.status === "queued" && (
                          startExpanded === j.id ? (
                            <div className="flex items-center gap-1.5">
                              <Input
                                className="h-7 w-28 text-xs font-mono"
                                placeholder="Booklet No."
                                value={bookletInputs[j.id] ?? ""}
                                onChange={e => setBookletInputs(p => ({ ...p, [j.id]: e.target.value }))}
                              />
                              <button
                                onClick={() => updateStatus(j.id, "printing", { bookletNumber: bookletInputs[j.id] ?? "" })}
                                disabled={updating === j.id || !bookletInputs[j.id]?.trim()}
                                className="px-2 py-1 rounded text-xs border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50 whitespace-nowrap"
                              >
                                {updating === j.id ? "…" : "Confirm"}
                              </button>
                              <button onClick={() => setStartExpanded(null)} className="px-1.5 py-1 rounded text-xs text-gray-400 hover:text-gray-700">✕</button>
                            </div>
                          ) : (
                            <button onClick={() => setStartExpanded(j.id)} className="px-2 py-1 rounded text-xs border border-blue-300 text-blue-700 hover:bg-blue-50">
                              Start
                            </button>
                          )
                        )}
                        {canManage && j.status === "printing" && (
                          <button onClick={() => updateStatus(j.id, "complete")} disabled={updating === j.id} className="px-2 py-1 rounded text-xs border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50">
                            {updating === j.id ? "…" : "Complete"}
                          </button>
                        )}
                        {canManage && (j.status === "queued" || j.status === "printing") && (
                          <div className="mt-1">
                            {errorExpanded === j.id ? (
                              <div className="flex items-center gap-1.5">
                                <Input
                                  className="h-7 w-32 text-xs"
                                  placeholder="Error reason…"
                                  value={errorInputs[j.id] ?? ""}
                                  onChange={e => setErrorInputs(p => ({ ...p, [j.id]: e.target.value }))}
                                />
                                <button
                                  onClick={() => updateStatus(j.id, "error", { errorMessage: errorInputs[j.id] ?? "" })}
                                  disabled={updating === j.id}
                                  className="px-2 py-1 rounded text-xs border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 whitespace-nowrap"
                                >
                                  {updating === j.id ? "…" : "Confirm"}
                                </button>
                                <button onClick={() => setErrorExpanded(null)} className="px-1.5 py-1 rounded text-xs text-gray-400 hover:text-gray-700">✕</button>
                              </div>
                            ) : (
                              <button onClick={() => setErrorExpanded(j.id)} className="px-2 py-1 rounded text-xs border border-red-300 text-red-700 hover:bg-red-50">
                                Error
                              </button>
                            )}
                          </div>
                        )}
                        {canManage && j.status === "error" && (
                          <button onClick={() => updateStatus(j.id, "queued")} disabled={updating === j.id} className="px-2 py-1 rounded text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                            Retry
                          </button>
                        )}
                      </td>
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
