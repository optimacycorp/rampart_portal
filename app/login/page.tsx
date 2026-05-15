import { signInWithPassword } from "@/app/login/actions";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const query = await searchParams;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pine">Portal Access</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink">Sign in</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Sign in with your Supabase email and password. Roles are assigned through the connected profile record.
        </p>
        {query.error === "invalid-credentials" ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            Invalid email or password.
          </div>
        ) : null}
        {query.error === "supabase-not-configured" ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            Supabase auth is not configured on the server.
          </div>
        ) : null}
        <form action={signInWithPassword} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={query.next ?? "/"} />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
            <input
              defaultValue="team@rampart-range.org"
              name="email"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-pine"
              placeholder="team@rampart-range.org"
              type="email"
              required
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
            <input
              name="password"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-pine"
              type="password"
              required
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Sign in
          </button>
        </form>
      </div>
      <DisclaimerBanner />
    </div>
  );
}
