import { NextRequest, NextResponse } from "next/server";
import { getDocumentById, getProjectBySlug } from "@/lib/documents";
import { getSupabaseAdminClient } from "@/lib/supabase";

function chunkText(text: string, size = 900) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const chunks: string[] = [];

  for (let start = 0; start < normalized.length; start += size) {
    chunks.push(normalized.slice(start, start + size));
  }

  return chunks.filter(Boolean);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      projectId?: string;
      documentId?: string;
      extractedText?: string;
      pageNumber?: number;
      sectionLabel?: string;
    };
    const projectId = `${body.projectId ?? ""}`.trim();
    const documentId = `${body.documentId ?? ""}`.trim();
    const extractedText = `${body.extractedText ?? ""}`.trim();
    const supabase = getSupabaseAdminClient();

    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    if (!projectId || !documentId) {
      return NextResponse.json({ error: "projectId and documentId are required." }, { status: 400 });
    }

    const [project, document] = await Promise.all([getProjectBySlug(projectId), getDocumentById(documentId)]);

    if (!project || !document) {
      return NextResponse.json({ error: "Project or document not found." }, { status: 404 });
    }

    const fallbackText = [document.title, document.notes, document.source_agency].filter(Boolean).join("\n\n");
    const chunkSource = extractedText || fallbackText;

    if (!chunkSource.trim()) {
      return NextResponse.json(
        { error: "No extracted text was provided, and the document metadata did not contain enough text to chunk." },
        { status: 400 }
      );
    }

    const chunks = chunkText(chunkSource).map((chunk) => ({
      project_id: project.id,
      document_id: document.id,
      chunk_text: chunk,
      page_number: body.pageNumber ?? null,
      section_label: body.sectionLabel ?? null
    }));

    const { error } = await supabase.from("document_chunks").insert(chunks);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ inserted: chunks.length });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected assistant ingest error."
      },
      { status: 500 }
    );
  }
}
