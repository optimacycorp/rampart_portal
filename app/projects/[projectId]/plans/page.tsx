import Link from "next/link";
import { uploadPlanVersion, uploadProjectPlan } from "@/app/projects/[projectId]/plans/actions";
import { PlanUploadForm } from "@/components/PlanUploadForm";
import { PlanVersionUploadForm } from "@/components/PlanVersionUploadForm";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentUserContext } from "@/lib/auth-server";
import { getProjectBySlug } from "@/lib/documents";
import { getPlanSections } from "@/lib/plans";

const feedbackText: Record<string, string> = {
  uploaded: "Plan uploaded and version history initialized.",
  "version-uploaded": "Plan revision uploaded and prior versions preserved.",
  "supabase-not-configured": "Supabase is not configured yet. Add the project URL and service role key on the server.",
  "project-not-found": "The requested project could not be found.",
  "invalid-required-fields": "Plan region and title are required.",
  "file-required": "Please choose a plan file to upload.",
  "storage-upload-failed": "The plan file could not be uploaded to the project-plans bucket.",
  "plan-save-failed": "The plan record could not be saved after upload.",
  "plan-version-save-failed": "The plan version history could not be updated.",
  "plan-not-found": "The requested plan record could not be found.",
  "plan-already-exists": "That plan region already exists. Upload a revision in the existing region card instead."
};

export default async function PlansPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ status?: string; error?: string; planType?: string }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const [project, sections] = await Promise.all([getProjectBySlug(projectId), getPlanSections(projectId)]);

  if (!project) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Plans" title="Project not found" description="The requested project slug does not exist in the current dataset." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Plans"
        title={`${project.name} plan library`}
        description="Manage the current site plan, land usability, final plat, and building plan sets with version history, preview, and download access."
      />
      <DisclaimerBanner />
      {query.status && feedbackText[query.status] ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{feedbackText[query.status]}</div>
      ) : null}
      {query.error && feedbackText[query.error] ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{feedbackText[query.error]}</div>
      ) : null}
      <div className="grid gap-6 2xl:grid-cols-2">
        {sections.map((section) => {
          const createAction = uploadProjectPlan.bind(null, projectId);
          const versionAction = section.plan ? uploadPlanVersion.bind(null, projectId, section.plan.id) : null;

          return (
            <section key={section.planType} className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{section.label}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-ink">{section.plan?.title ?? `No ${section.label} uploaded yet`}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{section.plan?.description ?? section.hint}</p>
                </div>
                {section.plan ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">
                    v{section.plan.current_version_number}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                    Ready for upload
                  </span>
                )}
              </div>

              {section.plan?.current_file_path ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm text-slate-600">
                        Current file: <span className="font-medium text-slate-800">{section.plan.current_file_name ?? "Plan file"}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/api/plans/${section.plan.id}/file?projectId=${projectId}`}
                          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                          target="_blank"
                        >
                          Open preview
                        </Link>
                        <Link
                          href={`/api/plans/${section.plan.id}/file?projectId=${projectId}&download=1`}
                          className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white"
                        >
                          Download
                        </Link>
                      </div>
                    </div>
                    <div className="h-[28rem] overflow-auto rounded-[1.25rem] border border-slate-200 bg-white">
                      <iframe
                        title={`${section.label} preview`}
                        src={`/api/plans/${section.plan.id}/file?projectId=${projectId}`}
                        className="h-[60rem] w-full"
                      />
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
                    <h3 className="text-lg font-semibold text-ink">Version history</h3>
                    <div className="mt-3 space-y-3">
                      {section.versions.map((version) => (
                        <div
                          key={version.id}
                          className={`rounded-2xl border px-4 py-4 ${
                            version.is_current ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-800">Version {version.version_number}</p>
                              <p className="mt-1 text-sm text-slate-600">{version.notes ?? "No version notes provided."}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                                Uploaded {new Date(version.created_at).toLocaleDateString()} by {version.uploaded_by_email ?? "Unknown"}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                                  version.is_current ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                {version.is_current ? "Current" : "Archived"}
                              </span>
                              <Link
                                href={`/api/plans/${section.plan?.id}/file?projectId=${projectId}&versionId=${version.id}&download=1`}
                                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                              >
                                Download
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {versionAction ? (
                    <div className="rounded-[1.5rem] border border-white/70 bg-white p-5 shadow-sm">
                      <h3 className="text-lg font-semibold text-ink">Upload a new revision</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Add a new version to this plan region. Older revisions remain available for download.
                      </p>
                      <div className="mt-4">
                        <PlanVersionUploadForm action={versionAction} />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-5 rounded-[1.5rem] border border-white/70 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-ink">Upload first plan set</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Use this region for {section.label.toLowerCase()} uploads and future revisions.
                  </p>
                  <div className="mt-4">
                    <PlanUploadForm
                      action={createAction}
                      defaultPlanType={section.planType}
                      defaultTitle={section.label}
                    />
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
      <DisclaimerBanner />
    </div>
  );
}
