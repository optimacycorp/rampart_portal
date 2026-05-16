import { seededFieldPoints, seededProject } from "@/lib/mock-data";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { Culvert } from "@/lib/types";

const fallbackCulverts: Culvert[] = [
  {
    id: "culvert-fallback-1",
    project_id: seededProject.id,
    culvert_id: "CULV-01",
    inlet_point_id: seededFieldPoints[2]?.id ?? null,
    outlet_point_id: null,
    diameter_inches: 18,
    material: "CMP",
    length_feet: 32,
    slope_percent: null,
    condition: "Observed during field recon.",
    ownership: "unknown",
    flow_direction: "northwest",
    notes: "Fallback culvert while Supabase is not configured.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export async function getCulvertsByProjectId(projectId: string): Promise<Culvert[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return projectId === seededProject.id ? fallbackCulverts : [];
  }

  const { data, error } = await supabase
    .from("culverts")
    .select(
      "id, project_id, culvert_id, inlet_point_id, outlet_point_id, diameter_inches, material, length_feet, slope_percent, condition, ownership, flow_direction, notes, created_at, updated_at"
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as Culvert[];
}
