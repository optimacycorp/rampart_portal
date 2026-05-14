import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { MapPlaceholder } from "@/components/MapPlaceholder";
import { PageHeader } from "@/components/PageHeader";

export default function MapPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Field Evidence Map"
        title="Map-ready evidence layers"
        description="The map route is prepared for MapLibre field point rendering and point-type toggles."
      />
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <strong>Map coordination notice:</strong> Map data is preliminary and for coordination only. It is not a survey,
        plat, engineering plan, or legal boundary determination.
      </div>
      <DisclaimerBanner />
      <MapPlaceholder />
    </div>
  );
}
