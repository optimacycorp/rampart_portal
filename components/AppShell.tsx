"use client";

import { usePathname } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <main className="flex-1 py-6">{children}</main>;
  }

  return (
    <main className="flex-1 py-6">
      <AuthGate>{children}</AuthGate>
    </main>
  );
}
