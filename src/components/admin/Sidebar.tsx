"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FilePlus, Camera, BookOpen,
  Printer, FileText, Settings, Users,
  Building2, Globe, Network, Layers, BarChart2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import type { OfficeType } from "@/types";

const OFFICE_TYPE_ICON: Record<OfficeType, React.ElementType> = {
  HEAD_OFFICE:     Globe,
  REGIONAL_CENTRE: Network,
  DISTRICT_OFFICE: Layers,
};

const OFFICE_TYPE_LABEL: Record<OfficeType, string> = {
  HEAD_OFFICE:     "Head Office",
  REGIONAL_CENTRE: "Regional Centre",
  DISTRICT_OFFICE: "District Office",
};

const navItems = [
  { href: "/admin/dashboard",        icon: LayoutDashboard, label: "Dashboard",         permission: null,               roles: ["Operator","Administrator","Supervisor"] },
  { href: "/admin/new-application",  icon: FilePlus,        label: "New Application",   permission: "CREATE_PERMIT",    roles: ["Operator","Administrator"] },
  { href: "/admin/permits",          icon: BookOpen,        label: "Permits",           permission: "VIEW_PERMITS",     roles: ["Operator","Administrator","Supervisor"] },
  { href: "/admin/biometric",        icon: Camera,          label: "Biometric Capture", permission: "UPLOAD_BIOMETRIC", roles: ["Operator","Administrator"] },
  { href: "/admin/print-queue",      icon: Printer,         label: "Print Queue",       permission: "MANAGE_PRINT",     roles: ["Operator","Administrator"] },
  { href: "/admin/reports",          icon: BarChart2,       label: "Reports",           permission: "VIEW_PERMITS",     roles: ["Operator","Administrator","Supervisor"] },
  { href: "/admin/audit",            icon: FileText,        label: "Audit Log",         permission: "VIEW_AUDIT_LOGS",  roles: ["Operator","Administrator","Supervisor"] },
  { href: "/admin/users",            icon: Users,           label: "User Management",   permission: "MANAGE_USERS",     roles: ["Administrator"] },
  { href: "/admin/centres",          icon: Building2,       label: "Centres",           permission: "MANAGE_CENTRES",   roles: ["Administrator"] },
  { href: "/admin/settings",         icon: Settings,        label: "System Settings",   permission: "MANAGE_SETTINGS",  roles: ["Administrator"] },
] as const;

const SECTIONS = [
  {
    title: "Operations",
    items: ["Dashboard","New Application","Permits","Biometric Capture"],
  },
  {
    title: "Production",
    items: ["Print Queue"],
  },
  {
    title: "Administration",
    items: ["Reports","Audit Log","User Management","Centres","System Settings"],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const dvlaRole = (user as any)?.dvlaRole ?? "Operator";

  // Filter by both role and permission
  const filtered = navItems.filter(item => {
    if (!item.roles.includes(dvlaRole)) return false;
    if (item.permission && !hasPermission(item.permission as any)) return false;
    return true;
  });

  const itemsByLabel = Object.fromEntries(filtered.map(i => [i.label, i]));

  // Office context from JWT
  const officeId   = (user as any)?.officeId as string | null | undefined;
  const officeData = (user as any)?.office as { name?: string; type?: OfficeType; regionName?: string; town?: string } | null | undefined;
  const officeType = officeData?.type as OfficeType | undefined;
  const OfficeBadgeIcon = officeType ? OFFICE_TYPE_ICON[officeType] : Building2;

  return (
    <aside
      className="w-60 shrink-0 flex flex-col h-full border-r"
      style={{ background: "#0a1f44", borderColor: "#1a3a6b" }}
    >
      {/* Branding */}
      <div className="px-4 py-4 border-b" style={{ borderColor: "#1a3a6b" }}>
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="DVLA Ghana"
            width={44}
            height={44}
            className="shrink-0 object-contain"
            style={{ width: 44, height: 'auto' }}
          />
          <div className="leading-tight">
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#FCD116" }}>Republic of Ghana</p>
            <p className="text-white font-black text-sm leading-tight">DVLA Ghana</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>IDP / ICMV System</p>
          </div>
        </div>
        {/* Ghana flag strip */}
        <div className="mt-3 h-1 w-full rounded overflow-hidden flex">
          <div className="flex-1" style={{ background: "#006B3F" }} />
          <div className="flex-1" style={{ background: "#FCD116" }} />
          <div className="flex-1" style={{ background: "#CE1126" }} />
        </div>
      </div>

      {/* Office context badge */}
      {officeId && (
        <div className="px-4 py-2.5 border-b" style={{ borderColor: "#1a3a6b", background: "rgba(255,255,255,0.04)" }}>
          <div className="flex items-start gap-2">
            <OfficeBadgeIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#FCD116" }} />
            <div className="min-w-0">
              {officeType && (
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.30)" }}>
                  {OFFICE_TYPE_LABEL[officeType]}
                </p>
              )}
              <p className="text-xs font-semibold text-white truncate leading-tight">
                {officeData?.name ?? "Unknown Office"}
              </p>
              {officeData?.regionName && (
                <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.40)" }}>
                  {officeData.regionName}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {SECTIONS.map(section => {
          const sectionItems = section.items.map(l => itemsByLabel[l]).filter(Boolean);
          if (!sectionItems.length) return null;
          return (
            <div key={section.title} className="mb-4">
              <p
                className="px-4 mb-1 text-xs font-bold uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.30)" }}
              >
                {section.title}
              </p>
              {sectionItems.map(({ href, icon: Icon, label }) => {
                const active = pathname === href || ((href as string) !== "/admin" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2.5 mx-2 px-3 py-2 rounded text-sm transition-colors",
                      active
                        ? "text-white font-semibold"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                    style={active ? { background: "rgba(255,255,255,0.10)", borderLeft: "3px solid #FCD116", paddingLeft: "calc(0.75rem - 3px)" } : {}}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer flag */}
      <div className="px-4 py-3 border-t" style={{ borderColor: "#1a3a6b" }}>
        <div className="flex items-center gap-2">
          <Image
            src="/ghana-flag.svg"
            alt="Ghana Flag"
            width={28}
            height={18}
            className="rounded border opacity-70"
            style={{ borderColor: "rgba(255,255,255,0.2)" }}
          />
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.30)" }}>
            &copy; {new Date().getFullYear()} DVLA Ghana
          </p>
        </div>
      </div>
    </aside>
  );
}
