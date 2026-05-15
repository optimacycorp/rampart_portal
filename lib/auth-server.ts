import "server-only";

import { cache } from "react";
import { normalizeAppRole } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export const getCurrentUserContext = cache(async () => {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return {
      user: null,
      profile: null,
      role: "viewer" as const
    };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      profile: null,
      role: "viewer" as const
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, organization")
    .eq("id", user.id)
    .single();

  return {
    user,
    profile,
    role: normalizeAppRole(profile?.role)
  };
});

export async function canManageUploads(ownerUserId?: string | null) {
  const { user, role } = await getCurrentUserContext();

  if (!user) {
    return false;
  }

  return role === "audit" || ownerUserId === user.id;
}

export async function requireUploadManagementRole(ownerUserId?: string | null) {
  const allowed = await canManageUploads(ownerUserId);

  if (!allowed) {
    throw new Error("forbidden");
  }
}
