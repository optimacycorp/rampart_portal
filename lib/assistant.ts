import { FULL_DISCLAIMER } from "@/lib/constants";
import { getAccessLogsByProjectSlug } from "@/lib/access-log";
import { getCulvertsByProjectId } from "@/lib/culverts";
import { searchDocumentChunksByProjectSlug } from "@/lib/document-chunks";
import { getDocumentsByProjectSlug, getProjectBySlug } from "@/lib/documents";
import { getFieldPointsByProjectSlug } from "@/lib/field-points";
import { getProjectTasksByProjectSlug } from "@/lib/project-tasks";
import { getReviewerCommentsByProjectSlug } from "@/lib/reviewer-comments";

type AssistantSource = {
  href: string;
  label: string;
};

export type AssistantResponsePayload = {
  answer: string;
  type: "status" | "evidence" | "mixed";
  disclaimer: string;
  sources: AssistantSource[];
  missing?: string[];
};

function uniqueSources(sources: AssistantSource[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = `${source.href}|${source.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sourceForDocument(projectSlug: string, documentId: string, title: string): AssistantSource {
  return {
    href: `/projects/${projectSlug}/documents/${documentId}`,
    label: `Document: ${title}`
  };
}

function sourceForComment(projectSlug: string, commentId: string, label: string): AssistantSource {
  return {
    href: `/projects/${projectSlug}/comments#${commentId}`,
    label: `Comment: ${label}`
  };
}

function sourceForTask(projectSlug: string, taskId: string, title: string): AssistantSource {
  return {
    href: `/projects/${projectSlug}`,
    label: `Task: ${title} (${taskId})`
  };
}

function sourceForAccessLog(projectSlug: string, entryId: string, feature: string): AssistantSource {
  return {
    href: `/projects/${projectSlug}/access-log#${entryId}`,
    label: `Access log: ${feature}`
  };
}

function sourceForFieldPoint(projectSlug: string, pointId: string, pointName: string): AssistantSource {
  return {
    href: `/projects/${projectSlug}/field-points#${pointId}`,
    label: `Field point: ${pointName}`
  };
}

function sourceForCulvert(projectSlug: string, culvertId: string): AssistantSource {
  return {
    href: `/projects/${projectSlug}/culverts`,
    label: `Culvert: ${culvertId}`
  };
}

function classifyQuestion(question: string): "status" | "evidence" | "mixed" {
  const normalized = question.toLowerCase();

  if (
    normalized.includes("status") ||
    normalized.includes("waiting on") ||
    normalized.includes("blocking") ||
    normalized.includes("open comments")
  ) {
    if (normalized.includes("support") || normalized.includes("documents") || normalized.includes("access")) {
      return "mixed";
    }

    return "status";
  }

  if (
    normalized.includes("document") ||
    normalized.includes("support legal access") ||
    normalized.includes("evidence") ||
    normalized.includes("usfs access")
  ) {
    return "evidence";
  }

  return "mixed";
}

async function answerWaitingResponses(projectSlug: string): Promise<AssistantResponsePayload> {
  const [comments, tasks] = await Promise.all([
    getReviewerCommentsByProjectSlug(projectSlug),
    getProjectTasksByProjectSlug(projectSlug)
  ]);

  const waitingGroups = new Map<string, string[]>();
  const sources: AssistantSource[] = [];

  comments
    .filter((comment) => comment.status.startsWith("waiting_on"))
    .forEach((comment) => {
      const waitingOn =
        comment.status === "waiting_on_city"
          ? "City"
          : comment.status === "waiting_on_engineer"
            ? "Dave / MVE"
            : comment.status === "waiting_on_owner"
              ? "Owner"
              : comment.responsible_party || "Unassigned";

      const current = waitingGroups.get(waitingOn) ?? [];
      current.push(`${comment.comment_id || "Comment"} - ${comment.comment_text}`);
      waitingGroups.set(waitingOn, current);
      sources.push(sourceForComment(projectSlug, comment.id, comment.comment_id || comment.comment_text.slice(0, 40)));
    });

  tasks
    .filter((task) => task.waiting_on)
    .forEach((task) => {
      const current = waitingGroups.get(task.waiting_on ?? "Unassigned") ?? [];
      current.push(task.title);
      waitingGroups.set(task.waiting_on ?? "Unassigned", current);
      sources.push(sourceForTask(projectSlug, task.id, task.title));
    });

  if (waitingGroups.size === 0) {
    return {
      type: "status",
      answer:
        "I could not find any comments or tasks explicitly marked as waiting on another group. Add project tasks or update reviewer comment statuses to make this question more useful.",
      disclaimer: FULL_DISCLAIMER,
      sources: [],
      missing: ["Project tasks with waiting_on values", "Reviewer comments using waiting_on_* statuses"]
    };
  }

  const answer = Array.from(waitingGroups.entries())
    .map(([group, items]) => `${group}: ${items.join("; ")}`)
    .join("\n");

  return {
    type: "status",
    answer: `Current waiting groups:\n${answer}`,
    disclaimer: FULL_DISCLAIMER,
    sources: uniqueSources(sources)
  };
}

async function answerUsfsAccessStatus(projectSlug: string): Promise<AssistantResponsePayload> {
  const [comments, accessLogs, documents, chunks] = await Promise.all([
    getReviewerCommentsByProjectSlug(projectSlug),
    getAccessLogsByProjectSlug(projectSlug),
    getDocumentsByProjectSlug(projectSlug),
    searchDocumentChunksByProjectSlug(projectSlug, "USFS access road gate", 5)
  ]);

  const relevantComments = comments.filter(
    (comment) =>
      comment.department.toLowerCase().includes("usfs") ||
      comment.comment_text.toLowerCase().includes("access") ||
      comment.comment_text.toLowerCase().includes("road")
  );
  const relevantLogs = accessLogs.filter(
    (entry) =>
      entry.status?.toLowerCase().includes("usfs") ||
      entry.access_feature.toLowerCase().includes("gate") ||
      entry.access_feature.toLowerCase().includes("road") ||
      entry.description?.toLowerCase().includes("access")
  );
  const relevantDocuments = documents.filter(
    (document) =>
      document.document_type === "usfs_correspondence" ||
      document.title.toLowerCase().includes("access") ||
      document.notes?.toLowerCase().includes("usfs")
  );

  const sources = [
    ...relevantLogs.map((entry) => sourceForAccessLog(projectSlug, entry.id, entry.access_feature)),
    ...relevantDocuments.map((document) => sourceForDocument(projectSlug, document.id, document.title)),
    ...relevantComments.map((comment) =>
      sourceForComment(projectSlug, comment.id, comment.comment_id || comment.comment_text.slice(0, 40))
    ),
    ...chunks.map((chunk) => ({
      href: `/projects/${projectSlug}/documents/${chunk.document_id}`,
      label: `Chunk: ${chunk.section_label ?? `Page ${chunk.page_number ?? "unknown"}`}`
    }))
  ];

  const summaryParts: string[] = [];

  if (relevantLogs.length > 0) {
    summaryParts.push(
      `Latest access observations: ${relevantLogs
        .slice(0, 3)
        .map((entry) => `${entry.log_date ?? "undated"} - ${entry.access_feature}`)
        .join("; ")}.`
    );
  }

  if (relevantComments.length > 0) {
    summaryParts.push(
      `Open review signals: ${relevantComments
        .slice(0, 3)
        .map((comment) => `${comment.department}: ${comment.comment_text}`)
        .join("; ")}.`
    );
  }

  if (relevantDocuments.length > 0) {
    summaryParts.push(
      `Supporting documents: ${relevantDocuments
        .slice(0, 3)
        .map((document) => document.title)
        .join(", ")}.`
    );
  }

  if (summaryParts.length === 0) {
    return {
      type: "evidence",
      answer:
        "I could not find enough USFS-specific access records yet. Upload USFS correspondence, access logs, or chunked document text to support this question.",
      disclaimer: FULL_DISCLAIMER,
      sources: [],
      missing: ["USFS correspondence documents", "Access log entries", "Document chunks for access records"]
    };
  }

  return {
    type: "evidence",
    answer: summaryParts.join(" "),
    disclaimer: FULL_DISCLAIMER,
    sources: uniqueSources(sources)
  };
}

async function answerApprovalBlockers(projectSlug: string): Promise<AssistantResponsePayload> {
  const project = await getProjectBySlug(projectSlug);
  if (!project) {
    return {
      type: "mixed",
      answer: "Project not found.",
      disclaimer: FULL_DISCLAIMER,
      sources: []
    };
  }

  const [comments, tasks, culverts, fieldPoints] = await Promise.all([
    getReviewerCommentsByProjectSlug(projectSlug),
    getProjectTasksByProjectSlug(projectSlug),
    getCulvertsByProjectId(project.id),
    getFieldPointsByProjectSlug(projectSlug)
  ]);

  const openComments = comments.filter((comment) => comment.status !== "resolved" && comment.status !== "deferred");
  const openTasks = tasks.filter((task) => task.status !== "resolved" && task.status !== "closed");
  const undocumentedCulverts = culverts.filter((culvert) => !culvert.notes || culvert.slope_percent == null);
  const reviewFieldPoints = fieldPoints.filter((point) => point.confidence === "needs_review");

  const sources = [
    ...openComments.map((comment) =>
      sourceForComment(projectSlug, comment.id, comment.comment_id || comment.comment_text.slice(0, 40))
    ),
    ...openTasks.map((task) => sourceForTask(projectSlug, task.id, task.title)),
    ...undocumentedCulverts.map((culvert) => sourceForCulvert(projectSlug, culvert.culvert_id)),
    ...reviewFieldPoints.map((point) => sourceForFieldPoint(projectSlug, point.id, point.point_name))
  ];

  const answerSections = [
    openComments.length > 0
      ? `Open reviewer comments: ${openComments.slice(0, 5).map((comment) => comment.comment_id || comment.comment_text).join(", ")}.`
      : "",
    openTasks.length > 0
      ? `Open project tasks: ${openTasks.slice(0, 5).map((task) => task.title).join(", ")}.`
      : "",
    undocumentedCulverts.length > 0
      ? `Culvert documentation gaps: ${undocumentedCulverts.slice(0, 5).map((culvert) => culvert.culvert_id).join(", ")}.`
      : "",
    reviewFieldPoints.length > 0
      ? `Field points needing review: ${reviewFieldPoints.slice(0, 5).map((point) => point.point_name).join(", ")}.`
      : ""
  ].filter(Boolean);

  if (answerSections.length === 0) {
    return {
      type: "mixed",
      answer:
        "I could not find obvious blockers in comments, tasks, culverts, or flagged field points. If more review context exists in documents, ingest document chunks for stronger evidence-based answers.",
      disclaimer: FULL_DISCLAIMER,
      sources: uniqueSources(sources)
    };
  }

  return {
    type: "mixed",
    answer: answerSections.join(" "),
    disclaimer: FULL_DISCLAIMER,
    sources: uniqueSources(sources)
  };
}

async function answerLegalAccessSupport(projectSlug: string): Promise<AssistantResponsePayload> {
  const [documents, chunks] = await Promise.all([
    getDocumentsByProjectSlug(projectSlug),
    searchDocumentChunksByProjectSlug(projectSlug, "legal access easement deed access", 6)
  ]);

  const relevantDocuments = documents.filter(
    (document) =>
      document.document_type === "deed" ||
      document.document_type === "easement" ||
      document.title.toLowerCase().includes("access")
  );

  if (relevantDocuments.length === 0 && chunks.length === 0) {
    return {
      type: "evidence",
      answer:
        "I could not find documents or chunked text that clearly support legal access yet. Upload deeds, easements, title materials, or ingest their text for stronger support.",
      disclaimer: FULL_DISCLAIMER,
      sources: [],
      missing: ["Deeds or easements", "Document chunks for legal access records"]
    };
  }

  const sources = [
    ...relevantDocuments.map((document) => sourceForDocument(projectSlug, document.id, document.title)),
    ...chunks.map((chunk) => ({
      href: `/projects/${projectSlug}/documents/${chunk.document_id}`,
      label: `Chunk: ${chunk.section_label ?? `Page ${chunk.page_number ?? "unknown"}`}`
    }))
  ];

  return {
    type: "evidence",
    answer: `Documents currently supporting access records include ${relevantDocuments
      .slice(0, 5)
      .map((document) => document.title)
      .join(", ")}. Use the cited records below to review the current evidence set.`,
    disclaimer: FULL_DISCLAIMER,
    sources: uniqueSources(sources)
  };
}

async function answerCulvertDocumentation(projectSlug: string): Promise<AssistantResponsePayload> {
  const project = await getProjectBySlug(projectSlug);
  if (!project) {
    return {
      type: "status",
      answer: "Project not found.",
      disclaimer: FULL_DISCLAIMER,
      sources: []
    };
  }

  const [culverts, fieldPoints] = await Promise.all([
    getCulvertsByProjectId(project.id),
    getFieldPointsByProjectSlug(projectSlug)
  ]);

  const undocumented = culverts.filter((culvert) => culvert.slope_percent == null || !culvert.notes);
  const culvertRelatedPoints = fieldPoints.filter((point) => point.point_type.startsWith("culvert"));
  const sources = [
    ...undocumented.map((culvert) => sourceForCulvert(projectSlug, culvert.culvert_id)),
    ...culvertRelatedPoints.slice(0, 6).map((point) => sourceForFieldPoint(projectSlug, point.id, point.point_name))
  ];

  if (undocumented.length === 0) {
    return {
      type: "status",
      answer: "I did not find culvert records missing slope or notes. Continue uploading point evidence and photos as needed.",
      disclaimer: FULL_DISCLAIMER,
      sources: uniqueSources(sources)
    };
  }

  return {
    type: "status",
    answer: `Culverts still needing documentation: ${undocumented
      .map((culvert) => culvert.culvert_id)
      .join(", ")}.`,
    disclaimer: FULL_DISCLAIMER,
    sources: uniqueSources(sources)
  };
}

export async function answerAssistantQuestion(projectSlug: string, question: string): Promise<AssistantResponsePayload> {
  const normalized = question.trim().toLowerCase();
  const type = classifyQuestion(question);

  if (normalized.includes("waiting responses") || normalized.includes("waiting on")) {
    return answerWaitingResponses(projectSlug);
  }

  if (normalized.includes("usfs") && normalized.includes("access")) {
    return answerUsfsAccessStatus(projectSlug);
  }

  if (normalized.includes("legal access")) {
    return answerLegalAccessSupport(projectSlug);
  }

  if (normalized.includes("culvert")) {
    return answerCulvertDocumentation(projectSlug);
  }

  if (normalized.includes("approval") || normalized.includes("blocking") || normalized.includes("blockers")) {
    return answerApprovalBlockers(projectSlug);
  }

  return {
    ...(await answerApprovalBlockers(projectSlug)),
    type
  };
}

export async function getAssistantStatusSnapshot(projectSlug: string) {
  const [comments, tasks, accessLogs] = await Promise.all([
    getReviewerCommentsByProjectSlug(projectSlug),
    getProjectTasksByProjectSlug(projectSlug),
    getAccessLogsByProjectSlug(projectSlug)
  ]);

  return {
    openComments: comments.filter((comment) => comment.status !== "resolved" && comment.status !== "deferred"),
    tasks,
    accessLogs
  };
}
