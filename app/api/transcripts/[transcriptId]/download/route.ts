import { NextRequest, NextResponse } from "next/server";
import { getMeetingTranscriptById } from "@/lib/meeting-transcripts";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transcriptId: string }> }
) {
  const { transcriptId } = await params;
  const kind = request.nextUrl.searchParams.get("kind");
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const transcript = await getMeetingTranscriptById(transcriptId);

  if (!transcript) {
    return NextResponse.json({ error: "Transcript not found." }, { status: 404 });
  }

  const filePath = kind === "audio" ? transcript.audio_file_path : transcript.transcript_file_path;

  if (!filePath) {
    return NextResponse.json({ error: "Requested file is not attached." }, { status: 404 });
  }

  const { data, error } = await supabase.storage.from("meeting-media").createSignedUrl(filePath, 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Could not create a download URL." }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
