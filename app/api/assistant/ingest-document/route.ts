import { NextRequest, NextResponse } from "next/server";
import { ingestDocumentChunks, ingestTranscriptChunks } from "@/lib/document-chunks";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      projectId?: string;
      documentId?: string;
      transcriptId?: string;
      extractedText?: string;
      pageNumber?: number;
      sectionLabel?: string;
      sourceType?: "document" | "transcript";
    };
    const projectId = `${body.projectId ?? ""}`.trim();
    const documentId = `${body.documentId ?? ""}`.trim();
    const transcriptId = `${body.transcriptId ?? ""}`.trim();
    const extractedText = `${body.extractedText ?? ""}`.trim();
    const sourceType = body.sourceType === "transcript" ? "transcript" : "document";

    if (!projectId || (sourceType === "document" && !documentId) || (sourceType === "transcript" && !transcriptId)) {
      return NextResponse.json(
        { error: "projectId and a matching documentId or transcriptId are required." },
        { status: 400 }
      );
    }

    const result =
      sourceType === "transcript"
        ? await ingestTranscriptChunks(projectId, transcriptId, {
            extractedText,
            sectionLabel: body.sectionLabel ?? null
          })
        : await ingestDocumentChunks(projectId, documentId, {
            extractedText,
            pageNumber: body.pageNumber ?? null,
            sectionLabel: body.sectionLabel ?? null
          });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected assistant ingest error."
      },
      { status: 500 }
    );
  }
}
