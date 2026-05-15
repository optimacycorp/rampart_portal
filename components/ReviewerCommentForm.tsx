import { ProjectDocument, ReviewerComment } from "@/lib/types";

type ReviewerCommentFormProps = {
  action: (formData: FormData) => Promise<void>;
  documents: ProjectDocument[];
  options: {
    applicationNumbers: string[];
    departments: string[];
    responsibleParties: string[];
    statuses: string[];
    priorities: string[];
  };
  comment?: ReviewerComment;
  submitLabel: string;
};

export function ReviewerCommentForm({
  action,
  documents,
  options,
  comment,
  submitLabel
}: ReviewerCommentFormProps) {
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Comment ID</span>
          <input
            name="comment_id"
            required
            defaultValue={comment?.comment_id ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
            type="text"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Application number</span>
          <input
            name="application_number"
            list="application-number-options"
            defaultValue={comment?.application_number ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
            type="text"
          />
          <datalist id="application-number-options">
            {options.applicationNumbers.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Reviewer</span>
          <input
            name="reviewer_name"
            required
            defaultValue={comment?.reviewer_name ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
            type="text"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Department</span>
          <input
            name="department"
            list="department-options"
            required
            defaultValue={comment?.department ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
            type="text"
          />
          <datalist id="department-options">
            {options.departments.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Priority</span>
          <select
            name="priority"
            defaultValue={comment?.priority ?? "medium"}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
          >
            {options.priorities.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
          <select
            name="status"
            defaultValue={comment?.status ?? "open"}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
          >
            {options.statuses.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Responsible party</span>
          <input
            name="responsible_party"
            list="responsible-party-options"
            defaultValue={comment?.responsible_party ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
            type="text"
          />
          <datalist id="responsible-party-options">
            {options.responsibleParties.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Due date</span>
          <input
            name="due_date"
            defaultValue={comment?.due_date ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
            type="date"
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Comment</span>
        <textarea
          name="comment_text"
          required
          rows={4}
          defaultValue={comment?.comment_text ?? ""}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Response</span>
        <textarea
          name="response_text"
          rows={4}
          defaultValue={comment?.response_text ?? ""}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Linked document</span>
        <select
          name="linked_document_id"
          defaultValue={comment?.linked_document_id ?? ""}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
        >
          <option value="">Unlinked</option>
          {documents.map((document) => (
            <option key={document.id} value={document.id}>
              {document.title}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
      >
        {submitLabel}
      </button>
    </form>
  );
}
