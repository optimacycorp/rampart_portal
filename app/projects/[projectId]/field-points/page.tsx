import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { seededFieldPoints } from "@/lib/mock-data";

export default async function FieldPointsPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Field Points"
        title="Imported GPS and observation points"
        description="Use this workspace for survey-adjacent field evidence, control references, culvert observations, gates, berms, and photo stations."
      />
      <div className="flex justify-end">
        <Link
          href={`/projects/${projectId}/field-points/import`}
          className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white"
        >
          Import CSV
        </Link>
      </div>
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-card">
        <div className="grid grid-cols-6 gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          <span>Point Name</span>
          <span>Type</span>
          <span>Easting</span>
          <span>Northing</span>
          <span>Elevation</span>
          <span>Confidence</span>
        </div>
        {seededFieldPoints.map((point) => (
          <div key={point.id} className="grid grid-cols-6 gap-4 px-5 py-4 text-sm text-slate-700">
            <span>{point.point_name}</span>
            <span>{point.point_type}</span>
            <span>{point.easting ?? "—"}</span>
            <span>{point.northing ?? "—"}</span>
            <span>{point.elevation ?? "—"}</span>
            <span>{point.confidence}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
