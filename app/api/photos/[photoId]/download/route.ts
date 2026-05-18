import { NextRequest, NextResponse } from "next/server";
import { getEvidencePhotoById } from "@/lib/evidence-photos";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { photoId } = await params;
  const photo = await getEvidencePhotoById(photoId);

  if (!photo?.file_path) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  const { data, error } = await supabase.storage.from("field-photos").createSignedUrl(photo.file_path, 60 * 10);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Unable to create signed photo URL." }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
