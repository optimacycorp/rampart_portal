import { signOut } from "@/app/login/actions";
import { AppRole } from "@/lib/auth";

type UserMenuProps = {
  email: string;
  role: AppRole;
  fullName?: string | null;
};

export function UserMenu({ email, role, fullName }: UserMenuProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="rounded-2xl bg-white/15 px-4 py-2 text-sm text-white/90">
        <div className="font-semibold">{fullName || email}</div>
        <div className="text-xs uppercase tracking-[0.18em] text-white/70">{role}</div>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
