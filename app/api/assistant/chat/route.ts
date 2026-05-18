import { NextRequest, NextResponse } from "next/server";
import { answerAssistantQuestion } from "@/lib/assistant";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { projectId?: string; question?: string };
    const projectId = `${body.projectId ?? ""}`.trim();
    const question = `${body.question ?? ""}`.trim();

    if (!projectId || !question) {
      return NextResponse.json({ error: "projectId and question are required." }, { status: 400 });
    }

    const response = await answerAssistantQuestion(projectId, question);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected assistant error."
      },
      { status: 500 }
    );
  }
}
