import { getAccessLogsByProjectSlug } from "@/lib/access-log";
import { getCulvertsByProjectId } from "@/lib/culverts";
import { getProjectBySlug, getDocumentsByProjectSlug } from "@/lib/documents";
import { getEvidencePhotosByProjectSlug } from "@/lib/evidence-photos";
import { getFieldPointsByProjectSlug } from "@/lib/field-points";
import { FULL_DISCLAIMER } from "@/lib/constants";
import { getMeetingTranscriptsByProjectSlug } from "@/lib/meeting-transcripts";
import { getProjectTasksByProjectSlug } from "@/lib/project-tasks";
import { getReviewerCommentsByProjectSlug } from "@/lib/reviewer-comments";

function escapeCsvValue(value: unknown) {
  const stringValue = `${value ?? ""}`;

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-US");
}

export async function buildDocumentIndexCsv(projectSlug: string) {
  const [project, documents] = await Promise.all([getProjectBySlug(projectSlug), getDocumentsByProjectSlug(projectSlug)]);

  if (!project) {
    return null;
  }

  const header = [
    "Title",
    "Type",
    "Record Date",
    "Reception Number",
    "Book",
    "Page",
    "Source Agency",
    "Status",
    "Current Version",
    "Uploaded By",
    "Created At",
    "Notes"
  ];

  const rows = documents.map((document) => [
    document.title,
    document.document_type,
    formatDate(document.record_date),
    document.reception_number ?? "",
    document.book ?? "",
    document.page ?? "",
    document.source_agency ?? "",
    document.status,
    document.current_version_number,
    document.created_by_email ?? "",
    formatDate(document.created_at),
    document.notes ?? ""
  ]);

  const csv = [header, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");

  return {
    filename: `${project.slug}-document-index.csv`,
    contentType: "text/csv; charset=utf-8",
    content: csv
  };
}

export async function buildReviewerCommentsCsv(projectSlug: string) {
  const [project, comments] = await Promise.all([
    getProjectBySlug(projectSlug),
    getReviewerCommentsByProjectSlug(projectSlug)
  ]);

  if (!project) {
    return null;
  }

  const header = [
    "Comment ID",
    "Application Number",
    "Reviewer",
    "Department",
    "Priority",
    "Status",
    "Responsible Party",
    "Comment",
    "Response",
    "Linked Document",
    "Due Date"
  ];

  const rows = comments.map((comment) => [
    comment.comment_id,
    comment.application_number,
    comment.reviewer_name,
    comment.department,
    comment.priority,
    comment.status,
    comment.responsible_party,
    comment.comment_text,
    comment.response_text ?? "",
    comment.linked_document_title ?? "",
    formatDate(comment.due_date)
  ]);

  const csv = [header, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");

  return {
    filename: `${project.slug}-reviewer-comments.csv`,
    contentType: "text/csv; charset=utf-8",
    content: csv
  };
}

export async function buildFieldEvidenceSummaryMarkdown(projectSlug: string) {
  const [project, fieldPoints, accessLogs, photos, comments, tasks, transcripts] = await Promise.all([
    getProjectBySlug(projectSlug),
    getFieldPointsByProjectSlug(projectSlug),
    getAccessLogsByProjectSlug(projectSlug),
    getEvidencePhotosByProjectSlug(projectSlug),
    getReviewerCommentsByProjectSlug(projectSlug),
    getProjectTasksByProjectSlug(projectSlug),
    getMeetingTranscriptsByProjectSlug(projectSlug)
  ]);

  if (!project) {
    return null;
  }

  const culverts = await getCulvertsByProjectId(project.id);
  const openComments = comments.filter((comment) => comment.status !== "resolved");
  const openTasks = tasks.filter((task) => task.status !== "resolved" && task.status !== "closed");

  const lines = [
    `# ${project.name} Field Evidence Summary`,
    "",
    `Generated: ${new Date().toLocaleString("en-US")}`,
    "",
    "## Disclaimer",
    FULL_DISCLAIMER,
    "",
    "## Snapshot",
    `- Documents: ${(
      await getDocumentsByProjectSlug(projectSlug)
    ).length}`,
    `- Open reviewer comments: ${openComments.length}`,
    `- Field points: ${fieldPoints.length}`,
    `- Culverts: ${culverts.length}`,
    `- Access logs: ${accessLogs.length}`,
    `- Photo evidence records: ${photos.length}`,
    `- Meeting transcripts: ${transcripts.length}`,
    `- Open tasks: ${openTasks.length}`,
    "",
    "## Open Reviewer Comments",
    ...(openComments.length === 0
      ? ["- No open reviewer comments."]
      : openComments.slice(0, 12).map(
          (comment) =>
            `- [${comment.comment_id || "Comment"}] ${comment.department} | ${comment.priority} | waiting on ${comment.responsible_party || "unassigned"}`
        )),
    "",
    "## Field Evidence",
    ...(fieldPoints.length === 0
      ? ["- No field points uploaded."]
      : fieldPoints.slice(0, 12).map(
          (point) =>
            `- ${point.point_name} (${point.point_type}) | confidence: ${point.confidence} | collected: ${formatDate(point.collected_at)}`
        )),
    "",
    "## Culverts",
    ...(culverts.length === 0
      ? ["- No culvert records logged."]
      : culverts.slice(0, 12).map(
          (culvert) =>
            `- ${culvert.culvert_id} | material: ${culvert.material ?? "unknown"} | diameter: ${culvert.diameter_inches ?? "n/a"} in | slope: ${culvert.slope_percent ?? "n/a"}%`
        )),
    "",
    "## Access Logs",
    ...(accessLogs.length === 0
      ? ["- No access logs recorded."]
      : accessLogs.slice(0, 12).map(
          (entry) =>
            `- ${formatDate(entry.log_date)} | ${entry.access_feature} | ${entry.status ?? "general"} | ${entry.description ?? "No description"}`
        )),
    "",
    "## Photo Evidence",
    ...(photos.length === 0
      ? ["- No photo evidence uploaded."]
      : photos.slice(0, 12).map(
          (photo) =>
            `- ${photo.title} | ${photo.category ?? "general"} | date: ${formatDate(photo.photo_date)} | uploaded by ${photo.created_by_email ?? "unknown"}`
        )),
    "",
    "## Meeting Transcripts",
    ...(transcripts.length === 0
      ? ["- No meeting transcripts uploaded."]
      : transcripts.slice(0, 10).map(
          (transcript) =>
            `- ${transcript.title} | ${formatDate(transcript.meeting_date)} | source: ${transcript.source ?? "unspecified"}`
        )),
    "",
    "## Active Tasks",
    ...(openTasks.length === 0
      ? ["- No open tasks recorded."]
      : openTasks.slice(0, 12).map(
          (task) =>
            `- ${task.title} | status: ${task.status} | waiting on: ${task.waiting_on ?? "n/a"} | responsible: ${task.responsible_party ?? "unassigned"}`
        )),
    ""
  ];

  return {
    filename: `${project.slug}-field-evidence-summary.md`,
    contentType: "text/markdown; charset=utf-8",
    content: lines.join("\n")
  };
}
