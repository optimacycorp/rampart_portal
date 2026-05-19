import {
  createReviewerComment,
  deleteReviewerComment,
  updateReviewerComment
} from "@/app/projects/[projectId]/comments/actions";
import { DeleteButton } from "@/components/DeleteButton";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { PageHeader } from "@/components/PageHeader";
import { ReviewerCommentForm } from "@/components/ReviewerCommentForm";
import { getCurrentUserContext } from "@/lib/auth-server";
import { getDocumentsByProjectSlug, getProjectBySlug } from "@/lib/documents";
import { getReviewerCommentFilterOptions, getReviewerCommentsByProjectSlug } from "@/lib/reviewer-comments";

const feedbackText: Record<string, string> = {
  created: "Reviewer comment created.",
  updated: "Reviewer comment updated.",
  deleted: "Reviewer comment deleted.",
  "supabase-not-configured": "Supabase is not configured yet. Add the project URL and service role key on the server.",
  "project-not-found": "The requested project could not be found.",
  "missing-required-fields": "Comment ID, reviewer, department, and comment text are required.",
  "comment-save-failed": "The reviewer comment could not be saved.",
  "comment-update-failed": "The reviewer comment could not be updated.",
  "comment-delete-failed": "The reviewer comment could not be deleted.",
  "comment-not-found": "The requested reviewer comment could not be found.",
  forbidden: "Only the comment creator or an audit user can delete reviewer comments."
};

export default async function CommentsPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    status?: string;
    error?: string;
    comment?: string;
    statusFilter?: string;
    priorityFilter?: string;
    departmentFilter?: string;
    responsiblePartyFilter?: string;
    applicationNumberFilter?: string;
  }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const [{ user, role }, project, documents] = await Promise.all([
    getCurrentUserContext(),
    getProjectBySlug(projectId),
    getDocumentsByProjectSlug(projectId)
  ]);
  const filterOptions = getReviewerCommentFilterOptions();
  const comments = await getReviewerCommentsByProjectSlug(projectId, {
    status: query.statusFilter,
    priority: query.priorityFilter,
    department: query.departmentFilter,
    responsibleParty: query.responsiblePartyFilter,
    applicationNumber: query.applicationNumberFilter
  });

  if (!project) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Reviewer Comments"
          title="Project not found"
          description="The requested project slug does not exist in the current dataset."
        />
      </div>
    );
  }

  const activeComment = query.comment ? comments.find((comment) => comment.id === query.comment) : undefined;
  const createAction = createReviewerComment.bind(null, projectId);
  const updateAction = activeComment ? updateReviewerComment.bind(null, projectId, activeComment.id) : null;
  const deleteAction = activeComment ? deleteReviewerComment.bind(null, projectId, activeComment.id) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Reviewer Comments"
        title={`${project.name} comment matrix`}
        description="Track reviewer requests, responses, responsibility, document links, and status transitions across applications."
      />
      <DisclaimerBanner />
      {query.status && feedbackText[query.status] ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {feedbackText[query.status]}
        </div>
      ) : null}
      {query.error && feedbackText[query.error] ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {feedbackText[query.error]}
        </div>
      ) : null}
      <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
        <form className="grid gap-4 md:grid-cols-5" method="get">
          <input type="hidden" name="comment" value={query.comment ?? ""} />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
            <select
              name="statusFilter"
              defaultValue={query.statusFilter ?? ""}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
            >
              <option value="">All</option>
              {filterOptions.statuses.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Priority</span>
            <select
              name="priorityFilter"
              defaultValue={query.priorityFilter ?? ""}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
            >
              <option value="">All</option>
              {filterOptions.priorities.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Department</span>
            <select
              name="departmentFilter"
              defaultValue={query.departmentFilter ?? ""}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
            >
              <option value="">All</option>
              {filterOptions.departments.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Responsible party</span>
            <select
              name="responsiblePartyFilter"
              defaultValue={query.responsiblePartyFilter ?? ""}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
            >
              <option value="">All</option>
              {filterOptions.responsibleParties.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Application number</span>
            <select
              name="applicationNumberFilter"
              defaultValue={query.applicationNumberFilter ?? ""}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
            >
              <option value="">All</option>
              {filterOptions.applicationNumbers.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-5 flex gap-3">
            <button
              type="submit"
              className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Apply filters
            </button>
            <a
              href={`/projects/${projectId}/comments`}
              className="rounded-full bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-800"
            >
              Clear
            </a>
          </div>
        </form>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-card">
          <div className="grid grid-cols-[0.9fr_1fr_1fr_1fr_1.2fr_0.7fr_0.9fr_1fr_2fr_1.3fr_0.8fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span>Comment ID</span>
            <span>Application No.</span>
            <span>Page / Type</span>
            <span>Reviewer</span>
            <span>Department</span>
            <span>Priority</span>
            <span>Status</span>
            <span>Responsible Party</span>
            <span>Comment</span>
            <span>Linked Documents</span>
            <span>Source</span>
          </div>
          <div className="divide-y divide-slate-100">
            {comments.length === 0 ? (
              <div className="px-5 py-8 text-sm text-slate-500">No reviewer comments match the current filters.</div>
            ) : null}
            {comments.map((comment) => {
              const editHref =
                `/projects/${projectId}/comments?comment=${comment.id}` +
                (query.statusFilter ? `&statusFilter=${encodeURIComponent(query.statusFilter)}` : "") +
                (query.priorityFilter ? `&priorityFilter=${encodeURIComponent(query.priorityFilter)}` : "") +
                (query.departmentFilter ? `&departmentFilter=${encodeURIComponent(query.departmentFilter)}` : "") +
                (query.responsiblePartyFilter
                  ? `&responsiblePartyFilter=${encodeURIComponent(query.responsiblePartyFilter)}`
                  : "") +
                (query.applicationNumberFilter
                  ? `&applicationNumberFilter=${encodeURIComponent(query.applicationNumberFilter)}`
                  : "");

              return (
                <a
                  key={comment.id}
                  href={editHref}
                  className={`grid grid-cols-[0.9fr_1fr_1fr_1fr_1.2fr_0.7fr_0.9fr_1fr_2fr_1.3fr_0.8fr] gap-4 px-5 py-4 text-sm transition ${
                    activeComment?.id === comment.id ? "bg-emerald-50/70" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="font-medium text-slate-800">{comment.comment_id}</span>
                  <span className="text-slate-600">{comment.application_number}</span>
                  <span className="text-slate-600">
                    {[comment.page_reference, comment.annotation_type].filter(Boolean).join(" | ") || "Unspecified"}
                  </span>
                  <span className="text-slate-600">{comment.reviewer_name}</span>
                  <span className="text-slate-600">{comment.department}</span>
                  <span className="text-slate-600">{comment.priority}</span>
                  <span className="text-slate-600">{comment.status}</span>
                  <span className="text-slate-600">{comment.responsible_party}</span>
                  <span className="text-slate-700">{comment.comment_text}</span>
                  <span className="text-slate-600">{comment.linked_document_title ?? "Unlinked"}</span>
                  <span className="text-slate-600">
                    {comment.imported_from_document_id ? "Imported" : "Manual"}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
            <h2 className="text-xl font-semibold text-ink">{activeComment ? "Edit comment" : "Add comment"}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Capture review direction, response planning, ownership, and document linkage in one place.
            </p>
            <div className="mt-5">
              <ReviewerCommentForm
                action={activeComment && updateAction ? updateAction : createAction}
                documents={documents}
                options={filterOptions}
                comment={activeComment}
                submitLabel={activeComment ? "Save changes" : "Create comment"}
              />
            </div>
            {activeComment && deleteAction && (role === "audit" || activeComment.created_by_user_id === user?.id) ? (
              <form action={deleteAction} className="mt-4">
                <DeleteButton label="Delete comment" />
              </form>
            ) : null}
          </div>
          {activeComment ? (
            <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
              <h2 className="text-xl font-semibold text-ink">Current response</h2>
              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
                {activeComment.response_text || "No response drafted yet."}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <DisclaimerBanner />
    </div>
  );
}
