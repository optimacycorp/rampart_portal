import {
  ROAD_PASSABILITY_OPTIONS,
  ROAD_SEVERITY_OPTIONS,
  ROAD_SURFACE_CONDITION_OPTIONS
} from "@/lib/constants";
import { EvidencePhoto, FieldPoint } from "@/lib/types";

type RoadConditionReportFormProps = {
  action: (formData: FormData) => Promise<void>;
  fieldPoints: FieldPoint[];
  photos: EvidencePhoto[];
};

export function RoadConditionReportForm({ action, fieldPoints, photos }: RoadConditionReportFormProps) {
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Observed at</span>
          <input
            name="observed_at"
            required
            type="datetime-local"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Condition summary</span>
          <input
            name="condition"
            required
            type="text"
            placeholder="Rutting near turnout"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Surface condition</span>
          <select
            name="surface_condition"
            defaultValue="unknown"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
          >
            {ROAD_SURFACE_CONDITION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Passability</span>
          <select
            name="passability"
            defaultValue="unknown"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
          >
            {ROAD_PASSABILITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Mud severity</span>
          <select
            name="mud_severity"
            defaultValue="unknown"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
          >
            {ROAD_SEVERITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Snow severity</span>
          <select
            name="snow_severity"
            defaultValue="unknown"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
          >
            {ROAD_SEVERITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Rut severity</span>
          <select
            name="rut_severity"
            defaultValue="unknown"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
          >
            {ROAD_SEVERITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Recommended vehicle</span>
          <input
            name="recommended_vehicle"
            type="text"
            placeholder="4WD recommended after rain"
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
          <span className="mb-2 block text-sm font-medium text-slate-700">Linked field point</span>
          <select
            name="linked_point_id"
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
          <span className="mb-2 block text-sm font-medium text-slate-700">Linked photo / video</span>
          <select
            name="photo_id"
            defaultValue=""
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
          >
            <option value="">No linked photo</option>
            {photos.map((photo) => (
              <option key={photo.id} value={photo.id}>
                {photo.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          ["washout", "Washout"],
          ["fallen_tree", "Fallen tree"],
          ["standing_water", "Standing water"],
          ["erosion", "Erosion"]
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 text-sm text-slate-700">
            <input name={key} type="checkbox" value="true" className="h-4 w-4 rounded border-slate-300 text-pine focus:ring-pine" />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Observation notes</span>
        <textarea
          name="description"
          rows={4}
          required
          placeholder="Describe passability, drainage issues, obstructions, runoff, or any conditions that other reviewers should understand."
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
        />
      </label>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <strong>User observation only:</strong> This field report is coordination evidence and does not constitute an official
        closure, access authorization, engineering determination, or safety guarantee.
      </div>

      <button
        type="submit"
        className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
      >
        Save road report
      </button>
    </form>
  );
}
