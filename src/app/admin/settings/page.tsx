"use client";
import { useEffect, useState } from "react";
import { Settings, Save } from "lucide-react";
import api from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CONFIG_KEYS = [
  { key: "printer_name",            label: "Printer Name",                desc: "Exact name of the Surys P400 as it appears in the OS printer list (e.g. 'Surys P400'). Used by the local print agent." },
  { key: "printer_agent_port",      label: "Print Agent Port",            desc: "Port the local DVLA Print Agent listens on (default: 6161). Change only if you have a port conflict." },
  { key: "printer_api_endpoint",    label: "Printer API Endpoint",        desc: "Optional: direct printer API URL if the printer exposes a REST status endpoint" },
  { key: "issuing_authority",       label: "Issuing Authority",           desc: "Authority name printed on permits" },
  { key: "sla_days",                label: "SLA Target (Days)",           desc: "Target days for permit processing" },
  { key: "dvla_db_api_endpoint",    label: "DVLA Central DB API URL",     desc: "DVLA Central Database REST API endpoint" },
  { key: "mfa_required",            label: "Require MFA for Admins",      desc: "Set to 'true' to enforce MFA for all administrator accounts" },
  { key: "session_timeout_minutes", label: "Session Timeout (Minutes)",   desc: "Inactivity timeout before automatic logout (default: 15)" },
  { key: "place_of_issue_options",  label: "Place of Issue Options",      desc: "Comma-separated list of DVLA regional issuing offices" },
];

export default function SystemSettingsPage() {
  const { hasPermission } = usePermissions();
  const canSave = hasPermission("MANAGE_SETTINGS");
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState<string | null>(null);
  const [saved, setSaved]     = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    Promise.all(CONFIG_KEYS.map(c => api.get(`/admin/config/${c.key}`).then(r => [c.key, r.data?.value ?? ""] as [string, string]).catch(() => [c.key, ""] as [string, string])))
      .then(entries => setValues(Object.fromEntries(entries)))
      .finally(() => setLoading(false));
  }, []);

  const save = async (key: string) => {
    setSaving(key);
    setSaveErr(e => { const n = { ...e }; delete n[key]; return n; });
    try {
      await api.put(`/admin/config/${key}`, { value: values[key] });
      setSaved(key); setTimeout(() => setSaved(null), 2000);
    } catch (err: any) {
      setSaveErr(e => ({ ...e, [key]: err.response?.data?.error ?? "Save failed." }));
    } finally { setSaving(null); }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure system-wide parameters for the DVLA IDP/ICMV platform.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="w-4 h-4" style={{ color: "#1a3a6b" }} />
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className={loading ? "p-8 text-center text-sm text-gray-400" : "p-5 space-y-6"}>
          {loading ? "Loading settings…" : CONFIG_KEYS.map(({ key, label, desc }) => (
            <div key={key}>
              <Label className="block mb-1">{label}</Label>
              <p className="text-xs text-gray-400 mb-2">{desc}</p>
              <div className="flex gap-3">
                <Input value={values[key] ?? ""} onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} className="flex-1" />
                <button onClick={() => save(key)} disabled={saving === key || !canSave} className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-bold text-white disabled:opacity-60 whitespace-nowrap" style={{ background: saved === key ? "#006B3F" : "#1a3a6b" }}>
                  <Save className="w-3.5 h-3.5" />
                  {saving === key ? "Saving…" : saved === key ? "Saved!" : "Save"}
                </button>
              </div>
              {saveErr[key] && (
                <p className="text-xs text-red-600 mt-1">{saveErr[key]}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
