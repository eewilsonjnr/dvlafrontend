"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AdminLoginPage() {
  const router = useRouter();
  const { loginAdmin, confirmMfa } = useAuth();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // MFA second step
  const [mfaRequired, setMfaRequired]         = useState(false);
  const [mfaSetupRequired, setMfaSetupRequired] = useState(false);
  const [mfaMethod, setMfaMethod]               = useState<"totp" | "email">("email");
  const [otpSentTo, setOtpSentTo]               = useState("");
  const [tempToken, setTempToken]               = useState("");
  const [totpCode, setTotpCode]                 = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const result = await loginAdmin(email, password);
    setLoading(false);
    if (result.success) {
      router.push("/admin/dashboard");
    } else if ((result as any).mfaRequired) {
      setTempToken((result as any).tempToken ?? "");
      setMfaSetupRequired(!!(result as any).mfaSetupRequired);
      setMfaMethod((result as any).mfaMethod ?? "email");
      setOtpSentTo((result as any).otpSentTo ?? "");
      setMfaRequired(true);
    } else {
      setError((result as any).error || "Login failed");
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const result = await confirmMfa(tempToken, totpCode);
    setLoading(false);
    if (result.success) {
      router.push("/admin/dashboard");
    } else {
      setError((result as any).error || "MFA verification failed");
    }
  };

  const leftPanel = (
    <div
      className="hidden lg:flex lg:w-1/2 flex-col items-center justify-between px-12 py-12"
      style={{ background: "linear-gradient(160deg, #0a1f44 0%, #1a3a6b 60%, #0d2d44 100%)" }}
    >
      <div className="self-end">
        <Image src="/ghana-flag.svg" alt="Ghana Flag" width={64} height={42}
          className="rounded shadow border border-white/20 object-cover" />
      </div>
      <div className="flex flex-col items-center text-center gap-5">
        <Image src="/logo.png" alt="DVLA Ghana" width={130} height={130} className="opacity-95 object-contain" style={{ width: 130, height: 'auto' }} />
        <div className="w-16 h-0.5 rounded" style={{ background: "#FCD116" }} />
        <p className="text-sm text-white/60 max-w-xs">
          International Driving Permit &amp; International Certificate for Motor Vehicles Issuance System
        </p>
        <p className="text-xs text-white/35 max-w-xs">
          ICAO 9303 compliant document production platform for authorised DVLA officers.
        </p>
      </div>
      <p className="text-xs text-white/30 text-center">&copy; {new Date().getFullYear()} DVLA Ghana. All rights reserved.</p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="h-2 w-full shrink-0" style={{ background: "linear-gradient(to right, #006B3F 33.3%, #FCD116 33.3%, #FCD116 66.6%, #CE1126 66.6%)" }} />
      <div className="flex flex-1">
        {leftPanel}

        <div className="w-full lg:w-1/2 flex flex-col">
          {/* Mobile top bar */}
          <div className="lg:hidden px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "#006B3F" }}>
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="DVLA Ghana" width={40} height={40} className="shrink-0 object-contain" style={{ width: 40, height: 'auto' }} />
              <div>
                <p className="text-xs font-bold" style={{ color: "#CE1126" }}>Republic of Ghana</p>
                <p className="text-sm font-black text-gray-900">DVLA Ghana</p>
              </div>
            </div>
            <Image src="/ghana-flag.svg" alt="Ghana Flag" width={44} height={29} className="rounded shadow border border-gray-200 object-cover" />
          </div>

          <div className="flex-1 flex items-center justify-center px-8 py-12 bg-gray-50">
            <div className="w-full max-w-sm bg-white rounded-lg border border-gray-200 shadow-md p-8">

              {!mfaRequired ? (
                <>
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-1 h-8 rounded" style={{ background: "#006B3F" }} />
                      <h2 className="text-2xl font-black text-gray-900">Operator Sign In</h2>
                    </div>
                    <p className="text-sm text-gray-500 ml-4">Enter your credentials to access the DVLA portal.</p>
                  </div>

                  {error && (
                    <div className="mb-5 p-3 rounded bg-red-50 border border-red-200 flex items-start gap-2 text-red-700 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Email Address</label>
                      <input
                        type="email" value={email} required
                        onChange={e => setEmail(e.target.value)}
                        placeholder="operator@dvla.gov.gh"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Password</label>
                      <div className="relative">
                        <input
                          type={showPwd ? "text" : "password"} value={password} required
                          onChange={e => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700 pr-10"
                        />
                        <button type="button" onClick={() => setShowPwd(!showPwd)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <button type="submit" disabled={loading}
                      className="w-full py-3 rounded text-sm font-bold text-white transition-opacity disabled:opacity-60 mt-2"
                      style={{ background: "#006B3F" }}>
                      {loading ? "Signing in…" : "Sign In"}
                    </button>
                  </form>
                </>
              ) : mfaSetupRequired ? (
                <>
                  <div className="mb-6 text-center">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-amber-50">
                      <ShieldCheck className="w-7 h-7 text-amber-600" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 mb-2">MFA Setup Required</h2>
                    <p className="text-sm text-gray-500">
                      Administrator accounts must have Two-Factor Authentication enabled before accessing the system.
                    </p>
                  </div>
                  <div className="p-4 rounded bg-amber-50 border border-amber-200 text-sm text-amber-800 space-y-2 mb-6">
                    <p className="font-semibold">To set up MFA:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Contact your system administrator to complete MFA setup via the Settings page.</li>
                      <li>Scan the QR code with Google Authenticator or Authy.</li>
                      <li>Return here and sign in — you will be prompted for your code.</li>
                    </ol>
                  </div>
                  <button type="button" onClick={() => { setMfaRequired(false); setMfaSetupRequired(false); setError(""); }}
                    className="w-full py-3 rounded text-sm font-bold text-white"
                    style={{ background: "#0a1f44" }}>
                    ← Back to Login
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-8 text-center">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#dcfce7" }}>
                      <ShieldCheck className="w-7 h-7" style={{ color: "#006B3F" }} />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 mb-1">Two-Factor Authentication</h2>
                    {mfaMethod === "email" ? (
                      <p className="text-sm text-gray-500">
                        A 6-digit code was sent to your email{otpSentTo ? <> (<span className="font-medium text-gray-700">{otpSentTo}</span>)</> : ""}. Enter it below.
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">Enter the 6-digit code from your authenticator app.</p>
                    )}
                  </div>

                  {error && (
                    <div className="mb-5 p-3 rounded bg-red-50 border border-red-200 flex items-start gap-2 text-red-700 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleMfaSubmit} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                        {mfaMethod === "email" ? "Email Verification Code" : "Authenticator Code"}
                      </label>
                      <input
                        type="text" value={totpCode} required
                        onChange={e => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        className="w-full px-3 py-3 border border-gray-300 rounded text-2xl font-mono text-center tracking-widest text-gray-900 focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700"
                      />
                    </div>
                    <button type="submit" disabled={loading || totpCode.length < 6}
                      className="w-full py-3 rounded text-sm font-bold text-white disabled:opacity-60"
                      style={{ background: "#006B3F" }}>
                      {loading ? "Verifying…" : "Verify Code"}
                    </button>
                    <button type="button" onClick={() => { setMfaRequired(false); setError(""); setTotpCode(""); }}
                      className="w-full py-2 text-xs text-gray-500 hover:text-gray-700">
                      ← Back to login
                    </button>
                  </form>
                </>
              )}

              <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400">
                  Authorised DVLA personnel only.<br />
                  Unauthorised access is prohibited and may be subject to prosecution.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
