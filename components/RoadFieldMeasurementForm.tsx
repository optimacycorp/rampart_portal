import { ROAD_MEASUREMENT_TYPE_OPTIONS } from "@/lib/constants";
import { FieldPoint, LidarScan } from "@/lib/types";

type RoadFieldMeasurementFormProps = {
  action: (formData: FormData) => Promise<void>;
  fieldPoints: FieldPoint[];
  lidarScans: LidarScan[];
};

export function RoadFieldMeasurementForm({
  action,
  fieldPoints,
  lidarScans
}: RoadFieldMeasurementFormProps) {
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Measured at</span>
          <input
            name="measured_at"
            required
            type="datetime-local"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Measurement type</span>
          <select
            name="measurement_type"
            defaultValue="road_width"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
          >
            {ROAD_MEASUREMENT_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Value</span>
          <input
            name="value"
            required
            type="number"
            step="any"
            placeholder="18.4"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Units</span>
          <input
            name="units"
            required
            type="text"
            placeholder="ft, %, in"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Latitude</span>
          <input
            name="latitude"
            type="number"
            step="any"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Longitude</span>
          <input
            name="longitude"
            type="number"
            step="any"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Elevation (ft)</span>
          <input
            name="elevation_ft"
            type="number"
            step="any"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Source equipment</span>
          <input
            name="source_equipment"
            type="text"
            placeholder="3DMakerPro Eagle Max"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Linked field point</span>
          <select
            name="source_point_id"
            defaultValue=""
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
          >
            <option value="">No linked field point</option>
            {fieldPoints.map((point) => (
              <option key={point.id} value={point.id}>
                {point.point_name} | {point.point_type}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Linked LiDAR scan</span>
          <select
            name="lidar_scan_id"
            defaultValue=""
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
          >
            <option value="">No linked LiDAR scan</option>
            {lidarScans.map((scan) => (
              <option key={scan.id} value={scan.id}>
                {scan.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Measurement notes</span>
        <textarea
          name="notes"
          rows={4}
          placeholder="Describe where the measurement was taken and what it supports."
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
        />
      </label>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <strong>Coordination evidence only:</strong> Saved measurements support project review and field coordination. They are not certified survey, design, or agency-approved values unless separately reviewed by the appropriate licensed professional.
      </div>

      <button
        type="submit"
        className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
      >
        Save roadway measurement
      </button>
    </form>
  );
}
