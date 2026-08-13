import "server-only";

import { seededProject, seededRoadConditionReports } from "@/lib/mock-data";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { RoadConditionReport } from "@/lib/types";

export async function getRoadConditionReportsByCorridorId(corridorId: string, limit = 20): Promise<RoadConditionReport[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return corridorId === "road-corridor-fs0300" ? seededRoadConditionReports.slice(0, limit) : [];
  }

  const { data, error } = await supabase
    .from("road_condition_reports")
    .select(
      "id, corridor_id, segment_id, report_source, reported_by, observed_at, condition, surface_condition, mud_severity, snow_severity, rut_severity, washout, fallen_tree, standing_water, erosion, passability, recommended_vehicle, description, latitude, longitude, photo_id, source_url, verified, created_at"
    )
    .eq("corridor_id", corridorId)
    .order("observed_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data as RoadConditionReport[];
}

export async function getRoadConditionReportById(reportId: string): Promise<RoadConditionReport | null> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return seededRoadConditionReports.find((report) => report.id === reportId) ?? null;
  }

  const { data, error } = await supabase
    .from("road_condition_reports")
    .select(
      "id, corridor_id, segment_id, report_source, reported_by, observed_at, condition, surface_condition, mud_severity, snow_severity, rut_severity, washout, fallen_tree, standing_water, erosion, passability, recommended_vehicle, description, latitude, longitude, photo_id, source_url, verified, created_at"
    )
    .eq("id", reportId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as RoadConditionReport;
}
