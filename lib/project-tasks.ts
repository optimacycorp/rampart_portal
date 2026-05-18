import { seededProject, seededProjectTasks } from "@/lib/mock-data";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { ProjectTask } from "@/lib/types";

type ProjectTaskRow = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  responsible_party: string | null;
  waiting_on: string | null;
  due_date: string | null;
  linked_comment_id: string | null;
  linked_document_id: string | null;
  created_at: string;
  updated_at: string;
  documents: { title?: string | null } | { title?: string | null }[] | null;
};

export async function getProjectTasksByProjectSlug(projectSlug: string): Promise<ProjectTask[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return projectSlug === seededProject.slug ? seededProjectTasks : [];
  }

  const { data: project } = await supabase.from("projects").select("id").eq("slug", projectSlug).single();

  if (!project) {
    return [];
  }

  const { data, error } = await supabase
    .from("project_tasks")
    .select(
      "id, project_id, title, description, status, priority, responsible_party, waiting_on, due_date, linked_comment_id, linked_document_id, created_at, updated_at, documents(title)"
    )
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as ProjectTaskRow[]).map((row) => ({
    id: row.id,
    project_id: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    responsible_party: row.responsible_party,
    waiting_on: row.waiting_on,
    due_date: row.due_date,
    linked_comment_id: row.linked_comment_id,
    linked_document_id: row.linked_document_id,
    linked_document_title:
      Array.isArray(row.documents) ? row.documents[0]?.title ?? null : row.documents?.title ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at
  }));
}
