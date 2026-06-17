"use client";
import { useEffect, useState } from "react";
import { Shield, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectOption } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { QcResult } from "@/types";

export default function QCResultsPage() {
  const [results, setResults] = useState<QcResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, { score: string; reason: string }>>({});
  const [validationErr, setValidationErr] = useState<Record<string, string>>({});
  const [submitErr, setSubmitErr] = useState<Record<string, string>>({});

  const fetch = async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?result=${filter}` : "";
      const r = await api.get(`/qc${params}`);
      setResults(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [filter]);

  const submit = async (permitId: string, result: "pass" | "fail") => {
    const f = form[permitId] ?? {};
    if (result === "fail" && !f.reason?.trim()) {
      setValidationErr(e => ({ ...e, [permitId]: "Rejection reason is required for a fail result." }));
      return;
    }
    setValidationErr(e => { const n = { ...e }; delete n[permitId]; return n; });
    setSubmitErr(e => { const n = { ...e }; delete n[permitId]; return n; });
    setSubmitting(permitId);
    try {
      await api.post("/qc", {
        permitId, result,
        opticalInspectionScore: f.score ? Number(f.score) : undefined,
        rejectionReason: result === "fail" ? f.reason : undefined,
        mrzValidation: result === "pass",
        rfidValidation: result === "pass",
      });
      fetch();
    } catch (e: any) {
      setSubmitErr(prev => ({ ...prev, [permitId]: e.response?.data?.error ?? "Submission failed." }));
    } finally { setSubmitting(null); }
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QC Results</h1>
          <p className="text-sm text-gray-500 mt-0.5">Quality control inspection results for issued permits.</p>
        </div>
        <button onClick={fetch} className="flex items-center gap-1.5 px-3 py-2 rounded border border-gray-300 text-sm font-medium hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4" style={{ color: "#1a3a6b" }} />Inspection Records</CardTitle>
            <div className="w-40">
              <Select value={filter} onValueChange={setFilter}>
                <SelectOption value="all">All Results</SelectOption>
                <SelectOption value="pass">Pass</SelectOption>
                <SelectOption value="fail">Fail</SelectOption>
                <SelectOption value="pending">Pending</SelectOption>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading QC records…</div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm text-gray-400">No QC records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Permit","Result","Optical Score","MRZ","RFID","Rejection Reason","Inspected","Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map(qc => (
                    <tr key={qc.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: "#1a3a6b" }}>{qc.permit?.referenceNumber ?? qc.permitId.slice(0, 8)}</td>
                      <td className="px-4 py-3"><StatusBadge status={qc.result} /></td>
                      <td className="px-4 py-3 text-xs">
                        {qc.result === "pending" ? (
                          <Input type="number" min={0} max={100} className="w-20 h-7 text-xs" placeholder="0–100" value={form[qc.permitId]?.score ?? ""} onChange={e => setForm(p => ({ ...p, [qc.permitId]: { ...p[qc.permitId], score: e.target.value } }))} />
                        ) : (
                          <span className="font-semibold">{qc.opticalInspectionScore != null ? `${qc.opticalInspectionScore}%` : "—"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{qc.mrzValidation ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}</td>
                      <td className="px-4 py-3">{qc.rfidValidation ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {qc.result === "pending" ? (
                          <div>
                            <Input className="w-40 h-7 text-xs" placeholder="Reason (if fail)…" value={form[qc.permitId]?.reason ?? ""} onChange={e => { setForm(p => ({ ...p, [qc.permitId]: { ...p[qc.permitId], reason: e.target.value } })); setValidationErr(v => { const n = { ...v }; delete n[qc.permitId]; return n; }); }} />
                            {validationErr[qc.permitId] && <p className="text-red-600 mt-0.5 text-xs">{validationErr[qc.permitId]}</p>}
                          </div>
                        ) : (qc.rejectionReason ?? "—")}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{qc.inspectedAt ? new Date(qc.inspectedAt).toLocaleString() : new Date(qc.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {qc.result === "pending" && (
                          <div className="space-y-1">
                            <div className="flex gap-1">
                              <button onClick={() => submit(qc.permitId, "pass")} disabled={submitting === qc.permitId} className="px-2 py-1 rounded text-xs border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => submit(qc.permitId, "fail")} disabled={submitting === qc.permitId} className="px-2 py-1 rounded text-xs border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50">
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {submitErr[qc.permitId] && (
                              <p className="text-xs text-red-600">{submitErr[qc.permitId]}</p>
                            )}
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
