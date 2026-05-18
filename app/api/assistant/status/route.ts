import { NextRequest, NextResponse } from "next/server";
import { getAssistantStatusSnapshot } from "@/lib/assistant";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { projectId?: string };
    const projectId = `${body.projectId ?? ""}`.trim();

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    }

    const snapshot = await getAssistantStatusSnapshot(projectId);
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected assistant status error."
      },
      { status: 500 }
    );
  }
}
