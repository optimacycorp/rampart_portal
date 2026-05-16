"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProjectBySlug } from "@/lib/documents";
import { getFieldPointById } from "@/lib/field-points";
import { getSupabaseAdminClient } from "@/lib/supabase";

function parseNullableNumber(value: FormDataEntryValue | null) {
  const parsed = Number(`${value ?? ""}`.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export async function createCulvert(projectSlug: string, formData: FormData) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/culverts?error=supabase-not-configured`);
  }

  const project = await getProjectBySlug(projectSlug);

  if (!project) {
    redirect(`/projects/${projectSlug}/culverts?error=project-not-found`);
  }

  const culvertId = `${formData.get("culvert_id") ?? ""}`.trim();
  const inletPointId = `${formData.get("inlet_point_id") ?? ""}`.trim() || null;
  const outletPointId = `${formData.get("outlet_point_id") ?? ""}`.trim() || null;
  const diameterInches = parseNullableNumber(formData.get("diameter_inches"));
  const lengthFeet = parseNullableNumber(formData.get("length_feet"));
  const manualSlopePercent = parseNullableNumber(formData.get("manual_slope_percent"));
  const material = `${formData.get("material") ?? ""}`.trim() || null;
  const condition = `${formData.get("condition") ?? ""}`.trim() || null;
  const ownership = `${formData.get("ownership") ?? ""}`.trim() || null;
  const flowDirection = `${formData.get("flow_direction") ?? ""}`.trim() || null;
  const notes = `${formData.get("notes") ?? ""}`.trim() || null;

  if (!culvertId || !inletPointId || !outletPointId) {
    redirect(`/projects/${projectSlug}/culverts?error=missing-required-fields`);
  }

  const [inletPoint, outletPoint] = await Promise.all([getFieldPointById(inletPointId), getFieldPointById(outletPointId)]);

  if (!inletPoint || !outletPoint) {
    redirect(`/projects/${projectSlug}/culverts?error=point-not-found`);
  }

  let slopePercent = manualSlopePercent;

  if (slopePercent == null && lengthFeet && inletPoint.elevation != null && outletPoint.elevation != null) {
    slopePercent = Number((((inletPoint.elevation - outletPoint.elevation) / lengthFeet) * 100).toFixed(3));
  }

  const { error } = await supabase.from("culverts").insert({
    project_id: project.id,
    culvert_id: culvertId,
    inlet_point_id: inletPointId,
    outlet_point_id: outletPointId,
    diameter_inches: diameterInches,
    material,
    length_feet: lengthFeet,
    slope_percent: slopePercent,
    condition,
    ownership,
    flow_direction: flowDirection,
    notes
  });

  if (error) {
    redirect(`/projects/${projectSlug}/culverts?error=save-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/culverts`);
  redirect(`/projects/${projectSlug}/culverts?status=saved`);
}
