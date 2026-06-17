"use client";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import Sidebar from "@/components/admin/Sidebar";
import TopBar from "@/components/admin/TopBar";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  useSessionTimeout();
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireAuth userType="admin">
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </ProtectedRoute>
  );
}
