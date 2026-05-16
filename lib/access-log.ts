import { seededAccessLogs, seededProject } from "@/lib/mock-data";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { AccessLogEntry } from "@/lib/types";

type AccessLogRow = {
  id: string;
  project_id: string;
  log_date: string | null;
  access_feature: string;
  status: string | null;
  description: string | null;
  road_condition: string | null;
  gate_condition: string | null;
  weather: string | null;
  linked_document_id: string | null;
  created_at: string;
  documents: { title?: string | null } | { title?: string | null }[] | null;
};

export async function getAccessLogsByProjectSlug(projectSlug: string): Promise<AccessLogEntry[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return projectSlug === seededProject.slug ? seededAccessLogs : [];
  }

  const { data: project } = await supabase.from("projects").select("id").eq("slug", projectSlug).single();

  if (!project) {
    return [];
  }

  const { data, error } = await supabase
    .from("access_logs")
    .select(
      "id, project_id, log_date, access_feature, status, description, road_condition, gate_condition, weather, linked_document_id, created_at, documents(title)"
    )
    .eq("project_id", project.id)
    .order("log_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as AccessLogRow[]).map((entry) => ({
    id: entry.id,
    project_id: entry.project_id,
    log_date: entry.log_date,
    access_feature: entry.access_feature,
    status: entry.status,
    description: entry.description,
    road_condition: entry.road_condition,
    gate_condition: entry.gate_condition,
    weather: entry.weather,
    linked_document_id: entry.linked_document_id,
    linked_document_title:
      Array.isArray(entry.documents) ? entry.documents[0]?.title ?? null : entry.documents?.title ?? null,
    created_at: entry.created_at
  })) satisfies AccessLogEntry[];
}
