import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { PageHeader } from "@/components/PageHeader";
import { seededReviewerComments } from "@/lib/mock-data";

const filters = ["Status", "Priority", "Department", "Responsible Party", "Application Number"];

export default function CommentsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Reviewer Comments"
        title="Comment matrix"
        description="Track reviewer requests, responses, responsibility, document links, and status transitions across applications."
      />
      <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
        <div className="flex flex-wrap gap-3">
          {filters.map((filter) => (
            <div key={filter} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
              {filter}
            </div>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-card">
        <div className="grid grid-cols-9 gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          <span>Comment ID</span>
          <span>Application No.</span>
          <span>Reviewer</span>
          <span>Department</span>
          <span>Priority</span>
          <span>Status</span>
          <span>Responsible Party</span>
          <span>Comment</span>
          <span>Linked Documents</span>
        </div>
        {seededReviewerComments.map((comment) => (
          <div key={comment.id} className="grid grid-cols-9 gap-4 px-5 py-4 text-sm text-slate-700">
            <span>{comment.comment_id}</span>
            <span>{comment.application_number}</span>
            <span>{comment.reviewer_name}</span>
            <span>{comment.department}</span>
            <span>{comment.priority}</span>
            <span>{comment.status}</span>
            <span>{comment.responsible_party}</span>
            <span>{comment.comment_text}</span>
            <span>{comment.linked_document_title ?? "Unlinked"}</span>
          </div>
        ))}
      </div>
      <DisclaimerBanner />
    </div>
  );
}
