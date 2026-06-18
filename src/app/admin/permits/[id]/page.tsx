"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, BookOpen, Printer, Wifi, CheckSquare,
  CheckCircle, XCircle, RefreshCw, User, FileText,
} from "lucide-react";
import api from "@/lib/api";
import { assetUrl } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { usePermissions } from "@/hooks/usePermissions";

interface PermitDetail {
  id: string;
  referenceNumber: string;
  permitType: string;
  status: string;
  rejectionReason?: string;
  placeOfIssue?: string;
  dateOfIssue?: string;
  dateOfExpiry?: string;
  classOfLicence?: string;
  mrzLine1?: string;
  mrzLine2?: string;
  bookletNumber?: string;
  createdAt: string;
  applicant: {
    id: string;
    surname: string;
    otherNames: string;
    dateOfBirth?: string;
    placeOfBirth?: string;
    nationalId?: string;
    licenceNumber?: string;
    homeAddress?: string;
    photoUrl?: string;
  };
  printJobs: { id: string; status: string; isReprint: boolean; createdAt: string }[];
  rfidEncodings: { id: string; status: string; verificationResult: string; encodedAt?: string }[];
  qcResults: { id: string; result: string; opticalInspectionScore?: number; photoQualityScore?: number; mrzValidation: boolean; rfidValidation: boolean; createdAt: string }[];
}

export default function PermitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const canApprove = hasPermission("APPROVE_PERMIT");
  const canSubmit  = hasPermission("CREATE_PERMIT");
  const canPrint   = hasPermission("MANAGE_PRINT");

  const [permit, setPermit] = useState<PermitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchPermit = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/permits/${params.id}`);
      setPermit(r.data);
    } catch { setMsg({ type: "error", text: "Failed to load permit." }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPermit(); }, [params.id]);

  const updateStatus = async (status: string, rejectionReason?: string) => {
    setActionLoading(true); setMsg(null);
    // draft→submitted uses the /submit route (requires CREATE_PERMIT, not APPROVE_PERMIT)
    const endpoint = status === "submitted"
      ? `/permits/${params.id}/submit`
      : `/permits/${params.id}/status`;
    try {
      await api.put(endpoint, { status, rejectionReason });
      setMsg({ type: "success", text: `Permit ${status}.` });
      fetchPermit();
      setRejectOpen(false);
    } catch (e: any) {
      setMsg({ type: "error", text: e.response?.data?.error ?? "Action failed." });
    } finally { setActionLoading(false); }
  };

  const submitToPrint = async (isReprint = false) => {
    setActionLoading(true); setMsg(null);
    try {
      await api.post("/print-jobs", { permitId: params.id, isReprint });
      setMsg({ type: "success", text: "Submitted to print queue." });
      fetchPermit();
    } catch (e: any) {
      setMsg({ type: "error", text: e.response?.data?.error ?? "Failed to submit." });
    } finally { setActionLoading(false); }
  };

  const openPreview = async () => {
    try {
      const token = localStorage.getItem("token");
      const [res, printerNameCfg, agentPortCfg] = await Promise.all([
        fetch(`/api/permits/${params.id}/preview`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        api.get("/admin/config/printer_name").then(r => r.data?.value ?? "Surys P400").catch(() => "Surys P400"),
        api.get("/admin/config/printer_agent_port").then(r => r.data?.value ?? "6161").catch(() => "6161"),
      ]);
      if (!res.ok) throw new Error("preview failed");
      const blob = await res.blob();
      const pdfBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(blob);
      });
      const pdfUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const permitType = permit?.permitType ?? "IDP";
      const refNum = permit?.referenceNumber ?? "permit";
      const agentUrl = `http://localhost:${agentPortCfg}`;

      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Print Preview — ${refNum}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #555; font-family: sans-serif; }
    #toolbar {
      position: fixed; top: 0; left: 0; right: 0; height: 48px;
      background: #1a3a6b; display: flex; align-items: center; gap: 10px;
      padding: 0 16px; z-index: 100; box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    }
    #toolbar span { color: #fff; font-size: 13px; font-weight: 600; flex: 1; }
    #toolbar button {
      padding: 6px 14px; border: none; border-radius: 4px; font-size: 12px;
      font-weight: 600; cursor: pointer;
    }
    #btn-print { background: #006B3F; color: #fff; }
    #btn-print:hover { background: #005530; }
    #btn-agent { background: #CE1126; color: #fff; }
    #btn-agent:hover { background: #a50e1f; }
    #agent-status {
      font-size: 11px; color: #aad4ff; display: none; margin-left: 4px;
    }
    #page-wrap {
      margin-top: 68px; display: flex; flex-direction: column;
      align-items: center; padding: 20px; gap: 16px;
    }
    iframe { display: block; border: none; background: white; box-shadow: 0 2px 12px rgba(0,0,0,0.5); }
    .idp-frame  { width: 8.8cm; height: 25cm; }
    .icmv-frame { width: 8.8cm; height: 12.5cm; }
    @media print {
      #toolbar { display: none; }
      #page-wrap { margin: 0; padding: 0; }
      body { background: white; }
      iframe { box-shadow: none; }
      .idp-frame  { @page { size: 8.8cm 12.5cm; margin: 0; } width: 8.8cm; height: 12.5cm; }
      .icmv-frame { @page { size: 8.8cm 12.5cm; margin: 0; } width: 8.8cm; height: 12.5cm; }
    }
  </style>
</head>
<body>
  <div id="toolbar">
    <span>📄 ${refNum} &nbsp;·&nbsp; ${permitType}</span>
    <span id="agent-status">⏳ Sending to P400…</span>
    <button id="btn-agent" title="Send directly to Surys P400 printer (requires local print agent)">
      🖨 Print to P400
    </button>
    <button id="btn-print" title="Open browser print dialog">
      🖨 Print (dialog)
    </button>
  </div>
  <div id="page-wrap">
    <iframe src="${pdfUrl}" class="${permitType === 'IDP' ? 'idp-frame' : 'icmv-frame'}"></iframe>
  </div>
  <script>
    document.getElementById('btn-print').onclick = () => window.print();

    document.getElementById('btn-agent').onclick = async () => {
      const status = document.getElementById('agent-status');
      const btn = document.getElementById('btn-agent');
      status.style.display = 'inline';
      status.textContent = '⏳ Sending to ${printerNameCfg}…';
      btn.disabled = true;
      try {
        const resp = await fetch('${agentUrl}/print', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdf: '${pdfBase64}',
            permitType: '${permitType}',
            reference: '${refNum}',
            printerName: '${printerNameCfg}',
          }),
        });
        const data = await resp.json();
        if (resp.ok) {
          status.textContent = '✅ Sent to ${printerNameCfg}!';
          status.style.color = '#90ee90';
        } else {
          throw new Error(data.error || 'Print failed');
        }
      } catch (e) {
        const msg = e.message?.includes('Failed to fetch')
          ? '❌ Print agent not running on port ${agentPortCfg} — use Print (dialog) instead'
          : '❌ ' + e.message;
        status.textContent = msg;
        status.style.color = '#ff9999';
      } finally {
        btn.disabled = false;
        setTimeout(() => { status.style.display = 'none'; status.style.color = '#aad4ff'; }, 6000);
      }
    };
  </script>
</body>
</html>`;

      const wrapper = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      const tab = window.open(wrapper, "_blank");
      setTimeout(() => { URL.revokeObjectURL(pdfUrl); URL.revokeObjectURL(wrapper); }, 120000);
      if (!tab) setMsg({ type: "error", text: "Popup blocked — please allow popups for this site." });
    } catch {
      setMsg({ type: "error", text: "Failed to generate print preview." });
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl">
        <div className="h-64 flex items-center justify-center text-sm text-gray-400">Loading permit…</div>
      </div>
    );
  }

  if (!permit) {
    return (
      <div className="max-w-6xl space-y-4">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="p-8 text-center text-sm text-gray-400">Permit not found.</div>
      </div>
    );
  }

  const latestPrint = permit.printJobs[0];
  const latestRfid = permit.rfidEncodings[0];
  const latestQc = permit.qcResults[0];

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6" style={{ color: "#1a3a6b" }} />
              {permit.referenceNumber}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="border border-gray-300 rounded px-1.5 py-0.5 text-xs">{permit.permitType}</span>
              <StatusBadge status={permit.status} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openPreview}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium text-white"
            style={{ background: "#006B3F" }}
          >
            <FileText className="w-3.5 h-3.5" /> Print Preview
          </button>
          <button onClick={fetchPermit} className="flex items-center gap-1.5 px-3 py-2 rounded border border-gray-300 text-sm font-medium hover:bg-gray-50">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {msg && (
        <div className={`p-3 rounded text-sm ${msg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {/* Submit for Approval (draft → submitted) */}
      {canSubmit && permit.status === "draft" && (
        <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50">
          <span className="text-sm font-semibold text-blue-800 flex-1">This permit is in draft state and has not been submitted for approval.</span>
          <button
            onClick={() => updateStatus("submitted")}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-bold text-white disabled:opacity-60"
            style={{ background: "#1a3a6b" }}
          >
            <CheckCircle className="w-4 h-4" /> Submit for Approval
          </button>
        </div>
      )}

      {/* Approve / Reject workflow */}
      {canApprove && permit.status === "submitted" && (
        <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50">
          <span className="text-sm font-semibold text-amber-800 flex-1">This permit is awaiting approval.</span>
          {!rejectOpen ? (
            <>
              <button
                onClick={() => updateStatus("approved")}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-bold text-white disabled:opacity-60"
                style={{ background: "#006B3F" }}
              >
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
              <button
                onClick={() => setRejectOpen(true)}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <input
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Rejection reason (required)…"
                className="flex-1 px-3 py-2 border border-red-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <button
                onClick={() => updateStatus("rejected", rejectReason)}
                disabled={actionLoading || !rejectReason.trim()}
                className="px-4 py-2 rounded text-sm font-bold text-white bg-red-600 disabled:opacity-60"
              >
                Confirm Reject
              </button>
              <button onClick={() => setRejectOpen(false)} className="px-3 py-2 rounded border border-gray-300 text-sm hover:bg-gray-50">
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {permit.rejectionReason && (
        <div className="p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">
          <span className="font-semibold">Rejection reason:</span> {permit.rejectionReason}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Applicant */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4" style={{ color: "#1a3a6b" }} /> Applicant
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center max-h-48">
                {permit.applicant.photoUrl ? (
                  <img src={assetUrl(permit.applicant.photoUrl)} alt="Applicant" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-gray-400">
                    <User className="w-12 h-12 mx-auto opacity-30" />
                    <p className="text-xs mt-1">No photo</p>
                  </div>
                )}
              </div>
              <div className="space-y-1 text-xs">
                {[
                  ["Name",          `${permit.applicant.surname}, ${permit.applicant.otherNames}`],
                  ["Date of Birth", permit.applicant.dateOfBirth ?? "—"],
                  ["Place of Birth",permit.applicant.placeOfBirth ?? "—"],
                  ["National ID",   permit.applicant.nationalId ?? "—"],
                  ["Licence No.",   permit.applicant.licenceNumber ?? "—"],
                  ["Address",       permit.applicant.homeAddress ?? "—"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span className="text-gray-400">{label}</span>
                    <p className="font-medium text-gray-900">{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Column 2: Permit fields */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4" style={{ color: "#1a3a6b" }} /> Permit Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2 text-xs">
              {[
                ["Reference",     permit.referenceNumber],
                ["Type",          permit.permitType],
                ["Status",        permit.status],
                ["Place of Issue",permit.placeOfIssue ?? "—"],
                ["Date of Issue", permit.dateOfIssue ?? "—"],
                ["Date of Expiry",permit.dateOfExpiry ?? "—"],
                ["Class of Licence", permit.classOfLicence ?? "—"],
                ["Booklet No.",   permit.bookletNumber ?? "—"],
                ["Created",       new Date(permit.createdAt).toLocaleDateString()],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-medium text-gray-900 text-right max-w-[60%]">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* MRZ */}
          {(permit.mrzLine1 || permit.mrzLine2) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">MRZ Data</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="bg-gray-900 rounded p-3 font-mono text-xs text-green-400 space-y-1 overflow-x-auto">
                  {permit.mrzLine1 && <p>{permit.mrzLine1}</p>}
                  {permit.mrzLine2 && <p>{permit.mrzLine2}</p>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Column 3: Print / RFID / QC */}
        <div className="space-y-4">
          {/* Print Job */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Printer className="w-4 h-4" style={{ color: "#1a3a6b" }} /> Print Job
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {latestPrint ? (
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status</span>
                    <StatusBadge status={latestPrint.status} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Reprint</span>
                    <span className="font-medium">{latestPrint.isReprint ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Submitted</span>
                    <span className="font-medium">{new Date(latestPrint.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">No print job yet.</p>
              )}
              {canPrint && permit.status === "approved" && !latestPrint && (
                <button
                  onClick={() => submitToPrint(false)}
                  disabled={actionLoading}
                  className="w-full py-2 rounded text-xs font-bold text-white disabled:opacity-60"
                  style={{ background: "#1a3a6b" }}
                >
                  Submit to Print Queue
                </button>
              )}
              {canPrint && latestPrint?.status === "complete" && (
                <button
                  onClick={() => submitToPrint(true)}
                  disabled={actionLoading}
                  className="w-full py-2 rounded text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60"
                >
                  Request Reprint
                </button>
              )}
            </CardContent>
          </Card>

          {/* RFID */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Wifi className="w-4 h-4" style={{ color: "#1a3a6b" }} /> RFID Encoding
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {latestRfid ? (
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status</span>
                    <StatusBadge status={latestRfid.status} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Verification</span>
                    <StatusBadge status={latestRfid.verificationResult} />
                  </div>
                  {latestRfid.encodedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Encoded At</span>
                      <span className="font-medium">{new Date(latestRfid.encodedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No RFID encoding record.</p>
              )}
            </CardContent>
          </Card>

          {/* QC */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckSquare className="w-4 h-4" style={{ color: "#1a3a6b" }} /> QC Result
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {latestQc ? (
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Result</span>
                    <StatusBadge status={latestQc.result} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Optical Score</span>
                    <span className="font-medium">{latestQc.opticalInspectionScore?.toFixed(1) ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Photo Quality</span>
                    <span className="font-medium">{latestQc.photoQualityScore?.toFixed(1) ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">MRZ Valid</span>
                    <span className={`font-medium ${latestQc.mrzValidation ? "text-green-600" : "text-red-600"}`}>{latestQc.mrzValidation ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">RFID Valid</span>
                    <span className={`font-medium ${latestQc.rfidValidation ? "text-green-600" : "text-red-600"}`}>{latestQc.rfidValidation ? "Yes" : "No"}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">No QC result yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
