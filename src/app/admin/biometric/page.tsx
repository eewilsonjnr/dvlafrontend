"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Camera, Search, Upload, User, Video, VideoOff, PenLine } from "lucide-react";
import api from "@/lib/api";
import { assetUrl } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Applicant } from "@/types";

type CaptureMode = "upload" | "camera" | "signature";

export default function BiometricCapturePage() {
  const { hasPermission } = usePermissions();
  const canUpload = hasPermission("UPLOAD_BIOMETRIC");
  const searchParams = useSearchParams();

  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<Applicant[]>([]);
  const [selected, setSelected] = useState<Applicant | null>(null);
  const [mode, setMode]         = useState<CaptureMode>("upload");
  const [photoFile, setPhotoFile]       = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg]           = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Signature pad state
  const sigCanvasRef  = useRef<HTMLCanvasElement>(null);
  const [sigDrawing, setSigDrawing] = useState(false);
  const [sigHasData, setSigHasData] = useState(false);

  const sigStart = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = sigCanvasRef.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const r = c.getBoundingClientRect();
    ctx.beginPath(); ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
    setSigDrawing(true);
  };
  const sigMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!sigDrawing) return;
    const c = sigCanvasRef.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const r = c.getBoundingClientRect();
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#0a1f44";
    ctx.lineTo(e.clientX - r.left, e.clientY - r.top); ctx.stroke();
    setSigHasData(true);
  };
  const sigEnd = () => setSigDrawing(false);
  const sigClear = () => {
    const c = sigCanvasRef.current; if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setSigHasData(false);
  };

  const handleSignatureUpload = async () => {
    if (!selected || !sigHasData) { setMsg({ type: "error", text: "Draw a signature first." }); return; }
    const c = sigCanvasRef.current; if (!c) return;
    c.toBlob(async blob => {
      if (!blob) return;
      setUploading(true); setMsg(null);
      try {
        const form = new FormData();
        form.append("signature", new File([blob], "signature.png", { type: "image/png" }));
        await api.post(`/applicants/${selected.id}/signature`, form, { headers: { "Content-Type": "multipart/form-data" } });
        setMsg({ type: "success", text: `Signature saved for ${selected.surname}, ${selected.otherNames}.` });
        sigClear();
      } catch { setMsg({ type: "error", text: "Signature upload failed." }); }
      finally { setUploading(false); }
    }, "image/png");
  };

  // Camera state
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming]     = useState(false);
  const [cameraErr, setCameraErr]     = useState("");
  const streamRef  = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setStreaming(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // Pre-select applicant from URL param (e.g. navigated from New Application page)
  useEffect(() => {
    const id = searchParams.get("applicantId");
    if (!id) return;
    api.get(`/applicants/${id}`).then(r => setSelected(r.data)).catch(() => {});
  }, []);

  const startCamera = async () => {
    setCameraErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStreaming(true);
    } catch (e: any) {
      setCameraErr(e?.message ?? "Could not access camera. Check browser permissions.");
    }
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width  = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    c.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(blob));
      stopCamera();
    }, "image/jpeg", 0.92);
  };

  const switchMode = (m: CaptureMode) => {
    stopCamera();
    setPhotoFile(null);
    setPhotoPreview(null);
    setMode(m);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    try {
      const r = await api.get(`/applicants?q=${encodeURIComponent(query)}`);
      setResults(r.data);
    } catch { setMsg({ type: "error", text: "Search failed." }); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selected || !photoFile) { setMsg({ type: "error", text: "Select an applicant and a photo." }); return; }
    setUploading(true); setMsg(null);
    try {
      const form = new FormData();
      form.append("photo", photoFile);
      const { data } = await api.post(`/applicants/${selected.id}/biometric`, form, { headers: { "Content-Type": "multipart/form-data" } });
      setSelected(prev => prev ? { ...prev, photoUrl: data.photoUrl } : prev);
      setMsg({ type: "success", text: `Photo uploaded for ${selected.surname}, ${selected.otherNames}.` });
      setPhotoFile(null); setPhotoPreview(null);
    } catch { setMsg({ type: "error", text: "Upload failed. Please try again." }); }
    finally { setUploading(false); }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Biometric Capture</h1>
        <p className="text-sm text-gray-500 mt-0.5">Search for an applicant and capture their ICAO-compliant photo.</p>
      </div>

      {msg && (
        <div className={`p-3 rounded text-sm ${msg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="w-4 h-4" style={{ color: "#1a3a6b" }} /> Applicant Lookup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <Input placeholder="National ID or Licence Number…" value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()} className="flex-1" />
            <button onClick={handleSearch} className="px-4 py-2 rounded text-sm font-bold text-white" style={{ background: "#1a3a6b" }}>
              Search
            </button>
          </div>
          {results.length > 0 && (
            <div className="space-y-2">
              {results.map(a => (
                <div key={a.id} onClick={() => setSelected(a)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${selected?.id === a.id ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "#1a3a6b", color: "#FCD116" }}>
                    {a.surname.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{a.surname}, {a.otherNames}</p>
                    <p className="text-xs text-gray-500">ID: {a.nationalId ?? "—"} · Licence: {a.licenceNumber ?? "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Capture panel */}
      {selected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Camera className="w-4 h-4" style={{ color: "#1a3a6b" }} />
                Photo — {selected.surname}, {selected.otherNames}
              </CardTitle>
              {/* Mode toggle */}
              <div className="flex rounded border border-gray-200 overflow-hidden text-xs font-semibold">
                <button
                  onClick={() => switchMode("upload")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 ${mode === "upload" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  <Upload className="w-3 h-3" /> Upload File
                </button>
                <button
                  onClick={() => switchMode("camera")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border-l border-gray-200 ${mode === "camera" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  <Video className="w-3 h-3" /> Use Camera
                </button>
                <button
                  onClick={() => switchMode("signature")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border-l border-gray-200 ${mode === "signature" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  <PenLine className="w-3 h-3" /> Signature
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Current photo */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Current Photo</p>
                <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center">
                  {selected.photoUrl ? (
                    <img src={assetUrl(selected.photoUrl)} alt="Current" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-gray-400">
                      <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">No photo on file</p>
                    </div>
                  )}
                </div>
              </div>

              {/* New photo capture / signature */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  {mode === "signature" ? "Signature Capture" : "New Photo"}
                </p>

                {mode === "upload" ? (
                  <>
                    <div className="aspect-[3/4] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center mb-3">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center text-gray-400">
                          <Upload className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          <p className="text-xs">Click below to select a photo</p>
                        </div>
                      )}
                    </div>
                    <input type="file" accept="image/*" onChange={handleFileChange} disabled={!canUpload}
                      className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 disabled:opacity-50 mb-2" />
                  </>
                ) : mode === "camera" ? (
                  <>
                    {/* Live camera view */}
                    <div className="aspect-[3/4] bg-gray-900 rounded-lg overflow-hidden border-2 border-dashed border-gray-600 flex items-center justify-center mb-3 relative">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Captured" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <video ref={videoRef} className={`w-full h-full object-cover ${streaming ? "" : "hidden"}`} playsInline muted />
                          {!streaming && (
                            <div className="text-center text-gray-400">
                              <VideoOff className="w-10 h-10 mx-auto mb-2 opacity-40" />
                              <p className="text-xs">Camera not started</p>
                            </div>
                          )}
                          {/* ICAO face oval guide overlay */}
                          {streaming && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-24 h-32 rounded-full border-2 border-yellow-400 border-dashed opacity-60" />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <canvas ref={canvasRef} className="hidden" />

                    {cameraErr && (
                      <p className="text-xs text-red-600 mb-2">{cameraErr}</p>
                    )}

                    {!photoPreview ? (
                      <div className="flex gap-2 mb-2">
                        {!streaming ? (
                          <button onClick={startCamera} disabled={!canUpload}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs font-bold text-white disabled:opacity-60"
                            style={{ background: "#1a3a6b" }}>
                            <Video className="w-3.5 h-3.5" /> Start Camera
                          </button>
                        ) : (
                          <>
                            <button onClick={captureFrame}
                              className="flex-1 py-2 rounded text-xs font-bold text-white"
                              style={{ background: "#006B3F" }}>
                              Capture Photo
                            </button>
                            <button onClick={stopCamera}
                              className="px-3 py-2 rounded border border-gray-300 text-xs font-medium hover:bg-gray-50">
                              Stop
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                        className="w-full py-1.5 mb-2 rounded border border-gray-300 text-xs font-medium hover:bg-gray-50">
                        Retake
                      </button>
                    )}
                  </>
                ) : null}

                {mode !== "signature" && (
                  <>
                    <button onClick={handleUpload} disabled={uploading || !photoFile || !canUpload}
                      className="w-full py-2 rounded text-sm font-bold text-white disabled:opacity-60"
                      style={{ background: "#006B3F" }}>
                      {uploading ? "Uploading…" : !canUpload ? "No upload permission" : "Upload Photo"}
                    </button>
                    <p className="text-xs text-gray-400 mt-2">
                      ICAO 9303: plain background, neutral expression, no glasses, face centred.
                    </p>
                  </>
                )}

                {mode === "signature" && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Draw Signature</p>
                    <canvas
                      ref={sigCanvasRef}
                      width={300} height={120}
                      className="w-full border-2 border-dashed border-gray-300 rounded bg-white cursor-crosshair touch-none"
                      style={{ height: 120 }}
                      onMouseDown={sigStart}
                      onMouseMove={sigMove}
                      onMouseUp={sigEnd}
                      onMouseLeave={sigEnd}
                    />
                    <div className="flex gap-2">
                      <button onClick={sigClear} className="flex-1 py-1.5 rounded border border-gray-300 text-xs font-medium hover:bg-gray-50">
                        Clear
                      </button>
                      <button onClick={handleSignatureUpload} disabled={uploading || !sigHasData || !canUpload}
                        className="flex-1 py-1.5 rounded text-xs font-bold text-white disabled:opacity-60"
                        style={{ background: "#006B3F" }}>
                        {uploading ? "Saving…" : "Save Signature"}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400">Sign within the box using mouse or touchscreen.</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
