import type { Metadata } from "next";
import "@/app/globals.css";
import { AppShell } from "@/components/AppShell";
import { PortalFooter } from "@/components/PortalFooter";
import { PortalNav } from "@/components/PortalNav";
import { ProjectAssistant } from "@/components/ProjectAssistant";
import { UserMenu } from "@/components/UserMenu";
import { getCurrentUserContext } from "@/lib/auth-server";

export const metadata: Metadata = {
  title: "Rampart Range Project Evidence Portal",
  description: "Internal coordination and evidence management portal for rampart-range.org."
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, role } = await getCurrentUserContext();

  return (
    <html lang="en">
      <body>
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 md:px-6">
          <header className="rounded-[2rem] border border-white/70 bg-gradient-to-r from-ink via-pine to-clay p-6 text-white shadow-card">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-100">
                    rampart-range.org
                  </p>
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                      Rampart Range Project Evidence Portal
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-white/80">
                      Internal coordination system for documents, reviewer comments, GPS points, culverts, access
                      records, and project evidence.
                    </p>
                  </div>
                </div>
                {user ? <UserMenu email={user.email ?? "Unknown user"} role={role} fullName={profile?.full_name} /> : null}
              </div>
              <PortalNav />
            </div>
          </header>
          <AppShell>{children}</AppShell>
          <ProjectAssistant />
          <PortalFooter />
        </div>
      </body>
    </html>
  );
}
