import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { LoginResponse } from "@/types";

export function useAuth() {
  const store = useAuthStore();
  const router = useRouter();

  useEffect(() => { store.initializeAuth(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getError = (err: unknown, fallback: string) => {
    const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
    return msg || (err instanceof Error ? err.message : fallback);
  };

  const loginAdmin = async (email: string, password: string) => {
    try {
      const { data } = await api.post<LoginResponse | { mfaRequired: true; tempToken: string }>(
        "/auth/admin/login", { email, password }
      );
      if ("mfaRequired" in data) {
        return { success: false, mfaRequired: true, tempToken: data.tempToken };
      }
      store.setAuth((data as LoginResponse).user, "admin", (data as LoginResponse).token);
      return { success: true };
    } catch (err) {
      return { success: false, error: getError(err, "Login failed") };
    }
  };

  const confirmMfa = async (tempToken: string, totpCode: string) => {
    try {
      const { data } = await api.post<LoginResponse>("/auth/admin/mfa/confirm", { tempToken, totpCode });
      store.setAuth(data.user, "admin", data.token);
      return { success: true };
    } catch (err) {
      return { success: false, error: getError(err, "MFA verification failed") };
    }
  };

  const logout = () => {
    store.logout();
    router.push("/admin-login");
  };

  return { ...store, loginAdmin, confirmMfa, logout };
}
