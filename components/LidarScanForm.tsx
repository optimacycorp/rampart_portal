type LidarScanFormProps = {
  action: (formData: FormData) => Promise<void>;
  initialValues?: {
    title?: string | null;
    status?: string | null;
    processing_stage?: string | null;
    tile_format?: string | null;
    scan_date?: string | null;
    equipment?: string | null;
    coordinate_system?: string | null;
    center_easting?: number | null;
    center_northing?: number | null;
    center_elevation?: number | null;
    center_latitude?: number | null;
    center_longitude?: number | null;
    point_count?: number | null;
    area_acres?: number | null;
    min_elevation?: number | null;
    max_elevation?: number | null;
    bbox_west?: number | null;
    bbox_south?: number | null;
    bbox_east?: number | null;
    bbox_north?: number | null;
    raw_file_path?: string | null;
    tile_path?: string | null;
    preview_image_path?: string | null;
    notes?: string | null;
  };
  submitLabel?: string;
};

export function LidarScanForm({ action, initialValues, submitLabel = "Register LiDAR scan" }: LidarScanFormProps) {
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Title</span>
          <input
            name="title"
            required
            type="text"
            placeholder="SP1 Revision C Point Cloud"
            defaultValue={initialValues?.title ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
          <select
            name="status"
            defaultValue={initialValues?.status ?? "registered"}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          >
            <option value="registered">Registered</option>
            <option value="processing">Processing</option>
            <option value="ready_for_review">Ready for review</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Processing stage</span>
          <select
            name="processing_stage"
            defaultValue={initialValues?.processing_stage ?? "raw_uploaded"}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          >
            <option value="raw_uploaded">Raw uploaded</option>
            <option value="cleaned">Cleaned</option>
            <option value="classified">Classified</option>
            <option value="tiled">Tiled for web</option>
            <option value="published">Published</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Tile format</span>
          <select
            name="tile_format"
            defaultValue={initialValues?.tile_format ?? "potree"}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          >
            <option value="potree">Potree</option>
            <option value="entwine">Entwine</option>
            <option value="none">None yet</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Scan date</span>
          <input
            name="scan_date"
            type="date"
            defaultValue={initialValues?.scan_date ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Equipment</span>
          <input
            name="equipment"
            type="text"
            defaultValue={initialValues?.equipment ?? "3DMakerPro Eagle Max"}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Coordinate system</span>
          <input
            name="coordinate_system"
            type="text"
            placeholder="NAD83(2011) Colorado Central ftUS + NAVD88 GEOID18"
            defaultValue={initialValues?.coordinate_system ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Center easting</span>
          <input
            name="center_easting"
            type="number"
            step="0.001"
            defaultValue={initialValues?.center_easting ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Center northing</span>
          <input
            name="center_northing"
            type="number"
            step="0.001"
            defaultValue={initialValues?.center_northing ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Center elevation</span>
          <input
            name="center_elevation"
            type="number"
            step="0.001"
            defaultValue={initialValues?.center_elevation ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Center latitude</span>
          <input
            name="center_latitude"
            type="number"
            step="0.000001"
            placeholder="38.921764"
            defaultValue={initialValues?.center_latitude ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Center longitude</span>
          <input
            name="center_longitude"
            type="number"
            step="0.000001"
            placeholder="-104.617738"
            defaultValue={initialValues?.center_longitude ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Point count</span>
          <input
            name="point_count"
            type="number"
            step="1"
            defaultValue={initialValues?.point_count ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Area acres</span>
          <input
            name="area_acres"
            type="number"
            step="0.001"
            defaultValue={initialValues?.area_acres ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Min elevation</span>
          <input
            name="min_elevation"
            type="number"
            step="0.001"
            defaultValue={initialValues?.min_elevation ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Max elevation</span>
          <input
            name="max_elevation"
            type="number"
            step="0.001"
            defaultValue={initialValues?.max_elevation ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">BBox west</span>
          <input
            name="bbox_west"
            type="number"
            step="0.000001"
            placeholder="-104.621000"
            defaultValue={initialValues?.bbox_west ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">BBox south</span>
          <input
            name="bbox_south"
            type="number"
            step="0.000001"
            placeholder="38.919500"
            defaultValue={initialValues?.bbox_south ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">BBox east</span>
          <input
            name="bbox_east"
            type="number"
            step="0.000001"
            placeholder="-104.614200"
            defaultValue={initialValues?.bbox_east ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">BBox north</span>
          <input
            name="bbox_north"
            type="number"
            step="0.000001"
            placeholder="38.924100"
            defaultValue={initialValues?.bbox_north ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Raw archive path</span>
        <input
          name="raw_file_path"
          type="text"
          placeholder="/lidar-scans/{projectId}/{scanId}/raw/scan.laz or https://..."
          defaultValue={initialValues?.raw_file_path ?? ""}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Potree / Entwine tile path</span>
        <input
          name="tile_path"
          type="text"
          placeholder="Public Potree cloud.js URL or accessible tile root"
          defaultValue={initialValues?.tile_path ?? ""}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Preview image path</span>
        <input
          name="preview_image_path"
          type="text"
          placeholder="/lidar-scans/{projectId}/{scanId}/exports/preview.jpg or https://..."
          defaultValue={initialValues?.preview_image_path ?? ""}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Notes</span>
        <textarea
          name="notes"
          rows={4}
          placeholder="Processing notes, classification status, footprint context, or linked controls."
          defaultValue={initialValues?.notes ?? ""}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
        />
      </label>
      <button
        type="submit"
        className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
      >
        {submitLabel}
      </button>
    </form>
  );
}
