import Link from "next/link";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { PageHeader } from "@/components/PageHeader";
import { getDocumentById } from "@/lib/documents";

export default async function DocumentDetailPage({
  params
}: {
  params: Promise<{ documentId: string; projectId: string }>;
}) {
  const { projectId, documentId } = await params;
  const document = await getDocumentById(documentId);

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

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Document Detail"
        title={document.title}
        description="Review document metadata, source references, and secure access to the stored file."
      />
      <DisclaimerBanner />
      <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            `Document type: ${document.document_type}`,
            `Record date: ${document.record_date ?? "pending"}`,
            `Reception number: ${document.reception_number ?? "pending"}`,
            `Book / page: ${document.book ?? "pending"} / ${document.page ?? "pending"}`,
            `Source agency: ${document.source_agency ?? "pending"}`,
            `Status: ${document.status}`
          ].map((item) => (
            <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {item}
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
            {document.notes ?? "No document notes yet."}
          </div>
          <div className="flex flex-wrap gap-3">
            {document.file_path ? (
              <Link
                href={`/api/documents/${document.id}/download?projectId=${projectId}`}
                className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white"
              >
                Open / download file
              </Link>
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
        </div>
      </div>
    </div>
  );
}
