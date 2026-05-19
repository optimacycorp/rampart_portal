import { PHOTO_CATEGORY_OPTIONS } from "@/lib/constants";
import { FieldPoint } from "@/lib/types";

type PhotoEvidenceUploadFormProps = {
  action: (formData: FormData) => Promise<void>;
  fieldPoints: FieldPoint[];
};

export function PhotoEvidenceUploadForm({ action, fieldPoints }: PhotoEvidenceUploadFormProps) {
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Media title</span>
          <input
            name="title"
            required
            type="text"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
            placeholder="Gate approach overview"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Category</span>
          <select
            name="category"
            required
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
            defaultValue="general"
          >
            {PHOTO_CATEGORY_OPTIONS.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Photo date</span>
          <input
            name="photo_date"
            type="date"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Direction facing</span>
          <input
            name="direction_facing"
            type="text"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
            placeholder="N, SE, uphill, toward gate"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-2 block text-sm font-medium text-slate-700">Linked field point</span>
          <select
            name="linked_point_id"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
            defaultValue=""
          >
            <option value="">No linked point</option>
            {fieldPoints.map((point) => (
              <option key={point.id} value={point.id}>
                {point.point_name} ({point.point_type})
              </option>
            ))}
          </select>
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
          <span className="mb-2 block text-sm font-medium text-slate-700">Easting</span>
          <input
            name="easting"
            type="number"
            step="any"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Northing</span>
          <input
            name="northing"
            type="number"
            step="any"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Photo or video upload</span>
        <p className="mb-2 text-xs text-slate-500">
          Images and field videos are both supported here and will be stored in the same evidence library.
          Photo uploads will try to read embedded EXIF date and GPS automatically if those fields are left blank.
        </p>
        <input
          name="file"
          required
          type="file"
          accept="image/*,video/*,.jpg,.jpeg,.png,.webp,.heic,.mp4,.mov,.m4v,.webm"
          className="w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Notes</span>
        <textarea
          name="notes"
          rows={4}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          placeholder="Capture what the image shows, why it matters, and any field context."
        />
      </label>
      <button
        type="submit"
        className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
      >
        Upload media evidence
      </button>
    </form>
  );
}
