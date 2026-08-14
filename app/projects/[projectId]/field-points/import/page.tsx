import { importFieldPoints } from "@/app/projects/[projectId]/field-points/actions";
import { FieldPointImportWizard } from "@/components/FieldPointImportWizard";
import { CsvTemplateCard } from "@/components/CsvTemplateCard";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { PageHeader } from "@/components/PageHeader";

const feedbackText: Record<string, string> = {
  "supabase-not-configured": "Supabase is not configured yet. Add the project URL and service role key on the server.",
  "project-not-found": "The requested project could not be found.",
  "no-preview-data": "Upload and preview a CSV before saving.",
  "invalid-preview-data": "The preview payload could not be parsed.",
  "no-valid-rows": "No valid field point rows were available to save.",
  "save-failed": "The field point import could not be saved."
};

export default async function FieldPointImportPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const action = importFieldPoints.bind(null, projectId);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="GPS Import"
        title="CSV import workflow"
        description="Import flow includes CSV upload, manual column mapping, validation, missing-coordinate flags, preview, and save."
      />
      {query.error && feedbackText[query.error] ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {feedbackText[query.error]}
        </div>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <FieldPointImportWizard action={action} />
        <CsvTemplateCard />
      </div>
      <DisclaimerBanner />
    </div>
  );
}
