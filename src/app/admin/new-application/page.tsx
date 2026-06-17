"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Camera, CheckCircle, ChevronRight,
  Upload, Video, VideoOff, Receipt, AlertCircle, User,
} from "lucide-react";
import api from "@/lib/api";
import { assetUrl } from "@/lib/utils";
import { DVLA_STUB, lookupInvoice, type DvlaRecord } from "@/lib/dvlaStub";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Input } from "@/components/ui/input";
import { Select, SelectOption } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import type { Applicant } from "@/types";

// ── Step indicator ─────────────────────────────────────────────────────────────

const STEPS = ["Invoice", "Applicant", "Photo", "Permit Details", "Done"];

function Steps({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                done   ? "border-green-500 bg-green-500 text-white" :
                active ? "border-current text-white" :
                         "border-gray-200 text-gray-300"
              }`} style={active ? { background: "#0a1f44", borderColor: "#0a1f44" } : {}}>
                {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs font-semibold whitespace-nowrap ${active ? "text-gray-900" : done ? "text-green-600" : "text-gray-400"}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 transition-all ${done ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function NavButtons({ onBack, onNext, nextLabel, nextDisabled, submitting }: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  submitting?: boolean;
}) {
  return (
    <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
      {onBack ? (
        <button onClick={onBack} className="px-4 py-2 rounded border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50">
          Back
        </button>
      ) : <div />}
      {onNext && (
        <button
          onClick={onNext}
          disabled={nextDisabled || submitting}
          className="flex items-center gap-2 px-6 py-2.5 rounded text-sm font-bold text-white disabled:opacity-50 transition"
          style={{ background: "#0a1f44" }}
        >
          {submitting ? "Please wait…" : (nextLabel ?? "Continue")}
          {!submitting && <ChevronRight className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}

// ── Main wizard ────────────────────────────────────────────────────────────────

export default function NewApplicationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canUpload = hasPermission("UPLOAD_BIOMETRIC");
  const placeOfIssue = (user as any)?.office?.placeOfIssueLabel ?? (user as any)?.office?.name ?? "";

  const [step, setStep]                       = useState(0);
  const [applicant, setApplicant]             = useState<Applicant | null>(null);
  const [invoiceRec, setInvoiceRec]           = useState<DvlaRecord | null>(null);
  const [skippedRegistration, setSkippedReg] = useState(false);
  const [permitRef, setPermitRef]             = useState("");
  const [permitType, setPermitType]           = useState<"idp" | "icmv">("idp");

  // ── STEP 0: Invoice lookup ─────────────────────────────────────────────────

  const [invoiceQuery, setInvoiceQuery]     = useState("");
  const [invoiceResult, setInvoiceResult]   = useState<DvlaRecord | null | "not_found">(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceErr, setInvoiceErr]         = useState("");

  const handleInvoiceSearch = async () => {
    const q = invoiceQuery.trim();
    if (!q) return;
    setInvoiceLoading(true); setInvoiceResult(null); setInvoiceErr("");
    try {
      const r = await api.get(`/applicants/dvla-lookup?invoice=${encodeURIComponent(q)}`);
      if (r.data.source === "dvla_api" && r.data.data) {
        setInvoiceResult(r.data.data as DvlaRecord);
      } else {
        setInvoiceResult(lookupInvoice(q) ?? "not_found");
      }
    } catch {
      setInvoiceResult(lookupInvoice(q) ?? "not_found");
    } finally { setInvoiceLoading(false); }
  };

  const proceedWithInvoice = async (rec: DvlaRecord) => {
    setInvoiceErr("");
    setInvoiceRec(rec);
    setPermitType(rec.permitType.toLowerCase() as "idp" | "icmv");

    // Check if this applicant already exists in the local DB by national ID or licence number
    try {
      const r = await api.get(`/applicants?q=${encodeURIComponent(rec.nationalId || rec.licenceNumber)}`);
      const matches: Applicant[] = r.data;
      const existing = matches.find(
        a => a.nationalId === rec.nationalId || a.licenceNumber === rec.licenceNumber
      );
      if (existing) {
        // Applicant already registered — use them directly, skip the registration step
        setApplicant(existing);
        setSkippedReg(true);
        setStep(2); // go straight to Photo
        return;
      }
    } catch { /* fall through to registration */ }

    setStep(1); // go to Applicant registration
  };

  // ── STEP 1: Confirm & register applicant ──────────────────────────────────

  const [saving, setSaving]   = useState(false);
  const [saveErr, setSaveErr] = useState("");

  const handleRegister = async () => {
    if (!invoiceRec) return;
    setSaveErr(""); setSaving(true);
    try {
      const r = await api.post("/applicants", {
        surname:       invoiceRec.surname,
        otherNames:    invoiceRec.otherNames,
        dateOfBirth:   invoiceRec.dateOfBirth,
        placeOfBirth:  invoiceRec.placeOfBirth,
        homeAddress:   invoiceRec.homeAddress,
        nationalId:    invoiceRec.nationalId,
        licenceNumber: invoiceRec.licenceNumber,
      });
      setApplicant(r.data);
      setStep(2);
    } catch (err: any) {
      const msg: string = err.response?.data?.error ?? "";
      // If applicant already exists (e.g. created between steps), fetch and continue
      if (msg.toLowerCase().includes("already exists") || err.response?.status === 409) {
        try {
          const r2 = await api.get(`/applicants?q=${encodeURIComponent(invoiceRec.nationalId || invoiceRec.licenceNumber)}`);
          const existing = (r2.data as Applicant[]).find(
            a => a.nationalId === invoiceRec.nationalId || a.licenceNumber === invoiceRec.licenceNumber
          );
          if (existing) { setApplicant(existing); setStep(2); return; }
        } catch { /* fall through */ }
      }
      setSaveErr(msg || "Failed to register applicant. Please try again.");
    } finally { setSaving(false); }
  };

  // ── STEP 2: Photo ──────────────────────────────────────────────────────────

  const [photoFile, setPhotoFile]       = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [captureMode, setCaptureMode]   = useState<"upload" | "camera">("upload");
  const [streaming, setStreaming]       = useState(false);
  const [cameraErr, setCameraErr]       = useState("");
  const [uploading, setUploading]       = useState(false);
  const [photoSaved, setPhotoSaved]     = useState(false);

  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setStreaming(false);
  }, []);

  const startCamera = async () => {
    setCameraErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setStreaming(true);
    } catch (e: any) { setCameraErr(e?.message ?? "Cannot access camera."); }
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    c.toBlob(blob => {
      if (!blob) return;
      setPhotoFile(new File([blob], "capture.jpg", { type: "image/jpeg" }));
      setPhotoPreview(URL.createObjectURL(blob));
      stopCamera();
    }, "image/jpeg", 0.92);
  };

  const savePhoto = async () => {
    if (!applicant || !photoFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", photoFile);
      const { data } = await api.post(`/applicants/${applicant.id}/biometric`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setApplicant(prev => prev ? { ...prev, photoUrl: data.photoUrl } : prev);
      setPhotoSaved(true);
    } catch { /* non-fatal */ }
    finally { setUploading(false); }
  };

  const proceedFromPhoto = async () => {
    if (photoFile && !photoSaved) await savePhoto();
    stopCamera();
    setStep(3);
  };

  // ── STEP 3: Permit Details ─────────────────────────────────────────────────

  const [idp, setIdp] = useState({
    dateOfIssue: "", dateOfExpiry: "", classOfLicence: "", certificateOfCompetence: "",
  });
  const [icmv, setIcmv] = useState({
    ownerSurname: "", ownerOtherNames: "", ownerHomeAddress: "", classOfVehicle: "",
    makerOfChassis: "", typeOfChassis: "", serialNumber: "", numberOfCylinders: "",
    engineNumber: "", stroke: "", bore: "", horsePower: "", bodyShape: "", bodyColour: "",
    numberOfSeats: "", weightUnladen: "", weightLaden: "", identificationMark: "",
    dateOfIssue: "", dateOfExpiry: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr]   = useState("");

  const handleSubmit = async () => {
    if (!applicant) return;
    setSubmitting(true); setSubmitErr("");
    try {
      let r;
      if (permitType === "idp") {
        if (!idp.dateOfIssue || !idp.dateOfExpiry || !idp.classOfLicence) {
          setSubmitErr("Date of Issue, Date of Expiry and Class of Licence are required.");
          setSubmitting(false); return;
        }
        r = await api.post("/permits/idp", { applicantId: applicant.id, placeOfIssue, ...idp });
      } else {
        if (!icmv.dateOfIssue || !icmv.dateOfExpiry) {
          setSubmitErr("Date of Issue and Date of Expiry are required.");
          setSubmitting(false); return;
        }
        r = await api.post("/permits/icmv", { applicantId: applicant.id, placeOfIssue, ...icmv });
      }
      setPermitRef(r.data.referenceNumber);
      setStep(4);
    } catch (e: any) {
      setSubmitErr(e.response?.data?.error ?? "Submission failed. Please try again.");
    } finally { setSubmitting(false); }
  };

  const resetWizard = () => {
    setStep(0); setApplicant(null); setInvoiceRec(null); setSkippedReg(false);
    setInvoiceQuery(""); setInvoiceResult(null); setInvoiceErr("");
    setPhotoFile(null); setPhotoPreview(null); setPhotoSaved(false);
    setIdp({ dateOfIssue: "", dateOfExpiry: "", classOfLicence: "", certificateOfCompetence: "" });
    setIcmv({ ownerSurname: "", ownerOtherNames: "", ownerHomeAddress: "", classOfVehicle: "", makerOfChassis: "", typeOfChassis: "", serialNumber: "", numberOfCylinders: "", engineNumber: "", stroke: "", bore: "", horsePower: "", bodyShape: "", bodyColour: "", numberOfSeats: "", weightUnladen: "", weightLaden: "", identificationMark: "", dateOfIssue: "", dateOfExpiry: "" });
    setPermitRef(""); setSubmitErr("");
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Application</h1>
        <p className="text-sm text-gray-500 mt-0.5">Enter the applicant's DVLA payment invoice number to begin.</p>
      </div>

      <Steps current={step} />

      {/* ── Step 0: Invoice lookup ── */}
      {step === 0 && (
        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                <Receipt className="w-4 h-4 inline mr-1.5 text-gray-400" />
                Payment Invoice Number
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. DVLA-2026-001234"
                  value={invoiceQuery}
                  onChange={e => { setInvoiceQuery(e.target.value.toUpperCase()); setInvoiceResult(null); setInvoiceErr(""); }}
                  onKeyDown={e => e.key === "Enter" && handleInvoiceSearch()}
                  className="flex-1 font-mono"
                />
                <button
                  onClick={handleInvoiceSearch}
                  disabled={invoiceLoading || !invoiceQuery.trim()}
                  className="px-5 py-2 rounded text-sm font-bold text-white disabled:opacity-60"
                  style={{ background: "#006B3F" }}
                >
                  {invoiceLoading ? "…" : "Verify"}
                </button>
              </div>
              {invoiceErr && (
                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {invoiceErr}
                </p>
              )}
            </div>

            {/* Result card */}
            {invoiceResult === "not_found" && (
              <div className="flex items-center gap-3 p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-semibold">Invoice not found</p>
                  <p className="text-xs mt-0.5">Check the number and try again, or ask the applicant to provide their payment receipt.</p>
                </div>
              </div>
            )}

            {invoiceResult && invoiceResult !== "not_found" && (() => {
              const rec = invoiceResult;
              if (rec.receiptStatus === "used") {
                return (
                  <div className="flex items-start gap-3 p-4 rounded-lg border-2 border-amber-300 bg-amber-50">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-800">Invoice already used</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Invoice <span className="font-mono">{rec.invoiceNumber}</span> was already used to issue a permit for {rec.surname}, {rec.otherNames}.
                        A new payment must be made before another permit can be issued.
                      </p>
                    </div>
                  </div>
                );
              }
              if (rec.receiptStatus === "expired") {
                return (
                  <div className="flex items-start gap-3 p-4 rounded-lg border-2 border-red-300 bg-red-50">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-800">Invoice expired</p>
                      <p className="text-xs text-red-700 mt-0.5">
                        This payment receipt has expired. The applicant must make a new payment at the DVLA cashier before proceeding.
                      </p>
                    </div>
                  </div>
                );
              }
              // Verified
              return (
                <div className="rounded-lg border-2 border-green-300 bg-green-50 p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-bold text-green-800">Valid Invoice — {rec.permitType}</span>
                    </div>
                    <span className="text-xs text-green-700 font-mono bg-green-100 px-2 py-0.5 rounded">
                      {rec.invoiceNumber} · GHS {rec.amount} · {rec.paymentDate}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5 text-xs bg-white rounded-lg p-3 border border-green-200">
                    {[
                      ["Full Name",      `${rec.surname}, ${rec.otherNames}`],
                      ["Date of Birth",  rec.dateOfBirth],
                      ["Place of Birth", rec.placeOfBirth],
                      ["National ID",    rec.nationalId],
                      ["Licence No.",    rec.licenceNumber],
                      ["Licence Class",  rec.licenceClass],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <span className="text-gray-400 block">{label}</span>
                        <span className="font-semibold text-gray-800">{value}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => proceedWithInvoice(rec)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-bold text-white"
                    style={{ background: "#006B3F" }}
                  >
                    Proceed with this invoice <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })()}

            {/* Test invoice quick-pick */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
              <p className="text-xs font-semibold text-blue-700">Test invoice numbers — click to load:</p>
              <div className="flex flex-wrap gap-2">
                {DVLA_STUB.map(r => (
                  <button
                    key={r.invoiceNumber}
                    onClick={() => { setInvoiceQuery(r.invoiceNumber); setInvoiceResult(r); }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold border transition ${
                      r.receiptStatus === "verified"
                        ? "border-green-300 bg-white text-green-800 hover:bg-green-50"
                        : r.receiptStatus === "used"
                        ? "border-amber-300 bg-white text-amber-700 hover:bg-amber-50"
                        : "border-red-200 bg-white text-red-600 hover:bg-red-50"
                    }`}
                  >
                    {r.invoiceNumber}
                    <span className="opacity-60 font-sans font-normal">· {r.surname} · {r.receiptStatus}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 1: Confirm & register applicant ── */}
      {step === 1 && invoiceRec && (
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
              <Receipt className="w-3.5 h-3.5 shrink-0" />
              Data from DVLA Central Database for invoice <span className="font-mono font-bold ml-1">{invoiceRec.invoiceNumber}</span> — read-only
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                ["Surname",            "surname"],
                ["Other Names",        "otherNames"],
                ["Place of Birth",     "placeOfBirth"],
                ["Date of Birth",      "dateOfBirth"],
                ["Home Address",       "homeAddress"],
                ["National ID",        "nationalId"],
                ["Driver's Licence No.", "licenceNumber"],
              ] as [string, keyof DvlaRecord][]).map(([label, key]) => (
                <div key={key} className={key === "homeAddress" ? "sm:col-span-2" : ""}>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
                  <div className="px-3 py-2 rounded border border-gray-200 bg-gray-50 text-sm text-gray-800 min-h-9 flex items-center">
                    {invoiceRec[key] || <span className="italic text-gray-400">—</span>}
                  </div>
                </div>
              ))}
            </div>

            {saveErr && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{saveErr}</p>}

            <NavButtons
              onBack={() => setStep(0)}
              onNext={handleRegister}
              nextLabel="Confirm & Continue"
              submitting={saving}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Photo ── */}
      {step === 2 && applicant && (
        <Card>
          <CardContent className="p-6 space-y-5">
            {/* Applicant summary */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="w-10 h-12 rounded overflow-hidden shrink-0 border border-gray-200">
                {applicant.photoUrl ? (
                  <img src={assetUrl(applicant.photoUrl)} alt={applicant.surname} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ background: "#1a3a6b", color: "#FCD116" }}>
                    {applicant.surname.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{applicant.surname}, {applicant.otherNames}</p>
                <p className="text-xs text-gray-500">{applicant.licenceNumber ? `Licence: ${applicant.licenceNumber}` : applicant.nationalId ?? ""}</p>
              </div>
            </div>

            {applicant.photoUrl && !photoPreview && (
              <div className="flex items-center gap-2 p-2 rounded bg-green-50 border border-green-200 text-xs text-green-700">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" /> Photo already on file — you can update it or skip to the next step.
              </div>
            )}

            {canUpload && (
              <>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-semibold w-fit">
                  <button onClick={() => { stopCamera(); setCaptureMode("upload"); }}
                    className={`flex items-center gap-2 px-4 py-2 ${captureMode === "upload" ? "text-white" : "text-gray-500 hover:bg-gray-50"}`}
                    style={captureMode === "upload" ? { background: "#0a1f44" } : {}}>
                    <Upload className="w-4 h-4" /> Upload File
                  </button>
                  <button onClick={() => { setCaptureMode("camera"); startCamera(); }}
                    className={`flex items-center gap-2 px-4 py-2 border-l border-gray-200 ${captureMode === "camera" ? "text-white" : "text-gray-500 hover:bg-gray-50"}`}
                    style={captureMode === "camera" ? { background: "#0a1f44" } : {}}>
                    <Video className="w-4 h-4" /> Use Camera
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      {captureMode === "camera" ? "Live Camera" : "Select Photo"}
                    </p>
                    <div className="aspect-3/4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center mb-2 relative">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : captureMode === "camera" ? (
                        <>
                          <video ref={videoRef} className={`w-full h-full object-cover ${streaming ? "" : "hidden"}`} playsInline muted />
                          {!streaming && <div className="text-center text-gray-400"><VideoOff className="w-8 h-8 mx-auto mb-1 opacity-40" /><p className="text-xs">Camera not started</p></div>}
                          {streaming && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-24 h-32 rounded-full border-2 border-yellow-400 border-dashed opacity-60" /></div>}
                        </>
                      ) : (
                        <div className="text-center text-gray-400"><Upload className="w-8 h-8 mx-auto mb-1 opacity-30" /><p className="text-xs">Select a photo below</p></div>
                      )}
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                    {captureMode === "upload" ? (
                      <input type="file" accept="image/*"
                        onChange={e => { const f = e.target.files?.[0]; if (!f) return; setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); setPhotoSaved(false); }}
                        className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
                    ) : streaming ? (
                      <button onClick={captureFrame} className="w-full py-2 rounded text-sm font-bold text-white" style={{ background: "#006B3F" }}>
                        <Camera className="w-4 h-4 inline mr-2" />Capture
                      </button>
                    ) : cameraErr ? <p className="text-xs text-red-500">{cameraErr}</p> : null}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Current on File</p>
                    <div className="aspect-3/4 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center">
                      {applicant.photoUrl
                        ? <img src={assetUrl(applicant.photoUrl)} alt="On file" className="w-full h-full object-cover" />
                        : <div className="text-center text-gray-400"><User className="w-8 h-8 mx-auto mb-1 opacity-30" /><p className="text-xs">None</p></div>}
                    </div>
                  </div>
                </div>

                {photoSaved && <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Photo saved.</p>}
              </>
            )}

            <NavButtons
              onBack={() => setStep(skippedRegistration ? 0 : 1)}
              onNext={proceedFromPhoto}
              nextLabel={uploading ? "Saving…" : (!applicant.photoUrl && !photoFile) ? "Skip Photo & Continue" : "Continue"}
              submitting={uploading}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Permit Details ── */}
      {step === 3 && applicant && (
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-3 p-2 rounded bg-gray-50 border border-gray-200">
              <div className="flex-1">
                <p className="text-xs text-gray-500">Applicant</p>
                <p className="text-sm font-semibold text-gray-900">{applicant.surname}, {applicant.otherNames}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Permit Type</p>
                <span className="text-sm font-bold uppercase tracking-wide" style={{ color: "#0a1f44" }}>
                  {permitType === "idp" ? "IDP — International Driving Permit" : "ICMV — Internat. Certificate for Motor Vehicles"}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Place of Issue</label>
              <div className="px-3 py-2 rounded border border-gray-200 bg-gray-50 text-sm text-gray-700">
                {placeOfIssue || <span className="italic text-gray-400">No office assigned</span>}
              </div>
            </div>

            {permitType === "idp" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Date of Issue *</label>
                  <Input type="date" value={idp.dateOfIssue} onChange={e => setIdp(f => ({ ...f, dateOfIssue: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Date of Expiry *</label>
                  <Input type="date" value={idp.dateOfExpiry} onChange={e => setIdp(f => ({ ...f, dateOfExpiry: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Class of Licence *</label>
                  <Select value={idp.classOfLicence} onValueChange={v => setIdp(f => ({ ...f, classOfLicence: v }))}>
                    <SelectOption value="">Select class…</SelectOption>
                    <SelectOption value="A">Class A — Motorcycles</SelectOption>
                    <SelectOption value="B">Class B — Cars</SelectOption>
                    <SelectOption value="C">Class C — Light Duty</SelectOption>
                    <SelectOption value="D">Class D — Heavy Duty</SelectOption>
                    <SelectOption value="E">Class E — Agricultural</SelectOption>
                    <SelectOption value="F">Class F — Any Motor Vehicle</SelectOption>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Certificate of Competence</label>
                  <Input placeholder="Reference number (optional)" value={idp.certificateOfCompetence} onChange={e => setIdp(f => ({ ...f, certificateOfCompetence: e.target.value }))} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  ["Owner Surname",           "ownerSurname",       ""],
                  ["Owner Other Names",       "ownerOtherNames",    ""],
                  ["Owner Home Address",      "ownerHomeAddress",   "sm:col-span-2"],
                  ["Class of Vehicle",        "classOfVehicle",     ""],
                  ["Maker of Chassis",        "makerOfChassis",     ""],
                  ["Type of Chassis",         "typeOfChassis",      ""],
                  ["Serial / Maker's Number", "serialNumber",       ""],
                  ["No. of Cylinders",        "numberOfCylinders",  ""],
                  ["Engine Number",           "engineNumber",       "sm:col-span-2"],
                  ["Stroke",                  "stroke",             ""],
                  ["Bore",                    "bore",               ""],
                  ["Horse-Power",             "horsePower",         ""],
                  ["Body Shape",              "bodyShape",          ""],
                  ["Body Colour",             "bodyColour",         ""],
                  ["No. of Seats",            "numberOfSeats",      ""],
                  ["Weight Unladen (kg)",     "weightUnladen",      ""],
                  ["Weight Laden (kg)",       "weightLaden",        ""],
                  ["Identification Mark",     "identificationMark", "sm:col-span-2"],
                  ["Date of Issue *",         "dateOfIssue",        "", "date"],
                  ["Date of Expiry *",        "dateOfExpiry",       "", "date"],
                ] as [string, string, string, string?][]).map(([label, key, span, type]) => (
                  <div key={key} className={span || ""}>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
                    <Input type={type || "text"} value={(icmv as any)[key]} onChange={e => setIcmv(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
            )}

            {submitErr && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{submitErr}</p>}

            <NavButtons
              onBack={() => setStep(2)}
              onNext={handleSubmit}
              nextLabel="Submit Application"
              submitting={submitting}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Done ── */}
      {step === 4 && (
        <Card>
          <CardContent className="p-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "#006B3F" }}>
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Application Submitted</h2>
              <p className="text-sm text-gray-500 mt-1">
                {applicant?.surname}, {applicant?.otherNames} — Reference:{" "}
                <span className="font-mono font-bold text-gray-900">{permitRef}</span>
              </p>
            </div>
            <p className="text-sm text-gray-500">
              The permit is now in <strong>draft</strong> status and will be reviewed by an authorised officer.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button onClick={resetWizard} className="px-4 py-2 rounded border border-gray-300 text-sm font-medium hover:bg-gray-50">
                New Application
              </button>
              <button onClick={() => router.push("/admin/permits")} className="px-5 py-2 rounded text-sm font-bold text-white" style={{ background: "#0a1f44" }}>
                View Permits
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
