"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Users, Printer, Clock, CheckCircle, TrendingUp, AlertTriangle, Activity, Droplets } from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface Stats {
  issuedToday: number;
  pending: number;
  rejected: number;
  totalThisMonth: number;
  totalApplicants: number;
  expiringIn30Days: number;
  printStats: { queued: number; printing: number; complete: number; error: number };
}
interface Activity { id: string; action: string; operatorName?: string; outcome: string; createdAt: string; }
interface ExpiringPermit { id: string; referenceNumber: string; permitType: string; dateOfExpiry?: string; }

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-3xl font-bold" style={{ color }}>{value}</p>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InkBar({ label, pct, hex }: { label: string; pct: number; hex: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs font-bold" style={{ color: hex }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: hex }} />
      </div>
    </div>
  );
}

interface PrinterStatus {
  configured: boolean;
  online?: boolean;
  printerName?: string;
  ink?: { C: number; M: number; Y: number; K: number } | null;
  serial?: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats]             = useState<Stats | null>(null);
  const [activity, setActivity]       = useState<Activity[]>([]);
  const [expiring, setExpiring]       = useState<ExpiringPermit[]>([]);
  const [printer, setPrinter]         = useState<PrinterStatus | null>(null);

  useEffect(() => {
    api.get("/dashboard/stats").then(r => setStats(r.data)).catch(console.error);
    api.get("/dashboard/recent-activity").then(r => setActivity(r.data)).catch(console.error);
    api.get("/dashboard/expiring-permits").then(r => setExpiring(r.data)).catch(console.error);
    api.get("/dashboard/printer-status").then(r => setPrinter(r.data)).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Operator Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Today&apos;s operational overview</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={CheckCircle}    label="Issued Today"    value={stats?.issuedToday ?? "—"}        color="#006B3F" />
        <StatCard icon={Clock}          label="Pending"         value={stats?.pending ?? "—"}             color="#d97706" />
        <StatCard icon={FileText}       label="Rejected"        value={stats?.rejected ?? "—"}            color="#dc2626" />
        <StatCard icon={TrendingUp}     label="This Month"      value={stats?.totalThisMonth ?? "—"}      color="#0891b2" />
        <StatCard icon={Users}          label="Total Applicants"value={stats?.totalApplicants ?? "—"}     color="#7c3aed" />
        <StatCard icon={AlertTriangle}  label="Expiring (30d)"  value={stats?.expiringIn30Days ?? "—"}    color="#ea580c" />
      </div>

      {/* Expiry alerts */}
      {expiring.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-amber-700">Permits Expiring Within 30 Days</span>
              <span className="ml-auto text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">{expiring.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 font-semibold text-gray-500 uppercase tracking-wide">Reference</th>
                  <th className="text-left py-2 pr-4 font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="text-left py-2 font-semibold text-gray-500 uppercase tracking-wide">Expiry</th>
                </tr>
              </thead>
              <tbody>
                {expiring.slice(0, 8).map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/admin/permits/${p.id}`)}>
                    <td className="py-2 pr-4 font-mono font-semibold" style={{ color: "#1a3a6b" }}>{p.referenceNumber}</td>
                    <td className="py-2 pr-4"><span className="border border-gray-300 rounded px-1.5 py-0.5 text-xs">{p.permitType}</span></td>
                    <td className="py-2 text-gray-500">{p.dateOfExpiry ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Printer status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Printer className="w-4 h-4" style={{ color: "#1a3a6b" }} />
              Printer Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!printer ? (
              <div className="p-4 text-xs text-gray-400 text-center">Checking printer…</div>
            ) : !printer.configured ? (
              <div className="p-3 rounded-lg bg-gray-50 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-600">{printer.printerName ?? "No printer configured"}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                    <span className="text-xs font-medium text-gray-500">Not configured</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400">Set the printer endpoint in System Settings to enable status monitoring.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{printer.printerName}</p>
                    {printer.serial && <p className="text-xs text-gray-400 font-mono">S/N: {printer.serial}</p>}
                    <p className="text-xs text-gray-500">SURYS P4000 Thermal Inkjet</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${printer.online ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                    <span className={`text-xs font-medium ${printer.online ? "text-green-600" : "text-red-600"}`}>
                      {printer.online ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
                {printer.ink ? (
                  <div className="px-1 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                      <Droplets className="w-3 h-3" /> Ink Levels
                    </p>
                    <InkBar label="Cyan"    pct={printer.ink.C} hex="#0891b2" />
                    <InkBar label="Magenta" pct={printer.ink.M} hex="#db2777" />
                    <InkBar label="Yellow"  pct={printer.ink.Y} hex="#ca8a04" />
                    <InkBar label="Black"   pct={printer.ink.K} hex="#374151" />
                  </div>
                ) : printer.online ? (
                  <p className="text-xs text-gray-400 px-1">Ink levels not reported by this endpoint.</p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Print queue summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Printer className="w-4 h-4" style={{ color: "#1a3a6b" }} />
              Print Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Queued",   value: stats?.printStats?.queued   ?? 0, color: "text-yellow-700 bg-yellow-100" },
                { label: "Printing", value: stats?.printStats?.printing ?? 0, color: "text-blue-700 bg-blue-100" },
                { label: "Complete", value: stats?.printStats?.complete ?? 0, color: "text-green-700 bg-green-100" },
                { label: "Error",    value: stats?.printStats?.error    ?? 0, color: "text-red-700 bg-red-100" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
                  <span className="text-lg font-bold text-gray-900">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" style={{ color: "#1a3a6b" }} />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activity.length > 0 ? activity.slice(0, 6).map(log => (
                <div key={log.id} className="flex items-start gap-2.5 py-1.5 border-b border-gray-50 last:border-0">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${log.outcome === "success" ? "bg-green-500" : log.outcome === "failure" ? "bg-red-500" : "bg-yellow-500"}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{log.action.replace(/_/g, " ")}</p>
                    <p className="text-xs text-gray-400">{log.operatorName} · {new Date(log.createdAt).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              )) : <p className="text-xs text-gray-400 text-center py-4">No recent activity</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
