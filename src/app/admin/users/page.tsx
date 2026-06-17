"use client";
import { useEffect, useState } from "react";
import { Users, Plus, RefreshCw, CheckCircle, XCircle, ShieldCheck, Save, Building2 } from "lucide-react";
import api from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectOption } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { Role, DvlaOffice } from "@/types";

const ALL_PERMISSIONS = [
  "VIEW_DASHBOARD", "VIEW_APPLICANTS", "CREATE_APPLICANT", "UPDATE_APPLICANT", "DELETE_APPLICANT",
  "VIEW_PERMITS", "CREATE_PERMIT", "APPROVE_PERMIT",
  "MANAGE_PRINT", "MANAGE_RFID", "MANAGE_QC", "UPLOAD_BIOMETRIC",
  "VIEW_AUDIT_LOGS", "EXPORT_AUDIT",
  "MANAGE_USERS", "MANAGE_SETTINGS", "MANAGE_CENTRES",
] as const;

interface AdminUserRow {
  id: string; email: string; firstName: string; lastName: string;
  dvlaRole: string; role?: { name: string }; isActive: boolean; createdAt: string;
}

type TabKey = "users" | "roles";

export default function UserManagementPage() {
  const { hasPermission, user: me } = usePermissions();
  const canManage  = hasPermission("MANAGE_USERS");

  const [tab, setTab]       = useState<TabKey>("users");
  const [users, setUsers]   = useState<AdminUserRow[]>([]);
  const [roles, setRoles]   = useState<Role[]>([]);
  const [offices, setOffices] = useState<Pick<DvlaOffice, "id" | "name" | "type" | "regionName">[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "", dvlaRole: "Operator", roleId: "", officeId: "", notificationEmail: "" });

  // Roles tab state
  const [showRoleForm, setShowRoleForm]   = useState(false);
  const [newRoleName, setNewRoleName]     = useState("");
  const [newRoleDesc, setNewRoleDesc]     = useState("");
  const [newRolePerms, setNewRolePerms]   = useState<Set<string>>(new Set());
  const [editPerms, setEditPerms]         = useState<Record<string, Set<string>>>({});
  const [savingRole, setSavingRole]       = useState<string | null>(null);
  const [roleMsg, setRoleMsg]             = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [u, r, o] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/roles").catch(() => ({ data: [] })),
        api.get("/centres?flat=true").catch(() => ({ data: [] })),
      ]);
      setUsers(u.data);
      const fetchedRoles: Role[] = r.data;
      setRoles(fetchedRoles);
      setOffices((o.data as DvlaOffice[]).filter(x => x.isActive));
      // Initialise editPerms from fetched roles
      const initial: Record<string, Set<string>> = {};
      fetchedRoles.forEach(role => { initial[role.id] = new Set(role.permissions.map(p => p.name)); });
      setEditPerms(initial);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setMsg(null);
    try {
      await api.post("/admin/users", form);
      setMsg({ type: "success", text: `User ${form.email} created.` });
      setForm({ email: "", password: "", firstName: "", lastName: "", dvlaRole: "Operator", roleId: "", officeId: "", notificationEmail: "" });
      setShowForm(false); fetchData();
    } catch (err: any) { setMsg({ type: "error", text: err.response?.data?.error ?? "Failed to create user." }); }
    finally { setSubmitting(false); }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try { await api.put(`/admin/users/${id}`, { isActive: !isActive }); fetchData(); }
    catch (e) { console.error(e); }
  };

  const togglePerm = (roleId: string, perm: string) => {
    setEditPerms(prev => {
      const next = new Set(prev[roleId] ?? []);
      next.has(perm) ? next.delete(perm) : next.add(perm);
      return { ...prev, [roleId]: next };
    });
  };

  const saveRole = async (roleId: string) => {
    setSavingRole(roleId); setRoleMsg(null);
    try {
      await api.put(`/admin/roles/${roleId}`, { permissionNames: Array.from(editPerms[roleId] ?? []) });
      setRoleMsg({ type: "success", text: "Role permissions updated." });
      fetchData();
    } catch (err: any) { setRoleMsg({ type: "error", text: err.response?.data?.error ?? "Failed to save role." }); }
    finally { setSavingRole(null); }
  };

  const createRole = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setRoleMsg(null);
    try {
      await api.post("/admin/roles", { name: newRoleName, description: newRoleDesc, permissionNames: Array.from(newRolePerms) });
      setRoleMsg({ type: "success", text: `Role "${newRoleName}" created.` });
      setNewRoleName(""); setNewRoleDesc(""); setNewRolePerms(new Set()); setShowRoleForm(false);
      fetchData();
    } catch (err: any) { setRoleMsg({ type: "error", text: err.response?.data?.error ?? "Failed to create role." }); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage DVLA operator accounts and permission roles.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-2 rounded border border-gray-300 text-sm font-medium hover:bg-gray-50">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          {canManage && tab === "users" && (
            <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-bold text-white" style={{ background: "#1a3a6b" }}>
              <Plus className="w-4 h-4" /> Add User
            </button>
          )}
          {canManage && tab === "roles" && (
            <button onClick={() => setShowRoleForm(!showRoleForm)} className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-bold text-white" style={{ background: "#1a3a6b" }}>
              <Plus className="w-4 h-4" /> New Role
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit text-sm font-semibold">
        <button onClick={() => setTab("users")} className={`flex items-center gap-2 px-4 py-2 ${tab === "users" ? "text-white" : "text-gray-500 hover:bg-gray-50"}`} style={tab === "users" ? { background: "#0a1f44" } : {}}>
          <Users className="w-4 h-4" /> Users
        </button>
        {canManage && (
          <button onClick={() => setTab("roles")} className={`flex items-center gap-2 px-4 py-2 border-l border-gray-200 ${tab === "roles" ? "text-white" : "text-gray-500 hover:bg-gray-50"}`} style={tab === "roles" ? { background: "#0a1f44" } : {}}>
            <ShieldCheck className="w-4 h-4" /> Roles & Permissions
          </button>
        )}
      </div>

      {/* ── USERS TAB ── */}
      {tab === "users" && (
        <>
          {msg && (
            <div className={`p-3 rounded text-sm ${msg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {msg.text}
            </div>
          )}

          {showForm && (
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Plus className="w-4 h-4" style={{ color: "#1a3a6b" }} />New Operator Account</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label className="mb-1.5 block text-xs">First Name</Label><Input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
                  <div><Label className="mb-1.5 block text-xs">Last Name</Label><Input required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
                  <div><Label className="mb-1.5 block text-xs">Login Email</Label><Input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                  <div>
                    <Label className="mb-1.5 block text-xs">Notification Email <span className="text-gray-400 font-normal">(OTP codes sent here)</span></Label>
                    <Input type="email" placeholder="Same as login email if blank" value={form.notificationEmail} onChange={e => setForm(f => ({ ...f, notificationEmail: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs">Password</Label>
                    <Input type="password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                    <p className="text-xs text-gray-400 mt-1">Min. 8 chars, 1 uppercase, 1 number.</p>
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs">DVLA Role</Label>
                    <Select value={form.dvlaRole} onValueChange={v => setForm(f => ({ ...f, dvlaRole: v }))}>
                      <SelectOption value="Administrator">Administrator</SelectOption>
                      <SelectOption value="Operator">Operator</SelectOption>
                      <SelectOption value="Supervisor">Supervisor</SelectOption>
                    </Select>
                  </div>
                  {roles.length > 0 && (
                    <div>
                      <Label className="mb-1.5 block text-xs">Permission Role</Label>
                      <Select value={form.roleId} onValueChange={v => setForm(f => ({ ...f, roleId: v }))}>
                        <SelectOption value="">Select role…</SelectOption>
                        {roles.map(r => <SelectOption key={r.id} value={r.id}>{r.name}</SelectOption>)}
                      </Select>
                    </div>
                  )}
                  {offices.length > 0 && (
                    <div>
                      <Label className="mb-1.5 flex items-center gap-1.5 text-xs">
                        <Building2 className="w-3 h-3" /> Assigned Office
                      </Label>
                      <Select value={form.officeId} onValueChange={v => setForm(f => ({ ...f, officeId: v }))}>
                        <SelectOption value="">— Unassigned —</SelectOption>
                        {offices.map(o => (
                          <SelectOption key={o.id} value={o.id}>
                            {o.name}{o.regionName ? ` · ${o.regionName}` : ""}
                          </SelectOption>
                        ))}
                      </Select>
                    </div>
                  )}
                  <div className="md:col-span-2 flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded border border-gray-300 text-sm font-medium hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={submitting} className="px-5 py-2 rounded text-sm font-bold text-white disabled:opacity-60" style={{ background: "#006B3F" }}>
                      {submitting ? "Creating…" : "Create User"}
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" style={{ color: "#1a3a6b" }} />{users.length} User{users.length !== 1 ? "s" : ""}</CardTitle></CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-sm text-gray-400">Loading users…</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        {["Name","Email","DVLA Role","Permission Role","Assigned Office","Status","Created","Actions"].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{u.firstName} {u.lastName}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{u.email}</td>
                          <td className="px-4 py-3 text-xs"><span className="border border-gray-300 rounded px-1.5 py-0.5">{u.dvlaRole}</span></td>
                          <td className="px-4 py-3 text-xs text-gray-500">{u.role?.name ?? "—"}</td>
                          <td className="px-4 py-3 text-xs">
                            {(u as any).office ? (
                              <span className="flex items-center gap-1 text-gray-600">
                                <Building2 className="w-3 h-3 text-gray-400 shrink-0" />
                                <span className="truncate max-w-35">{(u as any).office?.name ?? "—"}</span>
                              </span>
                            ) : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={u.isActive ? "issued" : "rejected"} /></td>
                          <td className="px-4 py-3 text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            {canManage && (
                              <button onClick={() => toggleActive(u.id, u.isActive)} className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${u.isActive ? "border-red-300 text-red-700 hover:bg-red-50" : "border-green-300 text-green-700 hover:bg-green-50"}`}>
                                {u.isActive ? <><XCircle className="w-3.5 h-3.5" /> Deactivate</> : <><CheckCircle className="w-3.5 h-3.5" /> Activate</>}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── ROLES TAB ── */}
      {tab === "roles" && canManage && (
        <div className="space-y-4">
          {roleMsg && (
            <div className={`p-3 rounded text-sm ${roleMsg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {roleMsg.text}
            </div>
          )}

          {/* New role form */}
          {showRoleForm && (
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Plus className="w-4 h-4" style={{ color: "#1a3a6b" }} />New Role</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={createRole} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="mb-1.5 block text-xs">Role Name *</Label>
                      <Input required value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="e.g. DATA_ENTRY" />
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs">Description</Label>
                      <Input value={newRoleDesc} onChange={e => setNewRoleDesc(e.target.value)} placeholder="Optional description" />
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block text-xs">Permissions</Label>
                    <PermissionGrid perms={newRolePerms} onToggle={p => setNewRolePerms(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; })} />
                  </div>
                  <div className="flex gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={() => setShowRoleForm(false)} className="px-4 py-2 rounded border border-gray-300 text-sm font-medium hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={submitting} className="px-5 py-2 rounded text-sm font-bold text-white disabled:opacity-60" style={{ background: "#006B3F" }}>
                      {submitting ? "Creating…" : "Create Role"}
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Existing roles */}
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading roles…</div>
          ) : roles.map(role => (
            <Card key={role.id}>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" style={{ color: "#1a3a6b" }} />
                      {role.name}
                      {role.isSystem && <span className="text-xs text-gray-400 font-normal ml-1">(system — read-only)</span>}
                    </CardTitle>
                    {role.description && (
                      <p className="text-xs text-gray-500 mt-0.5 ml-6">{role.description}</p>
                    )}
                  </div>
                  {!role.isSystem && (
                    <button
                      onClick={() => saveRole(role.id)}
                      disabled={savingRole === role.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold text-white disabled:opacity-60"
                      style={{ background: "#006B3F" }}
                    >
                      <Save className="w-3 h-3" />
                      {savingRole === role.id ? "Saving…" : "Save Changes"}
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <PermissionGrid
                  perms={editPerms[role.id] ?? new Set()}
                  onToggle={p => togglePerm(role.id, p)}
                  readOnly={role.isSystem}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PermissionGrid({ perms, onToggle, readOnly }: { perms: Set<string>; onToggle: (p: string) => void; readOnly?: boolean }) {
  const groups: Record<string, string[]> = {
    "Dashboard":    ["VIEW_DASHBOARD"],
    "Applicants":   ["VIEW_APPLICANTS", "CREATE_APPLICANT", "UPDATE_APPLICANT", "DELETE_APPLICANT"],
    "Permits":      ["VIEW_PERMITS", "CREATE_PERMIT", "APPROVE_PERMIT"],
    "Production":   ["MANAGE_PRINT", "MANAGE_RFID", "MANAGE_QC", "UPLOAD_BIOMETRIC"],
    "Admin":        ["VIEW_AUDIT_LOGS", "EXPORT_AUDIT", "MANAGE_USERS", "MANAGE_SETTINGS"],
  };
  return (
    <div className="space-y-3">
      {Object.entries(groups).map(([group, groupPerms]) => (
        <div key={group}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">{group}</p>
          <div className="flex flex-wrap gap-2">
            {groupPerms.map(p => {
              const active = perms.has(p);
              return (
                <button
                  key={p} type="button"
                  onClick={() => !readOnly && onToggle(p)}
                  disabled={readOnly}
                  className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors disabled:cursor-not-allowed ${active ? "text-white border-transparent" : "border-gray-300 text-gray-500 hover:border-gray-400 disabled:opacity-60"}`}
                  style={active ? { background: readOnly ? "#94a3b8" : "#006B3F" } : {}}
                >
                  {p.replace(/_/g, " ")}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
