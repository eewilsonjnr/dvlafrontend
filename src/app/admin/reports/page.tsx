"use client";
import { useEffect, useState, useCallback } from "react";
import {
  BarChart2, Download, RefreshCw, FileText,
  TrendingUp, AlertTriangle, Building2,
} from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectOption } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SummaryData {
  total: number;
  byStatus: {
    draft: number; submitted: number; approved: number;
    printed: number; issued: number; rejected: number;
  };
}

interface ThroughputRow { date: string; idp: number; icmv: number; total: number }
interface ThroughputData { total: number; rows: ThroughputRow[] }

interface ExpiringRow {
  id: string;
  referenceNumber: string;
  permitType: string;
  dateOfExpiry: string;
  applicant: { surname: string; otherNames: string; licenceNumber: string | null };
  issuingOffice: { name: string; regionName: string | null } | null;
}
interface ExpiringData { total: number; rows: ExpiringRow[] }

interface OfficeRow {
  office: { id: string; name: string; type: string; regionName: string | null; town: string | null };
  total: number; issued: number; rejected: number; pending: number;
}
interface OfficeData { total: number; rows: OfficeRow[] }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border px-4 py-3" style={{ borderColor: "#e2e8f0" }}>
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`text-2xl font-black ${color}`}>{value.toLocaleString()}</span>
    </div>
  );
}

type Tab = "summary" | "throughput" | "expiring" | "office";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("summary");

  // shared filters
  const [from, setFrom] = useState(daysAgo(30));
  const [to,   setTo]   = useState(today());
  const [type, setType] = useState("all");
  const [days, setDays] = useState("90");

  // report data
  const [summary,    setSummary]    = useState<SummaryData | null>(null);
  const [throughput, setThroughput] = useState<ThroughputData | null>(null);
  const [expiring,   setExpiring]   = useState<ExpiringData | null>(null);
  const [office,     setOffice]     = useState<OfficeData | null>(null);
  const [loading,    setLoading]    = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "summary") {
        const p = new URLSearchParams({ from, to, ...(type !== "all" ? { type } : {}) });
        const r = await api.get(`/reports/summary?${p}`);
        setSummary(r.data);
      } else if (tab === "throughput") {
        const p = new URLSearchParams({ from, to, ...(type !== "all" ? { type } : {}) });
        const r = await api.get(`/reports/throughput?${p}`);
        setThroughput(r.data);
      } else if (tab === "expiring") {
        const p = new URLSearchParams({ days, ...(type !== "all" ? { type } : {}) });
        const r = await api.get(`/reports/expiring?${p}`);
        setExpiring(r.data);
      } else if (tab === "office") {
        const p = new URLSearchParams({ from, to });
        const r = await api.get(`/reports/office?${p}`);
        setOffice(r.data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [tab, from, to, type, days]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExport = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    let url = `${base}/reports/export?report=`;
    if (tab === "summary")    url += `summary&from=${from}&to=${to}${type !== "all" ? `&type=${type}` : ""}`;
    if (tab === "expiring")   url += `expiring&days=${days}${type !== "all" ? `&type=${type}` : ""}`;
    if (tab === "office")     url += `office&from=${from}&to=${to}`;
    if (tab === "throughput") { alert("Use the summary or expiring export for CSV."); return; }
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", "");
    // inject auth header via fetch blob workaround
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(b => { a.href = URL.createObjectURL(b); a.click(); });
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "summary",    label: "Permit Summary",        icon: FileText     },
    { id: "throughput", label: "Production Throughput", icon: TrendingUp   },
    { id: "expiring",   label: "Expiring Permits",      icon: AlertTriangle },
    { id: "office",     label: "Office Performance",    icon: Building2    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#0a1f44" }}>
            <BarChart2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Reports</h1>
            <p className="text-sm text-slate-500">Permit and production analytics</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          {tab !== "throughput" && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white transition"
              style={{ background: "#006B3F" }}
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? "border-yellow-400 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        {tab !== "expiring" && (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">From</label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="text-sm w-36" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">To</label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="text-sm w-36" />
            </div>
          </>
        )}
        {tab === "expiring" && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Expiry window</label>
            <Select value={days} onValueChange={setDays}>
              <SelectOption value="30">Next 30 days</SelectOption>
              <SelectOption value="60">Next 60 days</SelectOption>
              <SelectOption value="90">Next 90 days</SelectOption>
              <SelectOption value="180">Next 180 days</SelectOption>
            </Select>
          </div>
        )}
        {tab !== "office" && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Permit type</label>
            <Select value={type} onValueChange={setType}>
              <SelectOption value="all">All types</SelectOption>
              <SelectOption value="IDP">IDP</SelectOption>
              <SelectOption value="ICMV">ICMV</SelectOption>
            </Select>
          </div>
        )}
      </div>

      {/* ── Summary ── */}
      {tab === "summary" && (
        <div className="space-y-5">
          {loading && <p className="text-sm text-slate-400 animate-pulse">Loading…</p>}
          {summary && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                <StatCard label="Total"     value={summary.total}                color="text-slate-900" />
                <StatCard label="Draft"     value={summary.byStatus.draft}       color="text-slate-500" />
                <StatCard label="Submitted" value={summary.byStatus.submitted}   color="text-amber-600" />
                <StatCard label="Approved"  value={summary.byStatus.approved}    color="text-blue-600"  />
                <StatCard label="Printed"   value={summary.byStatus.printed}     color="text-purple-600"/>
                <StatCard label="Issued"    value={summary.byStatus.issued}      color="text-green-600" />
                <StatCard label="Rejected"  value={summary.byStatus.rejected}    color="text-red-600"   />
              </div>

              {/* Bar chart (pure CSS) */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Status Distribution</CardTitle></CardHeader>
                <CardContent>
                  {summary.total === 0 ? (
                    <p className="text-sm text-slate-400">No permits in selected range.</p>
                  ) : (
                    <div className="space-y-3">
                      {(["issued","approved","submitted","printed","rejected","draft"] as const).map(s => {
                        const count = summary.byStatus[s];
                        const pct = summary.total ? Math.round((count / summary.total) * 100) : 0;
                        const colors: Record<string, string> = {
                          issued: "#22c55e", approved: "#3b82f6", submitted: "#f59e0b",
                          printed: "#8b5cf6", rejected: "#ef4444", draft: "#9ca3af",
                        };
                        return (
                          <div key={s} className="flex items-center gap-3">
                            <span className="w-20 text-xs font-semibold capitalize text-slate-600 text-right">{s}</span>
                            <div className="flex-1 h-5 rounded bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded transition-all duration-500"
                                style={{ width: `${pct}%`, background: colors[s] }}
                              />
                            </div>
                            <span className="w-12 text-xs text-slate-500 text-right">{count} ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── Throughput ── */}
      {tab === "throughput" && (
        <div className="space-y-5">
          {loading && <p className="text-sm text-slate-400 animate-pulse">Loading…</p>}
          {throughput && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Total Issued" value={throughput.total} color="text-green-600" />
                <StatCard label="IDP" value={throughput.rows.reduce((s,r) => s + r.idp,  0)} color="text-blue-600"  />
                <StatCard label="ICMV" value={throughput.rows.reduce((s,r) => s + r.icmv, 0)} color="text-purple-600" />
              </div>
              <Card>
                <CardHeader><CardTitle className="text-sm">Daily Issued Permits</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                  {throughput.rows.length === 0 ? (
                    <p className="text-sm text-slate-400">No issued permits in selected range.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-semibold text-slate-500 border-b">
                          <th className="pb-2 pr-4">Date</th>
                          <th className="pb-2 pr-4 text-right">IDP</th>
                          <th className="pb-2 pr-4 text-right">ICMV</th>
                          <th className="pb-2 text-right">Total</th>
                          <th className="pb-2 pl-4">Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const max = Math.max(...throughput.rows.map(r => r.total), 1);
                          return throughput.rows.map(row => (
                            <tr key={row.date} className="border-b border-slate-50 hover:bg-slate-50">
                              <td className="py-2 pr-4 font-mono text-slate-700">{row.date}</td>
                              <td className="py-2 pr-4 text-right text-blue-600 font-semibold">{row.idp}</td>
                              <td className="py-2 pr-4 text-right text-purple-600 font-semibold">{row.icmv}</td>
                              <td className="py-2 text-right font-bold text-slate-900">{row.total}</td>
                              <td className="py-2 pl-4">
                                <div className="w-32 h-3 rounded bg-slate-100 overflow-hidden">
                                  <div
                                    className="h-full rounded"
                                    style={{ width: `${Math.round((row.total / max) * 100)}%`, background: "#006B3F" }}
                                  />
                                </div>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── Expiring ── */}
      {tab === "expiring" && (
        <div className="space-y-5">
          {loading && <p className="text-sm text-slate-400 animate-pulse">Loading…</p>}
          {expiring && (
            <>
              <div className="grid grid-cols-1 gap-3">
                <StatCard label={`Expiring in next ${days} days`} value={expiring.total} color="text-amber-600" />
              </div>
              <Card>
                <CardHeader><CardTitle className="text-sm">Expiring Permits</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                  {expiring.rows.length === 0 ? (
                    <p className="text-sm text-slate-400">No expiring permits in this window.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-semibold text-slate-500 border-b">
                          <th className="pb-2 pr-4">Reference</th>
                          <th className="pb-2 pr-4">Type</th>
                          <th className="pb-2 pr-4">Applicant</th>
                          <th className="pb-2 pr-4">Licence No.</th>
                          <th className="pb-2 pr-4">Office</th>
                          <th className="pb-2">Expiry</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expiring.rows.map(row => {
                          const daysLeft = Math.ceil(
                            (new Date(row.dateOfExpiry).getTime() - Date.now()) / 86400000
                          );
                          const urgent = daysLeft <= 30;
                          return (
                            <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50">
                              <td className="py-2 pr-4 font-mono text-xs text-slate-700">{row.referenceNumber}</td>
                              <td className="py-2 pr-4">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${row.permitType === "IDP" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                                  {row.permitType}
                                </span>
                              </td>
                              <td className="py-2 pr-4 font-medium">{row.applicant.surname} {row.applicant.otherNames}</td>
                              <td className="py-2 pr-4 text-slate-500">{row.applicant.licenceNumber ?? "—"}</td>
                              <td className="py-2 pr-4 text-slate-500 text-xs">{row.issuingOffice?.name ?? "—"}</td>
                              <td className="py-2">
                                <span className={`text-xs font-semibold ${urgent ? "text-red-600" : "text-amber-600"}`}>
                                  {row.dateOfExpiry}
                                  <span className="ml-1 text-slate-400">({daysLeft}d)</span>
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── Office Performance ── */}
      {tab === "office" && (
        <div className="space-y-5">
          {loading && <p className="text-sm text-slate-400 animate-pulse">Loading…</p>}
          {office && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="All Offices" value={office.rows.length} color="text-slate-900" />
                <StatCard label="Total Permits" value={office.total} color="text-blue-600" />
                <StatCard label="Total Issued" value={office.rows.reduce((s,r) => s + r.issued, 0)} color="text-green-600" />
                <StatCard label="Total Rejected" value={office.rows.reduce((s,r) => s + r.rejected, 0)} color="text-red-600" />
              </div>
              <Card>
                <CardHeader><CardTitle className="text-sm">Per-Office Breakdown</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                  {office.rows.length === 0 ? (
                    <p className="text-sm text-slate-400">No data for this period.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-semibold text-slate-500 border-b">
                          <th className="pb-2 pr-4">Office</th>
                          <th className="pb-2 pr-4">Region</th>
                          <th className="pb-2 pr-4">Type</th>
                          <th className="pb-2 pr-4 text-right">Total</th>
                          <th className="pb-2 pr-4 text-right">Issued</th>
                          <th className="pb-2 pr-4 text-right">Pending</th>
                          <th className="pb-2 text-right">Rejected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {office.rows
                          .sort((a, b) => b.total - a.total)
                          .map(row => (
                          <tr key={row.office.id} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="py-2 pr-4 font-medium text-slate-800">{row.office.name}</td>
                            <td className="py-2 pr-4 text-slate-500 text-xs">{row.office.regionName ?? "—"}</td>
                            <td className="py-2 pr-4">
                              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                                {row.office.type.replace("_", " ")}
                              </span>
                            </td>
                            <td className="py-2 pr-4 text-right font-bold text-slate-900">{row.total}</td>
                            <td className="py-2 pr-4 text-right text-green-600 font-semibold">{row.issued}</td>
                            <td className="py-2 pr-4 text-right text-amber-600 font-semibold">{row.pending}</td>
                            <td className="py-2 text-right text-red-600 font-semibold">{row.rejected}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
