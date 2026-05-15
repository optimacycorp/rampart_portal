import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { FieldEvidenceMap } from "@/components/FieldEvidenceMap";
import { PageHeader } from "@/components/PageHeader";
import { getFieldPointsByProjectSlug } from "@/lib/field-points";

export default async function MapPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const fieldPoints = await getFieldPointsByProjectSlug(projectId);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Field Evidence Map"
        title="Map-ready evidence layers"
        description="Field points are rendered by point type with toggles for monuments, culverts, drainage features, road and access features, photo stations, and gates."
      />
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <strong>Map coordination notice:</strong> Map data is preliminary and for coordination only. It is not a survey,
        plat, engineering plan, or legal boundary determination.
      </div>
      <DisclaimerBanner />
      <FieldEvidenceMap fieldPoints={fieldPoints} />
    </div>
  );
}
