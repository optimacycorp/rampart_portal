import { seededFieldPoints, seededProject } from "@/lib/mock-data";
import {
  FIELD_POINT_CONFIDENCE_OPTIONS,
  FIELD_POINT_IMPORT_FIELDS,
  FIELD_POINT_TYPE_OPTIONS,
  validateFieldPointImportRow
} from "@/lib/field-point-import";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { FieldPoint, FieldPointImportRow } from "@/lib/types";

export async function getFieldPointsByProjectSlug(projectSlug: string): Promise<FieldPoint[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return projectSlug === seededProject.slug ? seededFieldPoints : [];
  }

  const { data: project } = await supabase.from("projects").select("id").eq("slug", projectSlug).single();

  if (!project) {
    return [];
  }

  const { data, error } = await supabase
    .from("field_points")
    .select(
      "id, project_id, point_name, point_type, easting, northing, elevation, coordinate_system, latitude, longitude, collection_method, source_equipment, confidence, description, photo_document_id, created_at"
    )
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as FieldPoint[];
}
export { FIELD_POINT_CONFIDENCE_OPTIONS, FIELD_POINT_IMPORT_FIELDS, FIELD_POINT_TYPE_OPTIONS, validateFieldPointImportRow };
