import { seededProject } from "@/lib/mock-data";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { Project, ProjectDocument } from "@/lib/types";

const fallbackDocuments: ProjectDocument[] = [
  {
    id: "doc-fallback-1",
    project_id: seededProject.id,
    title: "Access Exhibit Index",
    document_type: "easement",
    record_date: null,
    reception_number: null,
    book: null,
    page: null,
    source_agency: "El Paso County",
    file_path: null,
    external_url: null,
    notes: "Fallback example while Supabase is not configured.",
    status: "uploaded",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "doc-fallback-2",
    project_id: seededProject.id,
    title: "Drainage Observation Log",
    document_type: "drainage_report",
    record_date: null,
    reception_number: null,
    book: null,
    page: null,
    source_agency: "Project Team",
    file_path: null,
    external_url: null,
    notes: "Fallback example while Supabase is not configured.",
    status: "uploaded",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export async function getProjectBySlug(projectSlug: string): Promise<Project | null> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return projectSlug === seededProject.slug ? seededProject : null;
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, slug, description, parcel_number, address, county, state")
    .eq("slug", projectSlug)
    .single();

  if (error || !data) {
    return projectSlug === seededProject.slug ? seededProject : null;
  }

  return data satisfies Project;
}

export async function getDocumentsByProjectSlug(projectSlug: string): Promise<ProjectDocument[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return projectSlug === seededProject.slug ? fallbackDocuments : [];
  }

  const project = await getProjectBySlug(projectSlug);

  if (!project) {
    return [];
  }

  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, project_id, title, document_type, record_date, reception_number, book, page, source_agency, file_path, external_url, notes, status, created_at, updated_at"
    )
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as ProjectDocument[];
}

export async function getDocumentById(documentId: string): Promise<ProjectDocument | null> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return fallbackDocuments.find((document) => document.id === documentId) ?? null;
  }

  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, project_id, title, document_type, record_date, reception_number, book, page, source_agency, file_path, external_url, notes, status, created_at, updated_at"
    )
    .eq("id", documentId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as ProjectDocument;
}
