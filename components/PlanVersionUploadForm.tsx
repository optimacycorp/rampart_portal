type PlanVersionUploadFormProps = {
  action: (formData: FormData) => Promise<void>;
};

export function PlanVersionUploadForm({ action }: PlanVersionUploadFormProps) {
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Version notes</span>
        <textarea
          name="version_notes"
          rows={3}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          placeholder="What changed in this plan revision?"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Replacement file</span>
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
        className="rounded-full bg-clay px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
      >
        Upload plan revision
      </button>
    </form>
  );
}
