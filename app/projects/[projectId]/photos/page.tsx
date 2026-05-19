import Link from "next/link";
import { deleteEvidencePhoto, uploadEvidencePhoto } from "@/app/projects/[projectId]/photos/actions";
import { DeleteButton } from "@/components/DeleteButton";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { PageHeader } from "@/components/PageHeader";
import { PhotoEvidenceUploadForm } from "@/components/PhotoEvidenceUploadForm";
import { getCurrentUserContext } from "@/lib/auth-server";
import { PHOTO_CATEGORY_OPTIONS } from "@/lib/constants";
import { getProjectBySlug } from "@/lib/documents";
import { getEvidencePhotosByProjectSlug } from "@/lib/evidence-photos";
import { getFieldPointsByProjectSlug } from "@/lib/field-points";

const feedbackText: Record<string, string> = {
  uploaded: "Media evidence uploaded.",
  deleted: "Media evidence deleted.",
  "supabase-not-configured": "Supabase is not configured yet. Add the project URL and service role key on the server.",
  "project-not-found": "The requested project could not be found.",
  "invalid-required-fields": "Media title and category are required.",
  "file-required": "A photo or video file is required.",
  "storage-upload-failed": "The media file could not be uploaded to storage.",
  "photo-save-failed": "The media record could not be saved.",
  "media-save-failed": "The media record could not be saved.",
  forbidden: "Only the uploader or an audit user can delete uploaded media evidence.",
  "delete-failed": "The media record could not be deleted.",
  "photo-not-found": "The requested media record could not be found."
};

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : "No date";
}

export default async function PhotosPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ status?: string; error?: string; category?: string }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const categoryFilter = query.category?.trim() ?? "";

  const [{ user, role }, project, fieldPoints, photos] = await Promise.all([
    getCurrentUserContext(),
    getProjectBySlug(projectId),
    getFieldPointsByProjectSlug(projectId),
    getEvidencePhotosByProjectSlug(projectId)
  ]);

  if (!project) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Media Evidence"
          title="Project not found"
          description="The requested project slug does not exist in the current dataset."
        />
      </div>
    );
  }

  const action = uploadEvidencePhoto.bind(null, projectId);
  const pointNameById = new Map(fieldPoints.map((point) => [point.id, point.point_name]));
  const filteredPhotos = categoryFilter ? photos.filter((photo) => photo.category === categoryFilter) : photos;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Media Evidence"
        title={`${project.name} photo and video evidence library`}
        description="Store field photography and videos with categories, linked field points, coordinates, and uploader history."
      />
      <DisclaimerBanner />
      {query.status && feedbackText[query.status] ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {feedbackText[query.status]}
        </div>
      ) : null}
      {query.error && feedbackText[query.error] ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {feedbackText[query.error]}
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <h2 className="text-xl font-semibold text-ink">Upload media evidence</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Add categorized site photos and videos, tie them to field points, and keep the media record alongside project notes.
          </p>
          <div className="mt-5">
            <PhotoEvidenceUploadForm action={action} fieldPoints={fieldPoints} />
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ink">Media library</h2>
              <p className="mt-2 text-sm text-slate-600">Filter by category or browse the most recent photo and video uploads.</p>
            </div>
            <form className="flex flex-wrap gap-3" method="get">
              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span className="font-medium">Category</span>
                <select
                  name="category"
                  defaultValue={categoryFilter}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pine"
                >
                  <option value="">All categories</option>
                  {PHOTO_CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                >
                  Filter
                </button>
                {categoryFilter ? (
                  <Link
                    href={`/projects/${projectId}/photos`}
                    className="rounded-full bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700"
                  >
                    Clear
                  </Link>
                ) : null}
              </div>
            </form>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {filteredPhotos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600 md:col-span-2">
                No media evidence matches the current filter.
              </div>
            ) : null}
            {filteredPhotos.map((photo) => {
              const canDelete = role === "audit" || (Boolean(user) && photo.created_by_user_id === user?.id);
              const linkedPointName = photo.linked_point_id ? pointNameById.get(photo.linked_point_id) : null;
              const mediaKind = photo.media_kind === "video" ? "video" : "photo";
              const mediaUrl = `/api/photos/${photo.id}/download`;

              return (
                <article key={photo.id} className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50">
                  {photo.file_path ? (
                    mediaKind === "video" ? (
                      <div className="block bg-slate-100">
                        <video
                          src={mediaUrl}
                          controls
                          preload="metadata"
                          className="aspect-[4/3] w-full object-cover"
                        />
                      </div>
                    ) : (
                      <Link href={mediaUrl} className="block bg-slate-100">
                        <img src={mediaUrl} alt={photo.title} className="aspect-[4/3] w-full object-cover" />
                      </Link>
                    )
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-medium text-slate-500">
                      Preview unavailable
                    </div>
                  )}
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-slate-800">{photo.title}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatDate(photo.photo_date)} | {photo.category ?? "general"} | {mediaKind}
                        </p>
                      </div>
                      {canDelete ? (
                        <form action={deleteEvidencePhoto.bind(null, projectId, photo.id)}>
                          <DeleteButton label="Delete" />
                        </form>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm text-slate-600">
                      {photo.direction_facing ? <p>Facing: {photo.direction_facing}</p> : null}
                      {linkedPointName ? <p>Linked point: {linkedPointName}</p> : null}
                      {photo.created_by_email ? <p>Uploaded by: {photo.created_by_email}</p> : null}
                      {photo.latitude != null && photo.longitude != null ? (
                        <p>
                          Lat/Lon: {photo.latitude}, {photo.longitude}
                        </p>
                      ) : null}
                    </div>
                    {photo.notes ? <p className="text-sm leading-6 text-slate-700">{photo.notes}</p> : null}
                    {photo.file_path ? (
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={mediaUrl}
                          className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white"
                        >
                          {mediaKind === "video" ? "Open video" : "Open photo"}
                        </Link>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
