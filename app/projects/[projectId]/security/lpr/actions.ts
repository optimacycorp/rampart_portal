"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth-server";
import { getProjectBySlug } from "@/lib/documents";
import { getLprEventsByProjectSlug } from "@/lib/lpr";
import { getSupabaseAdminClient } from "@/lib/supabase";

function readValue(formData: FormData, key: string) {
  return `${formData.get(key) ?? ""}`.trim();
}

function normalizePlateText(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function requireLprManagementRole() {
  const { user, role } = await getCurrentUserContext();

  if (!user || (role !== "owner" && role !== "audit")) {
    throw new Error("forbidden");
  }

  return user;
}

export async function createKnownVehicle(projectSlug: string, formData: FormData) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/security/lpr/events?error=supabase-not-configured`);
  }

  let user;
  try {
    user = await requireLprManagementRole();
  } catch {
    redirect(`/projects/${projectSlug}/security/lpr/events?error=forbidden`);
  }

  const project = await getProjectBySlug(projectSlug);

  if (!project) {
    redirect(`/projects/${projectSlug}/security/lpr/events?error=project-not-found`);
  }

  const plateText = normalizePlateText(readValue(formData, "plate_text"));
  const label = readValue(formData, "label");

  if (!plateText || !label) {
    redirect(`/projects/${projectSlug}/security/lpr/events?error=known-vehicle-missing-required-fields`);
  }

  const { error } = await supabase.from("lpr_known_vehicles").upsert(
    {
      project_id: project.id,
      plate_text: plateText,
      label,
      vehicle_kind: readValue(formData, "vehicle_kind") || null,
      owner_name: readValue(formData, "owner_name") || null,
      access_level: readValue(formData, "access_level") || "authorized",
      notes: readValue(formData, "notes") || null,
      active: `${formData.get("active") ?? "true"}` === "true",
      created_by_user_id: user.id,
      created_by_email: user.email ?? null,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: "project_id,plate_text",
      ignoreDuplicates: false
    }
  );

  if (error) {
    redirect(`/projects/${projectSlug}/security/lpr/events?error=known-vehicle-save-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/security/lpr`);
  revalidatePath(`/projects/${projectSlug}/security/lpr/events`);
  redirect(`/projects/${projectSlug}/security/lpr/events?status=known-vehicle-saved`);
}

export async function reviewLprEvent(projectSlug: string, eventId: string, formData: FormData) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/security/lpr/events?error=supabase-not-configured`);
  }

  let user;
  try {
    user = await requireLprManagementRole();
  } catch {
    redirect(`/projects/${projectSlug}/security/lpr/events?error=forbidden`);
  }

  const event = (await getLprEventsByProjectSlug(projectSlug, 200)).find((item) => item.id === eventId);

  if (!event) {
    redirect(`/projects/${projectSlug}/security/lpr/events?error=lpr-event-not-found`);
  }

  const { error } = await supabase.from("lpr_event_reviews").upsert(
    {
      event_id: eventId,
      review_status: readValue(formData, "review_status") || "pending",
      matched_known_vehicle_id: readValue(formData, "matched_known_vehicle_id") || null,
      notes: readValue(formData, "notes") || null,
      reviewed_by_user_id: user.id,
      reviewed_by_email: user.email ?? null,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: "event_id",
      ignoreDuplicates: false
    }
  );

  if (error) {
    redirect(`/projects/${projectSlug}/security/lpr/events?error=lpr-review-save-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/security/lpr`);
  revalidatePath(`/projects/${projectSlug}/security/lpr/events`);
  redirect(`/projects/${projectSlug}/security/lpr/events?status=review-saved`);
}

export async function preserveLprEvent(projectSlug: string, eventId: string, formData: FormData) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/security/lpr/events?error=supabase-not-configured`);
  }

  let user;
  try {
    user = await requireLprManagementRole();
  } catch {
    redirect(`/projects/${projectSlug}/security/lpr/events?error=forbidden`);
  }

  const event = (await getLprEventsByProjectSlug(projectSlug, 500)).find((item) => item.id === eventId);

  if (!event) {
    redirect(`/projects/${projectSlug}/security/lpr/events?error=lpr-event-not-found`);
  }

  const preservationReason = readValue(formData, "preservation_reason");

  if (!preservationReason) {
    redirect(`/projects/${projectSlug}/security/lpr/events?error=preservation-reason-required`);
  }

  const { error } = await supabase.from("lpr_preserved_events").upsert(
    {
      event_id: eventId,
      case_reference: readValue(formData, "case_reference") || null,
      preservation_reason: preservationReason,
      preserve_until: readValue(formData, "preserve_until") || null,
      notes: readValue(formData, "preservation_notes") || null,
      released_at: null,
      preserved_by_user_id: user.id,
      preserved_by_email: user.email ?? null,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: "event_id",
      ignoreDuplicates: false
    }
  );

  if (error) {
    redirect(`/projects/${projectSlug}/security/lpr/events?error=lpr-preserve-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/security/lpr`);
  revalidatePath(`/projects/${projectSlug}/security/lpr/events`);
  redirect(`/projects/${projectSlug}/security/lpr/events?status=preserved`);
}

export async function releasePreservedLprEvent(projectSlug: string, eventId: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/security/lpr/events?error=supabase-not-configured`);
  }

  try {
    await requireLprManagementRole();
  } catch {
    redirect(`/projects/${projectSlug}/security/lpr/events?error=forbidden`);
  }

  const { error } = await supabase
    .from("lpr_preserved_events")
    .update({
      released_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("event_id", eventId);

  if (error) {
    redirect(`/projects/${projectSlug}/security/lpr/events?error=lpr-release-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/security/lpr`);
  revalidatePath(`/projects/${projectSlug}/security/lpr/events`);
  redirect(`/projects/${projectSlug}/security/lpr/events?status=released`);
}
