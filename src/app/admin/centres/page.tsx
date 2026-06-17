"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Building2, MapPin, Phone, Users, FileText, ChevronRight,
  ChevronDown, Plus, Pencil, ToggleLeft, ToggleRight, X, Save,
  Globe, Network, Layers,
} from "lucide-react";
import api from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import type { DvlaOffice, OfficeType } from "@/types";

// ─── Type label helpers ───────────────────────────────────────────────────────

const TYPE_LABEL: Record<OfficeType, string> = {
  HEAD_OFFICE:      "Head Office",
  REGIONAL_CENTRE:  "Regional Centre",
  DISTRICT_OFFICE:  "District Office",
};

const TYPE_ICON: Record<OfficeType, React.ElementType> = {
  HEAD_OFFICE:     Globe,
  REGIONAL_CENTRE: Network,
  DISTRICT_OFFICE: Layers,
};

const TYPE_COLOR: Record<OfficeType, string> = {
  HEAD_OFFICE:     "#0a1f44",
  REGIONAL_CENTRE: "#006B3F",
  DISTRICT_OFFICE: "#4f46e5",
};

// ─── Extended office with counts ─────────────────────────────────────────────

interface OfficeWithCounts extends DvlaOffice {
  _count?: { adminUsers: number; permits: number };
  childOffices?: OfficeWithCounts[];
}

// ─── Office form ─────────────────────────────────────────────────────────────

interface OfficeFormData {
  name: string;
  type: OfficeType;
  regionName: string;
  town: string;
  address: string;
  phone: string;
  placeOfIssueLabel: string;
  printerName: string;
  parentOfficeId: string;
}

const EMPTY_FORM: OfficeFormData = {
  name: "", type: "REGIONAL_CENTRE", regionName: "", town: "",
  address: "", phone: "", placeOfIssueLabel: "", printerName: "", parentOfficeId: "",
};

// ─── OfficeCard ───────────────────────────────────────────────────────────────

function OfficeCard({
  office, depth, canManage, onEdit, onToggle,
}: {
  office: OfficeWithCounts;
  depth: number;
  canManage: boolean;
  onEdit: (o: OfficeWithCounts) => void;
  onToggle: (o: OfficeWithCounts) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const Icon = TYPE_ICON[office.type];
  const hasChildren = (office.childOffices?.length ?? 0) > 0;

  return (
    <div className={`${depth > 0 ? "ml-6 border-l-2 pl-4" : ""}`} style={{ borderColor: depth > 0 ? "#e5e7eb" : "transparent" }}>
      <div
        className={`group flex items-start gap-3 p-3 rounded-lg mb-2 border transition-all ${
          office.isActive ? "bg-white border-gray-200 hover:border-gray-300" : "bg-gray-50 border-gray-200 opacity-60"
        }`}
      >
        {/* Expand toggle */}
        {hasChildren ? (
          <button onClick={() => setExpanded(e => !e)} className="mt-0.5 text-gray-400 hover:text-gray-600 flex-shrink-0">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <div className="w-4 flex-shrink-0" />
        )}

        {/* Icon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: TYPE_COLOR[office.type] + "15" }}
        >
          <Icon className="w-4 h-4" style={{ color: TYPE_COLOR[office.type] }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 truncate">{office.name}</span>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ background: TYPE_COLOR[office.type] + "15", color: TYPE_COLOR[office.type] }}
            >
              {TYPE_LABEL[office.type]}
            </span>
            {!office.isActive && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">Inactive</span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            {office.regionName && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {office.regionName}
              </span>
            )}
            {office.town && office.town !== office.regionName && (
              <span className="text-xs text-gray-500">{office.town}</span>
            )}
            {office.phone && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Phone className="w-3 h-3" /> {office.phone}
              </span>
            )}
          </div>
          {office.placeOfIssueLabel && (
            <p className="text-xs text-gray-400 mt-0.5">
              Issues as: <span className="font-medium text-gray-600">{office.placeOfIssueLabel}</span>
            </p>
          )}
          {/* Counts */}
          {office._count && (
            <div className="flex items-center gap-4 mt-1.5">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Users className="w-3 h-3" /> {office._count.adminUsers} staff
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <FileText className="w-3 h-3" /> {office._count.permits} permits
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        {canManage && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={() => onEdit(office)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              title="Edit office"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            {office.type !== "HEAD_OFFICE" && (
              <button
                onClick={() => onToggle(office)}
                className={`p-1.5 rounded transition-colors ${
                  office.isActive
                    ? "hover:bg-red-50 text-gray-400 hover:text-red-500"
                    : "hover:bg-green-50 text-gray-400 hover:text-green-600"
                }`}
                title={office.isActive ? "Deactivate" : "Reactivate"}
              >
                {office.isActive ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {office.childOffices!.map(child => (
            <OfficeCard
              key={child.id}
              office={child}
              depth={depth + 1}
              canManage={canManage}
              onEdit={onEdit}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Office form modal ────────────────────────────────────────────────────────

function OfficeModal({
  initial, allOffices, onSave, onClose,
}: {
  initial?: OfficeWithCounts;
  allOffices: OfficeWithCounts[];
  onSave: (data: OfficeFormData) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<OfficeFormData>(
    initial
      ? {
          name: initial.name, type: initial.type, regionName: initial.regionName ?? "",
          town: initial.town ?? "", address: initial.address ?? "", phone: initial.phone ?? "",
          placeOfIssueLabel: initial.placeOfIssueLabel ?? "", printerName: initial.printerName ?? "",
          parentOfficeId: initial.parentOfficeId ?? "",
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (k: keyof OfficeFormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await onSave(form);
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to save office");
    } finally {
      setSaving(false);
    }
  };

  const parentOptions = allOffices.filter(o =>
    o.id !== initial?.id && o.type !== "DISTRICT_OFFICE"
  );

  const labelFor = (id: string) => allOffices.find(o => o.id === id)?.name ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ borderLeft: "4px solid #006B3F" }}>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" style={{ color: "#006B3F" }} />
            <h2 className="text-sm font-bold text-gray-900">
              {initial ? "Edit Office" : "Add New Office"}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Office Name *</label>
              <input
                required value={form.name} onChange={e => set("name", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700"
                placeholder="e.g. DVLA Regional Centre — Kumasi"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Office Type *</label>
              <select
                value={form.type} onChange={e => set("type", e.target.value as OfficeType)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-700"
                disabled={!!initial}
              >
                <option value="REGIONAL_CENTRE">Regional Centre</option>
                <option value="DISTRICT_OFFICE">District Office</option>
                {!initial && <option value="HEAD_OFFICE">Head Office</option>}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Parent Office</label>
              <select
                value={form.parentOfficeId} onChange={e => set("parentOfficeId", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-700"
              >
                <option value="">— None (root level) —</option>
                {parentOptions.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              {form.parentOfficeId && (
                <p className="text-xs text-gray-400 mt-1">Parent: {labelFor(form.parentOfficeId)}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Region Name</label>
              <input
                value={form.regionName} onChange={e => set("regionName", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-700"
                placeholder="e.g. Ashanti Region"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Town / City</label>
              <input
                value={form.town} onChange={e => set("town", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-700"
                placeholder="e.g. Kumasi"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Address</label>
              <input
                value={form.address} onChange={e => set("address", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-700"
                placeholder="e.g. P.O. Box KS 1234, Adum, Kumasi"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Phone</label>
              <input
                value={form.phone} onChange={e => set("phone", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-700"
                placeholder="+233 3220 12345"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Place of Issue Label</label>
              <input
                value={form.placeOfIssueLabel} onChange={e => set("placeOfIssueLabel", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-700"
                placeholder="e.g. DVLA — Kumasi"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Assigned Printer</label>
              <input
                value={form.printerName} onChange={e => set("printerName", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-700"
                placeholder="e.g. Matica P4000 — Kumasi"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: "#006B3F" }}>
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : "Save Office"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: color + "15" }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-black text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CentresPage() {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission("MANAGE_CENTRES");

  const [hqTree, setHqTree]         = useState<OfficeWithCounts | null>(null);
  const [flatList, setFlatList]     = useState<OfficeWithCounts[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<OfficeWithCounts | undefined>();

  const load = useCallback(async () => {
    try {
      const [treeRes, flatRes] = await Promise.all([
        api.get("/centres"),
        api.get("/centres?flat=true"),
      ]);
      setHqTree(treeRes.data);
      setFlatList(flatRes.data);
    } catch {
      setError("Failed to load offices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data: OfficeFormData) => {
    if (editing) {
      await api.put(`/centres/${editing.id}`, data);
    } else {
      await api.post("/centres", data);
    }
    setModalOpen(false);
    setEditing(undefined);
    load();
  };

  const handleToggle = async (office: OfficeWithCounts) => {
    if (office.isActive) {
      await api.delete(`/centres/${office.id}`);
    } else {
      await api.put(`/centres/${office.id}`, { isActive: true });
    }
    load();
  };

  const openEdit = (office: OfficeWithCounts) => {
    setEditing(office);
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditing(undefined);
    setModalOpen(true);
  };

  // Counts
  const hqCount       = flatList.filter(o => o.type === "HEAD_OFFICE").length;
  const regionalCount = flatList.filter(o => o.type === "REGIONAL_CENTRE").length;
  const districtCount = flatList.filter(o => o.type === "DISTRICT_OFFICE").length;
  const activeCount   = flatList.filter(o => o.isActive).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-gray-900">Centre Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            DVLA office hierarchy — Head Office, Regional Centres, District Offices
          </p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white shadow-sm"
            style={{ background: "#006B3F" }}
          >
            <Plus className="w-4 h-4" /> Add Office
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <SummaryCard label="Head Office"       value={hqCount}       icon={Globe}   color="#0a1f44" />
        <SummaryCard label="Regional Centres"  value={regionalCount} icon={Network} color="#006B3F" />
        <SummaryCard label="District Offices"  value={districtCount} icon={Layers}  color="#4f46e5" />
        <SummaryCard label="Active Offices"    value={activeCount}   icon={ToggleRight} color="#22c55e" />
      </div>

      {/* Ghana flag divider */}
      <div className="h-1 w-full rounded overflow-hidden flex mb-5">
        <div className="flex-1" style={{ background: "#CE1126" }} />
        <div className="flex-1" style={{ background: "#FCD116" }} />
        <div className="flex-1" style={{ background: "#006B3F" }} />
      </div>

      {/* Office tree */}
      {loading && (
        <div className="text-center py-12 text-gray-400 text-sm">Loading office hierarchy…</div>
      )}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}
      {!loading && !error && hqTree && (
        <OfficeCard
          office={hqTree}
          depth={0}
          canManage={canManage}
          onEdit={openEdit}
          onToggle={handleToggle}
        />
      )}
      {!loading && !error && !hqTree && flatList.length > 0 && (
        <div className="space-y-2">
          {flatList.map(o => (
            <OfficeCard key={o.id} office={o} depth={0} canManage={canManage} onEdit={openEdit} onToggle={handleToggle} />
          ))}
        </div>
      )}

      {/* Modals */}
      {modalOpen && (
        <OfficeModal
          initial={editing}
          allOffices={flatList}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditing(undefined); }}
        />
      )}
    </div>
  );
}
