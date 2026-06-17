import { create } from "zustand";
import { AdminUser } from "@/types";

interface AuthState {
  user: AdminUser | null;
  userType: "admin" | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lastActivity: number;
  setAuth: (user: AdminUser, userType: "admin", token: string) => void;
  logout: () => void;
  initializeAuth: () => void;
  refreshActivity: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  return {
    user: null,
    userType: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    lastActivity: Date.now(),

    setAuth: (user, userType, token) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("token",    token);
        localStorage.setItem("user",     JSON.stringify(user));
        localStorage.setItem("userType", userType);
      }
      set({ user, userType, token, isAuthenticated: true, isLoading: false, lastActivity: Date.now() });
    },

    logout: () => {
      if (typeof window !== "undefined") {
        ["token", "user", "userType"].forEach(k => localStorage.removeItem(k));
      }
      set({ user: null, userType: null, token: null, isAuthenticated: false, isLoading: false });
    },

    initializeAuth: () => {
      if (typeof window === "undefined") { set({ isLoading: false }); return; }
      const token    = localStorage.getItem("token");
      const userStr  = localStorage.getItem("user");
      const userType = localStorage.getItem("userType") as "admin" | null;
      if (token && userStr && userType) {
        try {
          const user = JSON.parse(userStr);
          set({ user, userType, token, isAuthenticated: true, isLoading: false, lastActivity: Date.now() });
        } catch {
          ["token", "user", "userType"].forEach(k => localStorage.removeItem(k));
          set({ isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    },

    refreshActivity: () => set({ lastActivity: Date.now() }),
  };
});
