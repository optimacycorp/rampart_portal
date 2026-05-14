import { NextRequest, NextResponse } from "next/server";
import { getDocumentById } from "@/lib/documents";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const document = await getDocumentById(documentId);

  if (!document?.file_path) {
    return NextResponse.json({ error: "Document file not found." }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from("project-documents")
    .createSignedUrl(document.file_path, 60 * 10, {
      download: true
    });

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Unable to generate download link." }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
