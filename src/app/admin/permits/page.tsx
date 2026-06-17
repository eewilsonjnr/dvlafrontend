"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Search, RefreshCw, Eye, Printer } from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectOption } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { usePermissions } from "@/hooks/usePermissions";
import type { Permit } from "@/types";

export default function PermitsPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const canPrint = hasPermission("MANAGE_PRINT");
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const fetchPermits = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all")   params.set("type",   typeFilter);
      const r = await api.get(`/permits?${params}`);
      setPermits(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [statusFilter, typeFilter]);

  useEffect(() => { fetchPermits(); }, [fetchPermits]);

  const filtered = permits.filter(p =>
    !search || p.referenceNumber.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleBatchPrint = async () => {
    if (!selectedIds.size) return;
    setSubmitting(true);
    try {
      await Promise.all([...selectedIds].map(id => api.post("/print-jobs", { permitId: id })));
      alert(`${selectedIds.size} permit(s) submitted to print queue.`);
      setSelectedIds(new Set());
      fetchPermits();
    } catch { alert("Batch print submission failed."); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Permits</h1>
          <p className="text-sm text-gray-500 mt-0.5">All IDP and ICMV permits — click a row to view details.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchPermits} className="flex items-center gap-1.5 px-3 py-2 rounded border border-gray-300 text-sm font-medium hover:bg-gray-50">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button onClick={() => router.push("/admin/new-application")} className="px-4 py-2 rounded text-sm font-bold text-white" style={{ background: "#1a3a6b" }}>
            + New Application
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input className="pl-9 h-9" placeholder="Search by reference number…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="w-40">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectOption value="all">All Statuses</SelectOption>
                <SelectOption value="draft">Draft</SelectOption>
                <SelectOption value="submitted">Submitted</SelectOption>
                <SelectOption value="approved">Approved</SelectOption>
                <SelectOption value="rejected">Rejected</SelectOption>
                <SelectOption value="printed">Printed</SelectOption>
                <SelectOption value="issued">Issued</SelectOption>
              </Select>
            </div>
            <div className="w-32">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectOption value="all">All Types</SelectOption>
                <SelectOption value="IDP">IDP</SelectOption>
                <SelectOption value="ICMV">ICMV</SelectOption>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-3 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50">
          <span className="text-sm font-medium text-blue-800">{selectedIds.size} permit(s) selected</span>
          <div className="flex gap-2">
            <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 rounded border border-gray-300 text-xs font-medium bg-white">Clear</button>
            <button onClick={handleBatchPrint} disabled={submitting || !canPrint} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold text-white disabled:opacity-60" style={{ background: "#1a3a6b" }}>
              <Printer className="w-3.5 h-3.5" />
              {submitting ? "Submitting…" : `Submit ${selectedIds.size} to Print Queue`}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4" style={{ color: "#1a3a6b" }} />
            {filtered.length} Permit{filtered.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading permits…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm text-gray-400">No permits found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 w-10"><input type="checkbox" onChange={e => setSelectedIds(e.target.checked ? new Set(filtered.map(p => p.id)) : new Set())} checked={selectedIds.size === filtered.length && filtered.length > 0} /></th>
                    {["Reference","Type","Status","Place of Issue","Expiry","Created",""].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className={`border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${selectedIds.has(p.id) ? "bg-blue-50" : ""}`} onClick={() => router.push(`/admin/permits/${p.id}`)}>
                      <td className="px-4 py-3" onClick={e => toggleSelect(p.id, e)}>
                        <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => {}} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: "#1a3a6b" }}>{p.referenceNumber}</td>
                      <td className="px-4 py-3"><span className="border border-gray-300 rounded px-1.5 py-0.5 text-xs">{p.permitType}</span></td>
                      <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.placeOfIssue ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.dateOfExpiry ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={e => { e.stopPropagation(); router.push(`/admin/permits/${p.id}`); }}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-gray-300 hover:bg-gray-50"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
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
