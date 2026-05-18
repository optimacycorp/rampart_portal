import Link from "next/link";
import {
  deleteProjectDocument,
  ingestDocumentForAssistant,
  uploadDocumentVersion
} from "@/app/projects/[projectId]/documents/actions";
import { DeleteButton } from "@/components/DeleteButton";
import { DocumentVersionUploadForm } from "@/components/DocumentVersionUploadForm";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentUserContext } from "@/lib/auth-server";
import { getDocumentById, getDocumentVersions } from "@/lib/documents";

export default async function DocumentDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ documentId: string; projectId: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { projectId, documentId } = await params;
  const query = await searchParams;
  const [{ user, role }, document, versions] = await Promise.all([
    getCurrentUserContext(),
    getDocumentById(documentId),
    getDocumentVersions(documentId)
  ]);

  if (!document) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Document Detail"
          title="Document not found"
          description="The requested document record could not be found."
        />
      </div>
    );
  }

  const canDelete = role === "audit" || (Boolean(user) && document.created_by_user_id === user?.id);
  const versionAction = uploadDocumentVersion.bind(null, projectId, documentId);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Document Detail"
        title={document.title}
        description="Review document metadata, source references, and secure access to the stored file."
      />
      <DisclaimerBanner />
      {query.status === "version-uploaded" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          New document version uploaded and prior versions preserved in history.
        </div>
      ) : query.status === "assistant-ingested" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Document metadata and notes were indexed for assistant search.
        </div>
      ) : null}
      {query.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {query.error === "storage-upload-failed"
            ? "The file upload failed before the version record could be saved."
            : query.error === "document-version-save-failed"
              ? "The version history could not be updated."
              : query.error === "file-required"
                ? "Please choose a replacement file."
                : query.error === "forbidden"
                  ? "Only the uploader or an audit user can delete uploaded records."
                  : query.error === "assistant-ingest-failed"
                    ? "The assistant search index could not be updated for this document."
                    : "The requested document action could not be completed."}
        </div>
      ) : null}
      <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            `Document type: ${document.document_type}`,
            `Record date: ${document.record_date ?? "pending"}`,
            `Reception number: ${document.reception_number ?? "pending"}`,
            `Book / page: ${document.book ?? "pending"} / ${document.page ?? "pending"}`,
            `Source agency: ${document.source_agency ?? "pending"}`,
            `Status: ${document.status}`,
            `Current version: v${document.current_version_number}`,
            `Uploaded by: ${document.created_by_email ?? "Unknown"}`
          ].map((item) => (
            <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {item}
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
              {document.notes ?? "No document notes yet."}
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700">
              Created {new Date(document.created_at).toLocaleString()}
              {document.updated_at ? ` • Updated ${new Date(document.updated_at).toLocaleString()}` : ""}
            </div>
            <div className="flex flex-wrap gap-3">
              {document.file_path ? (
                <Link
                  href={`/api/documents/${document.id}/download?projectId=${projectId}`}
                  className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white"
                >
                  Open current file
                </Link>
              ) : null}
              <form action={ingestDocumentForAssistant.bind(null, projectId, document.id)}>
                <button
                  type="submit"
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Index for assistant
                </button>
              </form>
              {canDelete ? (
                <form action={deleteProjectDocument.bind(null, projectId, document.id)}>
                  <DeleteButton label="Delete document" />
                </form>
              ) : null}
              {document.external_url ? (
                <a
                  href={document.external_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800"
                >
                  Open external source
                </a>
              ) : null}
            </div>
            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-ink">Version history</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Superseded versions stay available for reference and download.
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {versions.length} versions
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className={`rounded-2xl border px-4 py-4 ${
                      version.is_current ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white/70 text-slate-500"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className={`font-semibold ${version.is_current ? "text-emerald-900" : "text-slate-500 line-through"}`}>
                          Version {version.version_number}
                        </p>
                        <p className="mt-1 text-sm">
                          {version.notes ?? (version.is_current ? "Current live file." : "Superseded revision.")}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                          Uploaded {new Date(version.created_at).toLocaleDateString()} by {version.uploaded_by_email ?? "Unknown"}
                          {version.superseded_at
                            ? ` • Superseded ${new Date(version.superseded_at).toLocaleDateString()}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                            version.is_current ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {version.is_current ? "Current" : "Superseded"}
                        </span>
                        <Link
                          href={`/api/documents/${document.id}/download?projectId=${projectId}&versionId=${version.id}`}
                          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                        >
                          Download
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Upload a new version</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Each replacement file becomes a new version. Older versions remain visible below with superseded styling.
            </p>
            <div className="mt-4">
              <DocumentVersionUploadForm action={versionAction} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
