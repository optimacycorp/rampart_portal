import { PLAN_TYPE_LABELS, PLAN_TYPE_OPTIONS } from "@/lib/constants";
import { ProjectPlanType } from "@/lib/types";

type PlanUploadFormProps = {
  action: (formData: FormData) => Promise<void>;
  defaultPlanType?: ProjectPlanType;
  defaultTitle?: string;
};

export function PlanUploadForm({ action, defaultPlanType = "site_plan", defaultTitle = "" }: PlanUploadFormProps) {
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Plan region</span>
          <select
            name="plan_type"
            required
            defaultValue={defaultPlanType}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
          >
            {PLAN_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {PLAN_TYPE_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Plan title</span>
          <input
            name="title"
            required
            defaultValue={defaultTitle}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
            placeholder="SP1 Revision C"
            type="text"
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Plan notes</span>
        <textarea
          name="description"
          rows={3}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          placeholder="Scope, revision notes, or how this plan set should be used."
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Plan upload</span>
        <input
          name="file"
          required
          accept=".pdf,.png,.jpg,.jpeg"
          className="w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700"
          type="file"
        />
      </label>
      <button
        type="submit"
        className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
      >
        Upload plan
      </button>
    </form>
  );
}
