import "server-only";
import { cookies } from "next/headers";
import { DEMO_ROLE_COOKIE, DemoRole, normalizeDemoRole } from "@/lib/auth-constants";

export async function getCurrentDemoRole(): Promise<DemoRole> {
  const cookieStore = await cookies();
  return normalizeDemoRole(cookieStore.get(DEMO_ROLE_COOKIE)?.value);
}

export async function canManageUploads() {
  const role = await getCurrentDemoRole();
  return role === "owner" || role === "audit";
}

export async function requireUploadManagementRole() {
  const allowed = await canManageUploads();

  if (!allowed) {
    throw new Error("forbidden");
  }
}
