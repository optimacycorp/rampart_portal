"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function signInWithPassword(formData: FormData) {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    redirect("/login?error=supabase-not-configured");
  }

  const email = `${formData.get("email") ?? ""}`.trim();
  const password = `${formData.get("password") ?? ""}`;
  const next = `${formData.get("next") ?? "/"}` || "/";

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirect(`/login?error=invalid-credentials`);
  }

  redirect(next.startsWith("/") ? next : "/");
}

export async function signOut() {
  const supabase = await getSupabaseServerClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect("/login");
}
