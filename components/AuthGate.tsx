"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DEMO_AUTH_COOKIE,
  DEMO_AUTH_STORAGE_KEY,
  DEMO_ROLE_COOKIE,
  DEMO_ROLE_STORAGE_KEY,
  normalizeDemoRole
} from "@/lib/auth-constants";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [role, setRole] = useState("viewer");

  useEffect(() => {
    const value = window.localStorage.getItem(DEMO_AUTH_STORAGE_KEY);
    const storedRole = normalizeDemoRole(window.localStorage.getItem(DEMO_ROLE_STORAGE_KEY));
    setAuthenticated(value === "true");
    setRole(storedRole);
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-600">Loading portal workspace...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="rounded-3xl border border-white/70 bg-white/85 p-8 shadow-card">
        <h1 className="text-2xl font-semibold text-ink">Rampart Range Project Evidence Portal</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Sign in to review project evidence, coordination documents, reviewer comments, and field observations.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white"
          >
            Open Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm">
          Role: {role}
        </span>
      </div>
      {children}
    </div>
  );
}

export function setDemoAuth(value: boolean, role = "viewer") {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(DEMO_AUTH_STORAGE_KEY, value ? "true" : "false");
    window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, normalizeDemoRole(role));
    document.cookie = `${DEMO_AUTH_COOKIE}=${value ? "true" : "false"}; path=/; SameSite=Lax`;
    document.cookie = `${DEMO_ROLE_COOKIE}=${normalizeDemoRole(role)}; path=/; SameSite=Lax`;
  }
}
