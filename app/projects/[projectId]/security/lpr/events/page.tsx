import { PageHeader } from "@/components/PageHeader";
import { getCurrentUserContext } from "@/lib/auth-server";
import { createKnownVehicle, preserveLprEvent, releasePreservedLprEvent, reviewLprEvent } from "../actions";
import { getProjectBySlug } from "@/lib/documents";
import { getLprEventsByProjectSlug, getLprKnownVehiclesByProjectSlug } from "@/lib/lpr";

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not recorded";
}

function maskPlate(value?: string | null) {
  if (!value) {
    return "Unread / hidden";
  }

  if (value.length <= 3) {
    return `${value[0] ?? ""}**`;
  }

  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function badgeClasses(value: string) {
  switch (value) {
    case "authorized":
      return "bg-emerald-100 text-emerald-900";
    case "vendor":
      return "bg-sky-100 text-sky-900";
    case "watchlist":
    case "flagged":
      return "bg-amber-100 text-amber-900";
    case "blocked":
      return "bg-rose-100 text-rose-900";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function LprEventsPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<{ q?: string; review?: string; preserved?: string }>;
}) {
  const { projectId } = await params;
  const filters = (await searchParams) ?? {};
  const search = `${filters.q ?? ""}`.trim();
  const review = `${filters.review ?? "all"}`.trim() || "all";
  const preservedOnly = `${filters.preserved ?? ""}` === "1";

  const [{ role }, project, events, knownVehicles] = await Promise.all([
    getCurrentUserContext(),
    getProjectBySlug(projectId),
    getLprEventsByProjectSlug(projectId, { limit: 50, search, reviewStatus: review, preservedOnly }),
    getLprKnownVehiclesByProjectSlug(projectId)
  ]);

  if (!project) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Security / LPR" title="Project not found" description="The requested project slug does not exist in the current dataset." />
      </div>
    );
  }

  const canManage = role === "owner" || role === "audit";
  const canViewRawPlates = canManage;
  const createKnownVehicleAction = createKnownVehicle.bind(null, projectId);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Security / LPR"
        title={`${project.name} recent LPR events`}
        description="Private capture stream for portal-managed vehicle activity with structured review workflow, known-vehicle matching, and role-aware plate visibility."
      />
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <strong>Retention note:</strong> Use identifiable plate events conservatively. Raw plates are masked here unless you are an owner or audit user, and long-term retention should remain narrow and intentional.
      </div>

      <form className="grid gap-4 rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-card md:grid-cols-[1.4fr_0.9fr_0.8fr_0.6fr_0.6fr]">
        <label className="block text-sm text-slate-700">
          <span className="mb-2 block font-medium">Search</span>
          <input name="q" defaultValue={search} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3" placeholder="Plate, camera, label, make, case reference" />
        </label>
        <label className="block text-sm text-slate-700">
          <span className="mb-2 block font-medium">Review status</span>
          <select name="review" defaultValue={review} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="authorized">Authorized</option>
            <option value="vendor">Vendor</option>
            <option value="watchlist">Watchlist</option>
            <option value="flagged">Flagged</option>
            <option value="false_positive">False positive</option>
          </select>
        </label>
        <label className="block text-sm text-slate-700">
          <span className="mb-2 block font-medium">Preserved only</span>
          <select name="preserved" defaultValue={preservedOnly ? "1" : "0"} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3">
            <option value="0">All events</option>
            <option value="1">Preserved only</option>
          </select>
        </label>
        <div className="flex items-end">
          <button type="submit" className="w-full rounded-full bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90">
            Apply
          </button>
        </div>
        <div className="flex items-end">
          <a href={`/projects/${projectId}/security/lpr/events`} className="w-full rounded-full bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-200">
            Clear
          </a>
        </div>
      </form>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-ink">Known Vehicle Registry</h2>
              <p className="mt-2 text-sm text-slate-600">Use the registry to distinguish expected owner traffic from vendors, watchlist vehicles, or blocked entries.</p>
            </div>
            <span className="text-sm text-slate-500">{knownVehicles.length} records</span>
          </div>
          <div className="mt-5 space-y-3">
            {knownVehicles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                No known vehicles have been registered yet.
              </div>
            ) : (
              knownVehicles.slice(0, 6).map((vehicle) => (
                <div key={vehicle.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-800">{vehicle.label}</p>
                    <p className="text-sm text-slate-600">
                      {canViewRawPlates ? vehicle.plate_text : maskPlate(vehicle.plate_text)}
                      {vehicle.owner_name ? ` - ${vehicle.owner_name}` : ""}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses(vehicle.access_level)}`}>{vehicle.access_level}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-card">
          <h2 className="text-xl font-semibold text-ink">Add Known Vehicle</h2>
          <p className="mt-2 text-sm text-slate-600">Owner and audit users can register recurring site traffic and classify it by access level.</p>
          {canManage ? (
            <form action={createKnownVehicleAction} className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">Plate text</span>
                <input name="plate_text" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3" placeholder="ABC1234" required />
              </label>
              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">Label</span>
                <input name="label" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3" placeholder="Thomas primary truck" required />
              </label>
              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">Owner / org</span>
                <input name="owner_name" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3" placeholder="Thomas" />
              </label>
              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">Vehicle kind</span>
                <input name="vehicle_kind" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3" placeholder="pickup" />
              </label>
              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">Access level</span>
                <select name="access_level" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3">
                  <option value="authorized">Authorized</option>
                  <option value="vendor">Vendor</option>
                  <option value="watchlist">Watchlist</option>
                  <option value="blocked">Blocked</option>
                </select>
              </label>
              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">Active</span>
                <select name="active" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
              <label className="block text-sm text-slate-700 md:col-span-2">
                <span className="mb-2 block font-medium">Notes</span>
                <textarea name="notes" rows={3} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3" placeholder="Optional context for this vehicle." />
              </label>
              <div className="md:col-span-2">
                <button type="submit" className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90">
                  Save known vehicle
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Only owner or audit users can add or classify known vehicles.
            </div>
          )}
        </div>
      </section>

      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-card">
        <div className="grid grid-cols-[1.1fr_0.8fr_0.8fr_0.8fr_0.9fr_1.1fr_1.15fr] gap-4 border-b border-slate-200 px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          <span>Observed</span>
          <span>Camera</span>
          <span>Plate</span>
          <span>Review</span>
          <span>Direction</span>
          <span>Vehicle</span>
          <span>Workflow</span>
        </div>
        <div className="divide-y divide-slate-100">
          {events.length === 0 ? (
            <div className="px-5 py-8 text-sm text-slate-600">No LPR events match the current filters.</div>
          ) : (
            events.map((event) => {
              const reviewAction = reviewLprEvent.bind(null, projectId, event.id);
              const preserveAction = preserveLprEvent.bind(null, projectId, event.id);
              const releaseAction = releasePreservedLprEvent.bind(null, projectId, event.id);
              const displayPlate = canViewRawPlates ? event.plate_text ?? "Unread / hidden" : maskPlate(event.plate_text);
              const reviewStatus = event.review?.review_status ?? "pending";

              return (
                <div key={event.id} className="grid grid-cols-[1.1fr_0.8fr_0.8fr_0.8fr_0.9fr_1.1fr_1.15fr] gap-4 px-5 py-4 text-sm text-slate-700">
                  <span>{formatDateTime(event.observed_at)}</span>
                  <span>{event.camera_name ?? event.camera_id}</span>
                  <span>
                    <span className="block font-medium text-slate-800">{displayPlate}</span>
                    <span className="text-xs text-slate-500">{event.plate_confidence != null ? `${Math.round(event.plate_confidence * 100)}% confidence` : "Unknown confidence"}</span>
                  </span>
                  <span>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(event.known_vehicle?.access_level ?? reviewStatus)}`}>
                      {event.known_vehicle?.access_level ?? reviewStatus}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">{event.known_vehicle?.label ?? "No registry match"}</span>
                    {event.preserved && !event.preserved.released_at ? (
                      <span className="mt-1 block text-xs font-medium text-amber-700">
                        Preserved{event.preserved.case_reference ? ` - ${event.preserved.case_reference}` : ""}
                      </span>
                    ) : null}
                  </span>
                  <span>{event.direction ?? "Unknown"}</span>
                  <span>{[event.vehicle_make, event.vehicle_model, event.vehicle_color, event.vehicle_type].filter(Boolean).join(" ") || "Unknown vehicle"}</span>
                  <span>
                    {canManage ? (
                      <div className="space-y-3">
                        <form action={reviewAction} className="space-y-2">
                          <select name="review_status" defaultValue={reviewStatus} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs">
                            <option value="pending">Pending</option>
                            <option value="authorized">Authorized</option>
                            <option value="vendor">Vendor</option>
                            <option value="watchlist">Watchlist</option>
                            <option value="flagged">Flagged</option>
                            <option value="false_positive">False positive</option>
                          </select>
                          <select name="matched_known_vehicle_id" defaultValue={event.review?.matched_known_vehicle_id ?? event.known_vehicle?.id ?? ""} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs">
                            <option value="">No linked vehicle</option>
                            {knownVehicles.map((vehicle) => (
                              <option key={vehicle.id} value={vehicle.id}>
                                {vehicle.label}
                              </option>
                            ))}
                          </select>
                          <textarea
                            name="notes"
                            rows={2}
                            defaultValue={event.review?.notes ?? ""}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                            placeholder="Review notes"
                          />
                          <button type="submit" className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90">
                            Save review
                          </button>
                        </form>
                        <form action={preserveAction} className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <input
                            name="case_reference"
                            defaultValue={event.preserved?.case_reference ?? ""}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                            placeholder="Case reference"
                          />
                          <input
                            name="preservation_reason"
                            defaultValue={event.preserved?.preservation_reason ?? ""}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                            placeholder="Preservation reason"
                            required
                          />
                          <input
                            type="date"
                            name="preserve_until"
                            defaultValue={event.preserved?.preserve_until ?? ""}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                          />
                          <textarea
                            name="preservation_notes"
                            rows={2}
                            defaultValue={event.preserved?.notes ?? ""}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                            placeholder="Retention / evidence notes"
                          />
                          <div className="flex flex-wrap gap-2">
                            <button type="submit" className="rounded-full bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90">
                              {event.preserved && !event.preserved.released_at ? "Update preserve" : "Preserve"}
                            </button>
                            {event.preserved && !event.preserved.released_at ? (
                              <button formAction={releaseAction} type="submit" className="rounded-full bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-300">
                                Release
                              </button>
                            ) : null}
                          </div>
                        </form>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">
                        {event.preserved && !event.preserved.released_at
                          ? `Preserved${event.preserved.case_reference ? ` (${event.preserved.case_reference})` : ""}.`
                          : event.review?.notes
                            ? `${event.review.review_status}: ${event.review.notes}`
                            : "Review controls limited to owner or audit users."}
                      </div>
                    )}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
