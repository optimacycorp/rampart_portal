"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type AssistantSource = {
  href: string;
  label: string;
};

type AssistantResponse = {
  answer: string;
  type: "status" | "evidence" | "mixed";
  disclaimer: string;
  sources: AssistantSource[];
  missing?: string[];
};

const starterQuestions = [
  "What is the USFS access status?",
  "What items are waiting on the City?",
  "What items are waiting on Dave?",
  "What drainage comments are still open?",
  "What documents support legal access?",
  "What culverts still need documentation?",
  "What is blocking development plan approval?"
];

export function ProjectAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AssistantResponse | null>(null);
  const projectSlug = useMemo(() => {
    const match = pathname.match(/^\/projects\/([^/]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  async function askAssistant(nextQuestion: string) {
    if (!projectSlug || !nextQuestion.trim()) {
      return;
    }

    setLoading(true);
    setResponse(null);

    try {
      const result = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          projectId: projectSlug,
          question: nextQuestion
        })
      });

      const payload = (await result.json()) as AssistantResponse | { error: string };

      if (!result.ok || "error" in payload) {
        setResponse({
          answer: "The assistant could not answer that question right now.",
          type: "mixed",
          disclaimer:
            "This assistant is a coordination tool only. It does not provide legal, surveying, engineering, drainage, or approval conclusions.",
          sources: [],
          missing: ["Try again after more project records or document chunks are available."]
        });
        return;
      }

      setResponse(payload);
    } finally {
      setLoading(false);
    }
  }

  if (!projectSlug) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[min(28rem,calc(100vw-2rem))]">
      {open ? (
        <div className="rounded-[2rem] border border-white/70 bg-white/95 shadow-card backdrop-blur">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">Project Assistant</p>
              <p className="mt-1 text-sm text-slate-600">Status-aware coordination helper with linked sources.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
            >
              Close
            </button>
          </div>
          <div className="space-y-4 px-5 py-4">
            <div className="flex flex-wrap gap-2">
              {starterQuestions.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => {
                    setQuestion(starter);
                    void askAssistant(starter);
                  }}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:border-pine hover:text-pine"
                >
                  {starter}
                </button>
              ))}
            </div>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void askAssistant(question);
              }}
            >
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
                placeholder="Ask about status, blockers, access, documents, drainage, culverts, or waiting groups."
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Checking records..." : "Ask assistant"}
              </button>
            </form>
            {response ? (
              <div className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                  {response.disclaimer}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{response.type}</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{response.answer}</p>
                </div>
                {response.missing?.length ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Missing</p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-600">
                      {response.missing.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sources</p>
                  <div className="mt-2 space-y-2">
                    {response.sources.length === 0 ? (
                      <p className="text-sm text-slate-500">No linked sources available.</p>
                    ) : (
                      response.sources.map((source) => (
                        <Link
                          key={`${source.href}-${source.label}`}
                          href={source.href}
                          className="block rounded-2xl bg-white px-3 py-2 text-sm text-pine transition hover:bg-slate-100"
                        >
                          {source.label}
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ml-auto flex items-center gap-2 rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white shadow-card"
        >
          Project Assistant
        </button>
      )}
    </div>
  );
}
