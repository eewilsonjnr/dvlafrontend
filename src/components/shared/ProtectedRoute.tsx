"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { adminHasAnyPermission, type PermissionName } from "@/lib/permissions";
import type { AdminUser } from "@/types";

interface Props {
  children: React.ReactNode;
  requireAuth?: boolean;
  userType?: "admin";
  permissions?: PermissionName[];
}

export default function ProtectedRoute({ children, requireAuth = true, userType, permissions }: Props) {
  const { isAuthenticated, isLoading, userType: currentType, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (requireAuth && !isAuthenticated) { router.push("/admin-login"); return; }
    if (userType && currentType !== userType) { router.push("/admin-login"); return; }
    if (permissions?.length && currentType === "admin") {
      if (!adminHasAnyPermission(user as AdminUser, permissions)) {
        router.push("/admin/dashboard"); return;
      }
    }
  }, [isLoading, isAuthenticated, currentType, userType, permissions, router, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: "var(--dvla-navy)" }} />
      </div>
    );
  }
  if (!isAuthenticated || (userType && currentType !== userType)) return null;
  if (permissions?.length && currentType === "admin" && !adminHasAnyPermission(user as AdminUser, permissions)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-6xl">🔒</div>
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-gray-500 text-sm">You do not have permission to view this page.</p>
        <button onClick={() => router.push("/admin/dashboard")}
          className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: "var(--dvla-navy)" }}>
          Back to Dashboard
        </button>
      </div>
    );
  }
  return <>{children}</>;
}
