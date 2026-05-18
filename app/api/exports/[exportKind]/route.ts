import { NextRequest, NextResponse } from "next/server";
import {
  buildDocumentIndexCsv,
  buildFieldEvidenceSummaryMarkdown,
  buildReviewerCommentsCsv
} from "@/lib/exports";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ exportKind: string }> }
) {
  const { exportKind } = await params;
  const projectSlug = request.nextUrl.searchParams.get("projectId")?.trim();

  if (!projectSlug) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }

  const payload =
    exportKind === "document-index"
      ? await buildDocumentIndexCsv(projectSlug)
      : exportKind === "reviewer-comments"
        ? await buildReviewerCommentsCsv(projectSlug)
        : exportKind === "field-evidence-summary"
          ? await buildFieldEvidenceSummaryMarkdown(projectSlug)
          : null;

  if (!payload) {
    return NextResponse.json({ error: "Export not found." }, { status: 404 });
  }

  return new NextResponse(payload.content, {
    status: 200,
    headers: {
      "Content-Type": payload.contentType,
      "Content-Disposition": `attachment; filename="${payload.filename}"`
    }
  });
}
