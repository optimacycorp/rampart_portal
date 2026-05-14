"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { setDemoAuth } from "@/components/AuthGate";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("team@rampart-range.org");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDemoAuth(true);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pine">Portal Access</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink">Sign in</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Sprint 1 includes a simple local auth gate so the shell is usable immediately. Replace this form with
          Supabase email or magic link auth once environment keys are configured.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-pine"
              placeholder="team@rampart-range.org"
              type="email"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Continue to portal
          </button>
        </form>
      </div>
      <DisclaimerBanner />
    </div>
  );
}
