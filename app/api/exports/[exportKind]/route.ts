import { NextRequest, NextResponse } from "next/server";
import {
  buildDocumentIndexCsv,
  buildFieldEvidenceSummaryMarkdown,
  buildLprEvidenceCsv,
  buildReviewerCommentsCsv
} from "@/lib/exports";
import { getCurrentUserContext } from "@/lib/auth-server";
import { getProjectBySlug } from "@/lib/documents";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { readCallerMetadata } from "@/lib/address/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ exportKind: string }> }
) {
  const { exportKind } = await params;
  const projectSlug = request.nextUrl.searchParams.get("projectId")?.trim();
  const caller = readCallerMetadata(request);

  if (!projectSlug) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }

  if (exportKind === "lpr-evidence") {
    const { user, role } = await getCurrentUserContext();

    if (!user || (role !== "owner" && role !== "audit")) {
      const supabase = getSupabaseAdminClient();
      const project = await getProjectBySlug(projectSlug);
      if (supabase && project) {
        await supabase.from("lpr_export_audit_log").insert({
          project_id: project.id,
          export_kind: exportKind,
          requested_by_user_id: user?.id ?? null,
          requested_by_email: user?.email ?? null,
          request_ip: caller.clientIp,
          status_code: 403,
          success: false,
          row_count: 0,
          metadata: {
            caller_system: caller.callerSystem
          }
        });
      }

      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  }

  const payload =
    exportKind === "document-index"
      ? await buildDocumentIndexCsv(projectSlug)
      : exportKind === "reviewer-comments"
        ? await buildReviewerCommentsCsv(projectSlug)
        : exportKind === "field-evidence-summary"
          ? await buildFieldEvidenceSummaryMarkdown(projectSlug)
          : exportKind === "lpr-evidence"
            ? await buildLprEvidenceCsv(projectSlug)
          : null;

  if (!payload) {
    return NextResponse.json({ error: "Export not found." }, { status: 404 });
  }

  if (exportKind === "lpr-evidence") {
    const supabase = getSupabaseAdminClient();
    const project = await getProjectBySlug(projectSlug);
    const { user } = await getCurrentUserContext();

    if (supabase && project) {
      await supabase.from("lpr_export_audit_log").insert({
        project_id: project.id,
        export_kind: exportKind,
        requested_by_user_id: user?.id ?? null,
        requested_by_email: user?.email ?? null,
        request_ip: caller.clientIp,
        status_code: 200,
        success: true,
        row_count: "rowCount" in payload ? payload.rowCount : null,
        metadata: {
          caller_system: caller.callerSystem
        }
      });
    }
  }

  return new NextResponse(payload.content, {
    status: 200,
    headers: {
      "Content-Type": payload.contentType,
      "Content-Disposition": `attachment; filename="${payload.filename}"`
    }
  });
}
