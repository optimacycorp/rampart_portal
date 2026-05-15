import { NextRequest, NextResponse } from "next/server";
import { getDocumentById, getDocumentVersionById } from "@/lib/documents";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  const supabase = getSupabaseAdminClient();
  const versionId = request.nextUrl.searchParams.get("versionId");

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const [document, version] = await Promise.all([
    getDocumentById(documentId),
    versionId ? getDocumentVersionById(versionId) : Promise.resolve(null)
  ]);

  const filePath = version?.file_path ?? document?.file_path;

  if (!filePath) {
    return NextResponse.json({ error: "Document file not found." }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from("project-documents")
    .createSignedUrl(filePath, 60 * 10, {
      download: true
    });

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Unable to generate download link." }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
