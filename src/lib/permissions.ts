export const PERMISSIONS = {
  VIEW_DASHBOARD:   "VIEW_DASHBOARD",
  VIEW_APPLICANTS:  "VIEW_APPLICANTS",
  CREATE_APPLICANT: "CREATE_APPLICANT",
  UPDATE_APPLICANT: "UPDATE_APPLICANT",
  VIEW_PERMITS:     "VIEW_PERMITS",
  CREATE_PERMIT:    "CREATE_PERMIT",
  APPROVE_PERMIT:   "APPROVE_PERMIT",
  MANAGE_PRINT:     "MANAGE_PRINT",
  MANAGE_RFID:      "MANAGE_RFID",
  MANAGE_QC:        "MANAGE_QC",
  VIEW_AUDIT_LOGS:  "VIEW_AUDIT_LOGS",
  EXPORT_AUDIT:     "EXPORT_AUDIT",
  DELETE_APPLICANT: "DELETE_APPLICANT",
  MANAGE_USERS:     "MANAGE_USERS",
  MANAGE_SETTINGS:  "MANAGE_SETTINGS",
  MANAGE_CENTRES:   "MANAGE_CENTRES",
  UPLOAD_BIOMETRIC: "UPLOAD_BIOMETRIC",
} as const;
export type PermissionName = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export function adminHasAnyPermission(
  user: { permissions?: PermissionName[]; role?: string } | null,
  required: PermissionName[]
): boolean {
  if (!user) return false;
  if (user.role === "ADMINISTRATOR") return true;
  return required.some(p => user.permissions?.includes(p));
}
