"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, KeyRound, ChevronDown, Eye, EyeOff, X, Activity, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import api from "@/lib/api";
import type { OfficeType } from "@/types";

export default function TopBar() {
  const { user, logout } = useAuth();
  const { hasPermission } = usePermissions();
  const canViewAudit = hasPermission("VIEW_AUDIT_LOGS");
  const router = useRouter();
  const dvlaRole = (user as any)?.dvlaRole ?? "Operator";
  const userId   = (user as any)?.id ?? "";
  const initials = `${(user as any)?.firstName?.charAt(0) ?? ""}${(user as any)?.lastName?.charAt(0) ?? ""}`.toUpperCase() || "U";

  const [menuOpen, setMenuOpen]     = useState(false);
  const [pwdModal, setPwdModal]     = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <header
        className="h-14 flex-shrink-0 flex items-center justify-between px-6 border-b bg-white"
        style={{ borderColor: "#e5e7eb" }}
      >
        {/* Left: office context */}
        <div className="flex items-center gap-3">
          <div className="h-5 w-0.5 rounded" style={{ background: "#006B3F" }} />
          <span className="text-xs font-bold tracking-widest uppercase text-gray-400 hidden sm:block">
            DVLA IDP / ICMV Issuance Platform
          </span>
          {/* Office badge — shown when user is scoped to an office */}
          {(user as any)?.officeId && (
            <div
              className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium"
              style={{ borderColor: "#006B3F22", background: "#006B3F08", color: "#006B3F" }}
            >
              <Building2 className="w-3 h-3" />
              <span className="truncate max-w-[200px]">
                {(user as any)?.office?.name ?? "Assigned Office"}
              </span>
            </div>
          )}
        </div>

        {/* Right: user menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            {/* Avatar */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
              style={{ background: "#0a1f44" }}
            >
              {initials}
            </div>
            <div className="text-left leading-tight hidden sm:block">
              <p className="text-xs font-semibold text-gray-900 max-w-[140px] truncate">
                {(user as any)?.firstName} {(user as any)?.lastName}
              </p>
              <p className="text-xs text-gray-400">{dvlaRole}</p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-52 bg-white rounded-lg border border-gray-200 shadow-lg z-50 overflow-hidden">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-bold text-gray-900 truncate">
                  {(user as any)?.firstName} {(user as any)?.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">{(user as any)?.email}</p>
                <span
                  className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded font-semibold text-white"
                  style={{ background: "#006B3F" }}
                >
                  {dvlaRole}
                </span>
              </div>

              {/* Actions */}
              {canViewAudit && (
                <button
                  onClick={() => { setMenuOpen(false); router.push(`/admin/audit?operatorId=${userId}`); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Activity className="w-4 h-4 text-gray-400" />
                  My Activity
                </button>
              )}

              <button
                onClick={() => { setMenuOpen(false); setPwdModal(true); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <KeyRound className="w-4 h-4 text-gray-400" />
                Change Password
              </button>

              <div className="border-t border-gray-100" />

              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Password reset modal */}
      {pwdModal && <PasswordModal onClose={() => setPwdModal(false)} />}
    </>
  );
}

function PasswordModal({ onClose }: { onClose: () => void }) {
  const [current,  setCurrent]  = useState("");
  const [next,     setNext]     = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showCur,  setShowCur]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (next.length < 8)          { setError("New password must be at least 8 characters."); return; }
    if (next !== confirm)          { setError("New passwords do not match."); return; }
    setLoading(true);
    try {
      await api.put("/auth/admin/me/password", { currentPassword: current, newPassword: next });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100" style={{ borderLeft: "4px solid #006B3F" }}>
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" style={{ color: "#006B3F" }} />
            <h2 className="text-sm font-bold text-gray-900">Change Password</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5">
          {success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "#dcfce7" }}>
                <KeyRound className="w-6 h-6" style={{ color: "#006B3F" }} />
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Password Changed</p>
              <p className="text-xs text-gray-500">Your password has been updated successfully.</p>
              <button
                onClick={onClose}
                className="mt-4 px-5 py-2 rounded text-sm font-bold text-white w-full"
                style={{ background: "#006B3F" }}
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCur ? "text" : "password"}
                    value={current} required
                    onChange={e => setCurrent(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700 pr-10"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowCur(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showCur ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={next} required minLength={8}
                    onChange={e => setNext(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700 pr-10"
                    placeholder="Min. 8 characters"
                  />
                  <button type="button" onClick={() => setShowNew(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-1.5 space-y-0.5">
                  {[
                    { ok: next.length >= 8,          label: "At least 8 characters" },
                    { ok: /[A-Z]/.test(next),        label: "One uppercase letter" },
                    { ok: /\d/.test(next),           label: "One number" },
                  ].map(({ ok, label }) => (
                    <p key={label} className={`text-xs flex items-center gap-1 ${ok ? "text-green-600" : "text-gray-400"}`}>
                      <span>{ok ? "✓" : "○"}</span> {label}
                    </p>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirm} required
                  onChange={e => setConfirm(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700"
                  placeholder="Re-enter new password"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded text-sm font-bold text-white disabled:opacity-60" style={{ background: "#006B3F" }}>
                  {loading ? "Saving…" : "Change Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
