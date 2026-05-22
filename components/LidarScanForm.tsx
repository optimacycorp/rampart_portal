type LidarScanFormProps = {
  action: (formData: FormData) => Promise<void>;
};

export function LidarScanForm({ action }: LidarScanFormProps) {
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
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Scan date</span>
          <input
            name="scan_date"
            type="date"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Equipment</span>
          <input
            name="equipment"
            type="text"
            defaultValue="3DMakerPro Eagle Max"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Coordinate system</span>
          <input
            name="coordinate_system"
            type="text"
            placeholder="NAD83(2011) Colorado Central ftUS + NAVD88 GEOID18"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Center easting</span>
          <input
            name="center_easting"
            type="number"
            step="0.001"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Center northing</span>
          <input
            name="center_northing"
            type="number"
            step="0.001"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Center elevation</span>
          <input
            name="center_elevation"
            type="number"
            step="0.001"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Point count</span>
          <input
            name="point_count"
            type="number"
            step="1"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Area acres</span>
          <input
            name="area_acres"
            type="number"
            step="0.001"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Min elevation</span>
          <input
            name="min_elevation"
            type="number"
            step="0.001"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Max elevation</span>
          <input
            name="max_elevation"
            type="number"
            step="0.001"
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
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Potree / Entwine tile path</span>
        <input
          name="tile_path"
          type="text"
          placeholder="Public Potree cloud.js URL or accessible tile root"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Preview image path</span>
        <input
          name="preview_image_path"
          type="text"
          placeholder="/lidar-scans/{projectId}/{scanId}/exports/preview.jpg or https://..."
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Notes</span>
        <textarea
          name="notes"
          rows={4}
          placeholder="Processing notes, classification status, footprint context, or linked controls."
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
        />
      </label>
      <button
        type="submit"
        className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
      >
        Register LiDAR scan
      </button>
    </form>
  );
}
