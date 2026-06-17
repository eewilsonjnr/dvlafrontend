"use client";
import { useState } from "react";
import { X } from "lucide-react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Applicant } from "@/types";

interface Props {
  initial?: Applicant | null;
  forceCreate?: boolean;   // true when pre-filling from invoice (has data but no id)
  onSuccess: (a: Applicant) => void;
  onClose: () => void;
}

export default function ApplicantForm({ initial, forceCreate, onSuccess, onClose }: Props) {
  const isEdit = !!initial && !forceCreate;
  const [form, setForm] = useState({
    surname:      initial?.surname       ?? "",
    otherNames:   initial?.otherNames    ?? "",
    placeOfBirth: initial?.placeOfBirth  ?? "",
    dateOfBirth:  initial?.dateOfBirth   ?? "",
    homeAddress:  initial?.homeAddress   ?? "",
    nationalId:   initial?.nationalId    ?? "",
    licenceNumber:initial?.licenceNumber ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      let res;
      if (isEdit) {
        res = await api.put(`/applicants/${initial!.id}`, form);
      } else {
        res = await api.post("/applicants", form);
      }
      onSuccess(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error ?? (isEdit ? "Update failed." : "Create failed."));
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ borderLeft: "4px solid #006B3F" }}>
          <h2 className="text-sm font-bold text-gray-900">
            {isEdit ? `Edit Applicant — ${initial!.surname}` : "Register New Applicant"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="block mb-1.5 text-xs font-bold text-gray-600 uppercase tracking-wide">Surname *</Label>
              <Input required value={form.surname} onChange={set("surname")} placeholder="e.g. MENSAH" />
            </div>
            <div>
              <Label className="block mb-1.5 text-xs font-bold text-gray-600 uppercase tracking-wide">Other Names *</Label>
              <Input required value={form.otherNames} onChange={set("otherNames")} placeholder="e.g. KWAME ASANTE" />
            </div>
            <div>
              <Label className="block mb-1.5 text-xs font-bold text-gray-600 uppercase tracking-wide">Date of Birth *</Label>
              <Input type="date" required value={form.dateOfBirth} onChange={set("dateOfBirth")} />
            </div>
            <div>
              <Label className="block mb-1.5 text-xs font-bold text-gray-600 uppercase tracking-wide">Place of Birth *</Label>
              <Input required value={form.placeOfBirth} onChange={set("placeOfBirth")} placeholder="e.g. Accra" />
            </div>
          </div>

          <div>
            <Label className="block mb-1.5 text-xs font-bold text-gray-600 uppercase tracking-wide">Home Address *</Label>
            <Input required value={form.homeAddress} onChange={set("homeAddress")} placeholder="Full residential address" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="block mb-1.5 text-xs font-bold text-gray-600 uppercase tracking-wide">National ID</Label>
              <Input value={form.nationalId} onChange={set("nationalId")} placeholder="GHA-XXXXXXXXX-X" />
            </div>
            <div>
              <Label className="block mb-1.5 text-xs font-bold text-gray-600 uppercase tracking-wide">Licence Number</Label>
              <Input value={form.licenceNumber} onChange={set("licenceNumber")} placeholder="DVL-XXXXXXXX" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded border border-gray-300 text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="px-5 py-2 rounded text-sm font-bold text-white disabled:opacity-60"
              style={{ background: "#006B3F" }}>
              {loading ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save Changes" : "Register Applicant")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
