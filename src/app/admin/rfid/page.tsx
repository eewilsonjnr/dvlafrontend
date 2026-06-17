"use client";
import { useEffect, useState } from "react";
import { Wifi, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectOption } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { RfidEncoding } from "@/types";

export default function RFIDEncodingPage() {
  const [rows, setRows] = useState<RfidEncoding[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [chipSerial, setChipSerial] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const r = await api.get(`/rfid${params}`);
      setRows(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [filter]);

  const update = async (id: string, status: string) => {
    setUpdating(id); setErr(null);
    try {
      await api.put(`/rfid/${id}/status`, { status, chipSerialNumber: chipSerial[id], verificationResult: status === "encoded" ? "pass" : "fail" });
      fetch();
    } catch (e: any) {
      setErr(e.response?.data?.error ?? "Failed to update RFID status.");
    } finally { setUpdating(null); }
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RFID Encoding</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage RFID chip encoding for issued permits.</p>
        </div>
        <button onClick={fetch} className="flex items-center gap-1.5 px-3 py-2 rounded border border-gray-300 text-sm font-medium hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {err && (
        <div className="p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">{err}</div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm flex items-center gap-2"><Wifi className="w-4 h-4" style={{ color: "#1a3a6b" }} />RFID Encodings</CardTitle>
            <div className="w-40">
              <Select value={filter} onValueChange={setFilter}>
                <SelectOption value="all">All Statuses</SelectOption>
                <SelectOption value="pending">Pending</SelectOption>
                <SelectOption value="encoded">Encoded</SelectOption>
                <SelectOption value="failed">Failed</SelectOption>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading RFID records…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center">
              <Wifi className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm text-gray-400">No RFID encoding records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Permit","Status","Verification","Chip Serial","Encoded At","Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: "#1a3a6b" }}>{row.permit?.referenceNumber ?? row.permitId.slice(0, 8)}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3"><StatusBadge status={row.verificationResult} /></td>
                      <td className="px-4 py-3">
                        {row.status === "pending" ? (
                          <Input className="w-36 h-7 text-xs" placeholder="Chip S/N…" value={chipSerial[row.id] ?? ""} onChange={e => setChipSerial(p => ({ ...p, [row.id]: e.target.value }))} />
                        ) : (
                          <span className="font-mono text-xs text-gray-500">{row.chipSerialNumber ?? "—"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{row.encodedAt ? new Date(row.encodedAt).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3">
                        {row.status === "pending" && (
                          <div className="flex gap-1">
                            <button onClick={() => update(row.id, "encoded")} disabled={updating === row.id} className="px-2 py-1 rounded text-xs border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50">
                              {updating === row.id ? "…" : "Mark Encoded"}
                            </button>
                            <button onClick={() => update(row.id, "failed")} disabled={updating === row.id} className="px-2 py-1 rounded text-xs border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50">
                              Failed
                            </button>
                          </div>
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
