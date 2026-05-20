import { NextRequest, NextResponse } from "next/server";
import { getPlanById, getPlanVersionById } from "@/lib/plans";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(request: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const supabase = getSupabaseAdminClient();
  const versionId = request.nextUrl.searchParams.get("versionId");
  const download = request.nextUrl.searchParams.get("download") === "1";

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const [plan, version] = await Promise.all([getPlanById(planId), versionId ? getPlanVersionById(versionId) : Promise.resolve(null)]);
  const filePath = version?.file_path ?? plan?.current_file_path;
  const fileName = version?.file_name ?? plan?.current_file_name ?? "plan-file";

  if (!filePath) {
    return NextResponse.json({ error: "Plan file not found." }, { status: 404 });
  }

  const { data, error } = await supabase.storage.from("project-plans").createSignedUrl(filePath, 60 * 10, {
    download: download ? fileName : false
  });

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Unable to generate plan file link." }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
