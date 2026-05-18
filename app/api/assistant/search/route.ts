import { NextRequest, NextResponse } from "next/server";
import { searchDocumentChunksByProjectSlug } from "@/lib/document-chunks";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { projectId?: string; query?: string; limit?: number };
    const projectId = `${body.projectId ?? ""}`.trim();
    const query = `${body.query ?? ""}`.trim();
    const limit = Number(body.limit ?? 6);

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    }

    const chunks = await searchDocumentChunksByProjectSlug(projectId, query, Number.isFinite(limit) ? limit : 6);
    return NextResponse.json({ chunks });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected assistant search error."
      },
      { status: 500 }
    );
  }
}
