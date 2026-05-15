import { seededProject } from "@/lib/mock-data";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { DocumentVersion, Project, ProjectDocument } from "@/lib/types";

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
    current_version_number: 1,
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
    current_version_number: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const fallbackDocumentVersions: Record<string, DocumentVersion[]> = {
  "doc-fallback-1": [
    {
      id: "doc-fallback-1-v1",
      document_id: "doc-fallback-1",
      version_number: 1,
      file_path: "fallback/access-exhibit-index.pdf",
      notes: "Initial fallback version.",
      is_current: true,
      superseded_at: null,
      created_at: new Date().toISOString()
    }
  ],
  "doc-fallback-2": [
    {
      id: "doc-fallback-2-v1",
      document_id: "doc-fallback-2",
      version_number: 1,
      file_path: "fallback/drainage-observation-log.pdf",
      notes: "Initial fallback version.",
      is_current: true,
      superseded_at: null,
      created_at: new Date().toISOString()
    }
  ]
};

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
      "id, project_id, title, document_type, record_date, reception_number, book, page, source_agency, file_path, external_url, notes, status, current_version_number, created_at, updated_at"
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
      "id, project_id, title, document_type, record_date, reception_number, book, page, source_agency, file_path, external_url, notes, status, current_version_number, created_at, updated_at"
    )
    .eq("id", documentId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as ProjectDocument;
}

export async function getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return fallbackDocumentVersions[documentId] ?? [];
  }

  const { data, error } = await supabase
    .from("document_versions")
    .select("id, document_id, version_number, file_path, notes, is_current, superseded_at, created_at")
    .eq("document_id", documentId)
    .order("version_number", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as DocumentVersion[];
}

export async function getDocumentVersionById(versionId: string): Promise<DocumentVersion | null> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    const allFallbackVersions = Object.values(fallbackDocumentVersions).flat();
    return allFallbackVersions.find((version) => version.id === versionId) ?? null;
  }

  const { data, error } = await supabase
    .from("document_versions")
    .select("id, document_id, version_number, file_path, notes, is_current, superseded_at, created_at")
    .eq("id", versionId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as DocumentVersion;
}
