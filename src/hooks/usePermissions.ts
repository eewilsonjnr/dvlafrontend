import { useAuth } from "./useAuth";
import { adminHasAnyPermission, type PermissionName } from "@/lib/permissions";
import type { AdminUser } from "@/types";

export function usePermissions() {
  const { user, userType } = useAuth();
  const hasPermission = (...perms: PermissionName[]) => {
    if (userType !== "admin") return false;
    return adminHasAnyPermission(user as AdminUser, perms);
  };
  return { hasPermission, user };
}
