import { getProjectBySlug } from "@/lib/documents";
import { getSupabaseAdminClient } from "@/lib/supabase";

type ParsedReviewerComment = {
  application_number: string;
  comment_id: string;
  reviewer_name: string;
  department: string;
  status: string;
  comment_text: string;
};

const STATUS_PATTERN = /^(Open|Resolved|Closed|Deferred|In Progress|In Review)\b\s*(.*)$/i;
const COMMENT_START_PATTERN = /^(\d+)\s+\d+\s+(Note|Callout|Link)\s+(.+?)\s:\s(.+)$/i;
const SINGLE_LINE_COMMENT_PATTERN = /^(\d+)\s+(.+?)\s:\s(.+?)\s(Open|Resolved|Closed|Deferred|In Progress|In Review)\b\s*(.*)$/i;
const APPLICATION_PATTERN = /Application No\.\s*([A-Z0-9-]+)/i;

function normalizeStatus(rawStatus: string) {
  const normalized = rawStatus.trim().toLowerCase();

  if (normalized === "resolved" || normalized === "closed") {
    return "resolved";
  }

  if (normalized === "deferred") {
    return "deferred";
  }

  if (normalized === "in progress" || normalized === "in review") {
    return "in_progress";
  }

  return "open";
}

function normalizeDepartment(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeCommentText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isSkippableLine(line: string) {
  return (
    !line ||
    /^Document Name\b/i.test(line) ||
    /^Document ID\b/i.test(line) ||
    /^Author Name\b/i.test(line) ||
    /^Author Email\b/i.test(line) ||
    /^Author Phone No\.:/i.test(line) ||
    /^Comment$/i.test(line) ||
    /^ID$/i.test(line) ||
    /^Page Reference$/i.test(line) ||
    /^Annotation$/i.test(line) ||
    /^Type$/i.test(line) ||
    /^Status$/i.test(line) ||
    /^Review Comments$/i.test(line) ||
    /^Applicant Response Comments$/i.test(line) ||
    /^Author : Department Status Review Comments Applicant Response Comments$/i.test(line) ||
    /^Comment Correction Required \/ Response Report$/i.test(line) ||
    /^Comment Author Contact Information:$/i.test(line) ||
    /^Submission Documents:$/i.test(line) ||
    /^General Comments$/i.test(line) ||
    /^Corrections in the following table need to be applied before a permit can be issued$/i.test(line) ||
    /^Application No\./i.test(line) ||
    /^Avolve Software$/i.test(line) ||
    /^21001 N Tatum Blvd$/i.test(line) ||
    /^STE 1630-503$/i.test(line) ||
    /^Phoenix, AZ 85050, USA$/i.test(line) ||
    /^-- \d+ of \d+ --$/i.test(line)
  );
}

function isNonCommentDrawingLine(line: string) {
  return (
    /^Notice:$/i.test(line) ||
    /^LEGEND:$/i.test(line) ||
    /^PROJECT$/i.test(line) ||
    /^VICINITY MAP/i.test(line) ||
    /^R E V I S I O N S$/i.test(line) ||
    /^MARR LAND SURVEYING$/i.test(line) ||
    /^FILE NO\./i.test(line) ||
    /^PROJECT\s*NO\./i.test(line) ||
    /^Sheet:\s*\d+\s+of/i.test(line) ||
    /^0 \d+ \d+$/i.test(line) ||
    /^[NS]\s*\d{1,3}°/i.test(line) ||
    /^POINT OF (COMMENCEMENT|BEGINNING)$/i.test(line) ||
    /^LOT \d+\b/i.test(line) ||
    /^RAMPART RANGE ROAD$/i.test(line) ||
    /^NORTH-SOUTH CENTERLINE SECTION/i.test(line)
  );
}

function dedupeParsedComments(comments: ParsedReviewerComment[]) {
  const seen = new Set<string>();

  return comments.filter((comment) => {
    const key = [
      comment.application_number,
      comment.comment_id,
      comment.reviewer_name.toLowerCase(),
      comment.department.toLowerCase(),
      comment.comment_text.toLowerCase()
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function looksLikeMergedCommentReport(extractedText: string | null | undefined) {
  const text = `${extractedText ?? ""}`;
  return /Comment Correction Required \/ Response Report/i.test(text) && /Application No\./i.test(text);
}

export function parseMergedReviewerComments(extractedText: string | null | undefined): ParsedReviewerComment[] {
  const text = `${extractedText ?? ""}`;

  if (!looksLikeMergedCommentReport(text)) {
    return [];
  }

  const applicationNumber = text.match(APPLICATION_PATTERN)?.[1]?.trim() ?? "";

  if (!applicationNumber) {
    return [];
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed: ParsedReviewerComment[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (isSkippableLine(line)) {
      index += 1;
      continue;
    }

    const singleLineMatch = line.match(SINGLE_LINE_COMMENT_PATTERN);

    if (singleLineMatch) {
      const [, commentId, reviewerName, department, rawStatus, initialCommentText] = singleLineMatch;
      const textParts = initialCommentText ? [initialCommentText] : [];
      index += 1;

      while (index < lines.length) {
        const candidate = lines[index];

        if (isSkippableLine(candidate)) {
          index += 1;
          continue;
        }

        if (candidate.match(COMMENT_START_PATTERN) || candidate.match(SINGLE_LINE_COMMENT_PATTERN)) {
          break;
        }

        if (isNonCommentDrawingLine(candidate)) {
          break;
        }

        textParts.push(candidate);
        index += 1;
      }

      const commentText = normalizeCommentText(textParts.join(" "));

      if (commentText) {
        parsed.push({
          application_number: applicationNumber,
          comment_id: commentId,
          reviewer_name: normalizeCommentText(reviewerName),
          department: normalizeDepartment(department),
          status: normalizeStatus(rawStatus),
          comment_text: commentText
        });
      }

      continue;
    }

    const commentStartMatch = line.match(COMMENT_START_PATTERN);

    if (!commentStartMatch) {
      index += 1;
      continue;
    }

    const [, commentId, , reviewerName, firstDepartmentLine] = commentStartMatch;
    const departmentParts = [firstDepartmentLine];
    let status = "open";
    const textParts: string[] = [];
    index += 1;

    while (index < lines.length) {
      const candidate = lines[index];

      if (isSkippableLine(candidate)) {
        index += 1;
        continue;
      }

      const statusMatch = candidate.match(STATUS_PATTERN);

      if (statusMatch) {
        status = normalizeStatus(statusMatch[1]);
        if (statusMatch[2]) {
          textParts.push(statusMatch[2]);
        }
        index += 1;
        break;
      }

      departmentParts.push(candidate);
      index += 1;
    }

    while (index < lines.length) {
      const candidate = lines[index];

      if (isSkippableLine(candidate)) {
        index += 1;
        continue;
      }

      if (candidate.match(COMMENT_START_PATTERN) || candidate.match(SINGLE_LINE_COMMENT_PATTERN)) {
        break;
      }

      if (isNonCommentDrawingLine(candidate)) {
        break;
      }

      textParts.push(candidate);
      index += 1;
    }

    const commentText = normalizeCommentText(textParts.join(" "));

    if (commentText) {
      parsed.push({
        application_number: applicationNumber,
        comment_id: commentId,
        reviewer_name: normalizeCommentText(reviewerName),
        department: normalizeDepartment(departmentParts.join(" ")),
        status,
        comment_text: commentText
      });
    }
  }

  return dedupeParsedComments(parsed);
}

export async function syncImportedReviewerCommentsFromDocument(options: {
  projectSlug: string;
  documentId: string;
  createdByUserId?: string | null;
  createdByEmail?: string | null;
  extractedText: string | null;
}) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return { importedCount: 0, skipped: true as const };
  }

  const project = await getProjectBySlug(options.projectSlug);

  if (!project) {
    return { importedCount: 0, skipped: true as const };
  }

  const comments = parseMergedReviewerComments(options.extractedText);

  const { error: deleteError } = await supabase
    .from("reviewer_comments")
    .delete()
    .eq("imported_from_document_id", options.documentId);

  if (deleteError) {
    throw new Error("reviewer-comment-import-delete-failed");
  }

  if (comments.length === 0) {
    return { importedCount: 0, skipped: false as const };
  }

  const rows = comments.map((comment) => ({
    project_id: project.id,
    application_number: comment.application_number,
    comment_id: comment.comment_id,
    reviewer_name: comment.reviewer_name,
    department: comment.department,
    status: comment.status,
    priority: "medium",
    comment_text: comment.comment_text,
    response_text: null,
    responsible_party: "",
    linked_document_id: options.documentId,
    imported_from_document_id: options.documentId,
    created_by_user_id: options.createdByUserId ?? null,
    created_by_email: options.createdByEmail ?? null
  }));

  const { error: insertError } = await supabase.from("reviewer_comments").insert(rows);

  if (insertError) {
    throw new Error("reviewer-comment-import-insert-failed");
  }

  return { importedCount: rows.length, skipped: false as const };
}
