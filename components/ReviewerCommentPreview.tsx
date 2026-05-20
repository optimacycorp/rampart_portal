"use client";

import { useEffect, useState } from "react";

type ReviewerCommentPreviewProps = {
  commentId: string;
  applicationNumber: string;
  reviewerName: string;
  department: string;
  status: string;
  responsibleParty: string;
  pageType: string;
  commentText: string;
  responseText?: string;
};

export function ReviewerCommentPreview({
  commentId,
  applicationNumber,
  reviewerName,
  department,
  status,
  responsibleParty,
  pageType,
  commentText,
  responseText
}: ReviewerCommentPreviewProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open]);

  return (
    <>
      <div className="space-y-2">
        <p className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-slate-700" title={commentText}>
          {commentText}
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs font-semibold uppercase tracking-[0.16em] text-pine transition hover:text-emerald-800"
        >
          View full comment
        </button>
      </div>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Comment {commentId}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-ink">{applicationNumber || "Application not set"}</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">Reviewer: {reviewerName}</div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">Department: {department}</div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">Status: {status}</div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Responsible party: {responsibleParty || "Unassigned"}
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 md:col-span-2">
                  Page / Type: {pageType}
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Review comment</p>
                <div className="mt-3 max-h-[42vh] overflow-y-auto rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{commentText}</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Applicant response</p>
                <div className="mt-3 max-h-[22vh] overflow-y-auto rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {responseText?.trim() || "No response drafted yet."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
