import { seededDocumentChunks, seededProject } from "@/lib/mock-data";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { DocumentChunk } from "@/lib/types";
import { getDocumentById, getProjectBySlug } from "./documents";
import { getMeetingTranscriptById } from "./meeting-transcripts";

export function chunkText(text: string, size = 900) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const chunks: string[] = [];

  for (let start = 0; start < normalized.length; start += size) {
    chunks.push(normalized.slice(start, start + size));
  }

  return chunks.filter(Boolean);
}

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
    .select("id, project_id, document_id, transcript_id, source_type, chunk_index, chunk_text, page_number, section_label, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as DocumentChunk[];
}

export async function ingestDocumentChunks(
  projectSlug: string,
  documentId: string,
  options: { extractedText?: string | null; sectionLabel?: string | null; pageNumber?: number | null } = {}
) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return { error: "Supabase is not configured." as const };
  }

  const [project, document] = await Promise.all([getProjectBySlug(projectSlug), getDocumentById(documentId)]);

  if (!project || !document) {
    return { error: "Project or document not found." as const };
  }

  const fallbackText = [document.title, document.notes, document.source_agency, document.external_url]
    .filter(Boolean)
    .join("\n\n");
  const chunkSource = `${options.extractedText ?? ""}`.trim() || fallbackText;

  if (!chunkSource.trim()) {
    return { error: "No text available to index for this document." as const };
  }

  const chunks = chunkText(chunkSource).map((chunk, index) => ({
    project_id: project.id,
    document_id: document.id,
    transcript_id: null,
    source_type: "document" as const,
    chunk_index: index,
    chunk_text: chunk,
    page_number: options.pageNumber ?? null,
    section_label: options.sectionLabel ?? `${document.title} metadata`
  }));

  await supabase.from("document_chunks").delete().eq("document_id", document.id).eq("source_type", "document");
  const { error } = await supabase.from("document_chunks").insert(chunks);

  if (error) {
    return { error: error.message };
  }

  return { inserted: chunks.length };
}

export async function ingestTranscriptChunks(
  projectSlug: string,
  transcriptId: string,
  options: { extractedText?: string | null; sectionLabel?: string | null } = {}
) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return { error: "Supabase is not configured." as const };
  }

  const [project, transcript] = await Promise.all([getProjectBySlug(projectSlug), getMeetingTranscriptById(transcriptId)]);

  if (!project || !transcript) {
    return { error: "Project or transcript not found." as const };
  }

  const fallbackText = [transcript.title, transcript.participants, transcript.source, transcript.notes, transcript.transcript_text]
    .filter(Boolean)
    .join("\n\n");
  const chunkSource = `${options.extractedText ?? ""}`.trim() || fallbackText;

  if (!chunkSource.trim()) {
    return { error: "No text available to index for this transcript." as const };
  }

  const chunks = chunkText(chunkSource).map((chunk, index) => ({
    project_id: project.id,
    document_id: null,
    transcript_id: transcript.id,
    source_type: "transcript" as const,
    chunk_index: index,
    chunk_text: chunk,
    page_number: null,
    section_label: options.sectionLabel ?? `${transcript.title} transcript`
  }));

  await supabase.from("document_chunks").delete().eq("transcript_id", transcript.id).eq("source_type", "transcript");
  const { error } = await supabase.from("document_chunks").insert(chunks);

  if (error) {
    return { error: error.message };
  }

  return { inserted: chunks.length };
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

export async function getAssistantIndexStatusByProjectSlug(projectSlug: string) {
  const chunks = await getDocumentChunksByProjectSlug(projectSlug);

  return {
    chunkCount: chunks.length,
    indexedDocumentIds: new Set(
      chunks.filter((chunk) => chunk.source_type === "document" && chunk.document_id).map((chunk) => chunk.document_id as string)
    ),
    indexedTranscriptIds: new Set(
      chunks.filter((chunk) => chunk.source_type === "transcript" && chunk.transcript_id).map((chunk) => chunk.transcript_id as string)
    )
  };
}

export async function getDocumentAssistantIndexStatus(documentId: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      indexed: false,
      chunkCount: 0,
      lastIndexedAt: null as string | null
    };
  }

  const { data, error } = await supabase
    .from("document_chunks")
    .select("id, created_at")
    .eq("document_id", documentId)
    .eq("source_type", "document")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return {
      indexed: false,
      chunkCount: 0,
      lastIndexedAt: null as string | null
    };
  }

  return {
    indexed: data.length > 0,
    chunkCount: data.length,
    lastIndexedAt: data[0]?.created_at ?? null
  };
}
