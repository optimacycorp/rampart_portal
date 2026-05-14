"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "rampart-demo-auth";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const value = window.localStorage.getItem(STORAGE_KEY);
    setAuthenticated(value === "true");
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

  return <>{children}</>;
}

export function setDemoAuth(value: boolean) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
  }
}
