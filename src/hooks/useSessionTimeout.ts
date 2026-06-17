"use client";
import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

const DEFAULT_TIMEOUT_MINUTES = 15;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"] as const;

export function useSessionTimeout() {
  const { isAuthenticated, logout } = useAuthStore();
  const logoutRef      = useRef(logout);
  const lastActivityRef = useRef(Date.now()); // local ref — never stale across re-renders
  const timeoutMsRef   = useRef(DEFAULT_TIMEOUT_MINUTES * 60 * 1000);

  logoutRef.current = logout;

  // Fetch configured timeout once — update the ref, no state needed
  useEffect(() => {
    api.get("/admin/config/session_timeout_minutes")
      .then(r => {
        const minutes = parseInt(r.data?.value ?? String(DEFAULT_TIMEOUT_MINUTES), 10);
        if (!isNaN(minutes) && minutes > 0) {
          timeoutMsRef.current = minutes * 60 * 1000;
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Reset the clock on mount so login itself counts as activity
    lastActivityRef.current = Date.now();

    // Any user interaction resets the idle clock
    const onActivity = () => { lastActivityRef.current = Date.now(); };
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, onActivity, { passive: true }));

    // Check once per minute — compare against the ref, not store state
    const interval = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= timeoutMsRef.current) {
        clearInterval(interval);
        logoutRef.current();
        if (typeof window !== "undefined" && window.location.pathname !== "/admin-login") {
          window.location.href = "/admin-login?reason=timeout";
        }
      }
    }, 60_000);

    return () => {
      clearInterval(interval);
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, onActivity));
    };
  }, [isAuthenticated]);
}
