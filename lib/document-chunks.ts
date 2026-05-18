import { seededDocumentChunks, seededProject } from "@/lib/mock-data";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { DocumentChunk } from "@/lib/types";

export async function getDocumentChunksByProjectSlug(projectSlug: string): Promise<DocumentChunk[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return projectSlug === seededProject.slug ? seededDocumentChunks : [];
  }

  const { data: project } = await supabase.from("projects").select("id").eq("slug", projectSlug).single();

  if (!project) {
    return [];
  }

  const { data, error } = await supabase
    .from("document_chunks")
    .select("id, project_id, document_id, chunk_text, page_number, section_label, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as DocumentChunk[];
}

export async function searchDocumentChunksByProjectSlug(projectSlug: string, query: string, limit = 6): Promise<DocumentChunk[]> {
  const chunks = await getDocumentChunksByProjectSlug(projectSlug);
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return chunks.slice(0, limit);
  }

  const ranked = chunks
    .map((chunk) => {
      const haystack = `${chunk.section_label ?? ""} ${chunk.chunk_text}`.toLowerCase();
      const occurrences = normalizedQuery
        .split(/\s+/)
        .filter(Boolean)
        .reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);

      return {
        chunk,
        score: occurrences
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  return ranked.slice(0, limit).map((entry) => entry.chunk);
}
