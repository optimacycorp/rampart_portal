import Link from "next/link";
import { deleteProjectDocument, uploadProjectDocument } from "@/app/projects/[projectId]/documents/actions";
import { DeleteButton } from "@/components/DeleteButton";
import { DocumentUploadForm } from "@/components/DocumentUploadForm";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentUserContext } from "@/lib/auth-server";
import { DOCUMENT_TYPE_OPTIONS } from "@/lib/constants";
import { getAssistantIndexStatusByProjectSlug } from "@/lib/document-chunks";
import { getDocumentsByProjectSlug, getProjectBySlug } from "@/lib/documents";
import { getSupabaseAdminClient } from "@/lib/supabase";

const feedbackText: Record<string, string> = {
  uploaded: "Document uploaded and saved to the project record.",
  "version-uploaded": "New document version uploaded and prior version preserved.",
  "supabase-not-configured": "Supabase is not configured yet. Add the project URL and service role key on the server.",
  "project-not-found": "The requested project could not be found.",
  "invalid-required-fields": "Title and document type are required.",
  "file-required": "Please choose a file to upload.",
  "storage-upload-failed": "The file could not be uploaded to the project-documents bucket.",
  "document-save-failed": "The document record could not be saved after upload.",
  "document-version-save-failed": "The document version history could not be updated.",
  deleted: "Document upload deleted.",
  forbidden: "Only the uploader or an audit user can delete uploaded records.",
  "document-delete-failed": "The document could not be deleted.",
  "document-not-found": "The requested document could not be found."
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "No record date";
}

export default async function DocumentsPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ status?: string; error?: string; type?: string }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const [{ user, role }, project, documents, assistantIndex] = await Promise.all([
    getCurrentUserContext(),
    getProjectBySlug(projectId),
    getDocumentsByProjectSlug(projectId),
    getAssistantIndexStatusByProjectSlug(projectId)
  ]);
  const supabaseConfigured = Boolean(getSupabaseAdminClient());
  const activeType = DOCUMENT_TYPE_OPTIONS.includes((query.type ?? "") as (typeof DOCUMENT_TYPE_OPTIONS)[number])
    ? query.type
    : "";
  const filteredDocuments = activeType ? documents.filter((document) => document.document_type === activeType) : documents;

  if (!project) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Documents"
          title="Project not found"
          description="The requested project slug does not exist in the current dataset."
        />
      </div>
    );
  }

  const action = uploadProjectDocument.bind(null, projectId);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Documents"
        title={`${project.name} documents`}
        description="Upload and organize deeds, easements, surveys, plats, drainage materials, agency correspondence, and supporting evidence files."
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
      <form className="flex items-center gap-3" method="get">
        <label className="text-sm font-medium text-slate-700" htmlFor="type">
          Document type
        </label>
        <select
          id="type"
          name="type"
          defaultValue={activeType}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none transition focus:border-pine"
        >
          <option value="">All types</option>
          {DOCUMENT_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Apply
        </button>
        {activeType ? (
          <Link href={`/projects/${projectId}/documents`} className="text-sm font-medium text-pine">
            Clear
          </Link>
        ) : null}
      </form>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-ink">Upload document</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Files are stored in the private <code>project-documents</code> bucket and indexed in the
                <code className="ml-1">documents</code> table.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              {supabaseConfigured ? "Live" : "Fallback"}
            </span>
          </div>
          <div className="mt-5">
            <DocumentUploadForm action={action} />
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-ink">Current document list</h2>
              <p className="mt-2 text-sm text-slate-600">Most recent records appear first.</p>
            </div>
            <span className="text-sm text-slate-500">
              {filteredDocuments.length} of {documents.length} documents
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {filteredDocuments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                {documents.length === 0 ? "No project documents have been uploaded yet." : "No documents match the selected type."}
              </div>
            ) : null}
            {filteredDocuments.map((document) => {
              const canDelete = role === "audit" || (Boolean(user) && document.created_by_user_id === user?.id);
              const indexed = assistantIndex.indexedDocumentIds.has(document.id);

              return (
                <div key={document.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <Link href={`/projects/${projectId}/documents/${document.id}`} className="block flex-1 space-y-2">
                      <p className="font-medium text-slate-800">{document.title}</p>
                      <p className="text-sm text-slate-500">
                        {document.document_type} | {document.source_agency ?? "Source pending"}
                      </p>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        {formatDate(document.record_date)} | {document.file_path ? "File attached" : "Metadata only"} |
                        <span className="ml-1">v{document.current_version_number}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        Uploaded by {document.created_by_email ?? "Unknown"} on{" "}
                        {new Date(document.created_at).toLocaleDateString()}
                      </p>
                    </Link>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                          indexed ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {indexed ? "Indexed" : "Needs indexing"}
                      </span>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                        {document.status}
                      </span>
                      {canDelete ? (
                        <form action={deleteProjectDocument.bind(null, projectId, document.id)}>
                          <DeleteButton label="Delete" />
                        </form>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
