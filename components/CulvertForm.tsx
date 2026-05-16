import { CULVERT_MATERIAL_OPTIONS, CULVERT_OWNERSHIP_OPTIONS } from "@/lib/constants";
import { FieldPoint } from "@/lib/types";

type CulvertFormProps = {
  action: (formData: FormData) => Promise<void>;
  fieldPoints: FieldPoint[];
};

export function CulvertForm({ action, fieldPoints }: CulvertFormProps) {
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Culvert ID</span>
          <input
            name="culvert_id"
            required
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
            placeholder="CULV-01"
            type="text"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Diameter (inches)</span>
          <input
            name="diameter_inches"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
            placeholder="18"
            step="0.01"
            type="number"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Inlet point</span>
          <select
            name="inlet_point_id"
            required
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
            defaultValue=""
          >
            <option value="" disabled>
              Select inlet point
            </option>
            {fieldPoints.map((point) => (
              <option key={point.id} value={point.id}>
                {point.point_name} ({point.point_type})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Outlet point</span>
          <select
            name="outlet_point_id"
            required
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
            defaultValue=""
          >
            <option value="" disabled>
              Select outlet point
            </option>
            {fieldPoints.map((point) => (
              <option key={point.id} value={point.id}>
                {point.point_name} ({point.point_type})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Material</span>
          <select
            name="material"
            defaultValue="unknown"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
          >
            {CULVERT_MATERIAL_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Ownership</span>
          <select
            name="ownership"
            defaultValue="unknown"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
          >
            {CULVERT_OWNERSHIP_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Length (feet)</span>
          <input
            name="length_feet"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
            placeholder="32"
            step="0.01"
            type="number"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Manual slope override (%)</span>
          <input
            name="manual_slope_percent"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
            placeholder="Leave blank to auto-calculate"
            step="0.001"
            type="number"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Condition</span>
          <input
            name="condition"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
            placeholder="Good / crushed end / sedimented"
            type="text"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Flow direction</span>
          <input
            name="flow_direction"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
            placeholder="northwest"
            type="text"
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Notes</span>
        <textarea
          name="notes"
          rows={4}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          placeholder="Observed condition, ownership questions, field notes, or linked photo references."
        />
      </label>
      <button
        type="submit"
        className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
      >
        Save culvert
      </button>
    </form>
  );
}
