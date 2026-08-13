import { FULL_DISCLAIMER } from "@/lib/constants";
import { getAccessLogsByProjectSlug } from "@/lib/access-log";
import { getCulvertsByProjectId } from "@/lib/culverts";
import { searchDocumentChunksByProjectSlug } from "@/lib/document-chunks";
import { getDocumentsByProjectSlug, getProjectBySlug } from "@/lib/documents";
import { getFieldPointsByProjectSlug } from "@/lib/field-points";
import { getLidarScansByProjectSlug } from "@/lib/lidar";
import { getProjectTasksByProjectSlug } from "@/lib/project-tasks";
import { getRoadOverviewByProjectSlug } from "@/lib/road";
import { getRecentRoadDailySnapshots } from "@/lib/road-history";
import { getRoadFieldMeasurementsByCorridorId } from "@/lib/road-measurements";
import { getRoadConditionReportsByCorridorId } from "@/lib/road-reports";
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

function sourceForChunk(projectSlug: string, chunk: { document_id?: string | null; transcript_id?: string | null; source_type: "document" | "transcript"; section_label?: string | null; page_number?: number | null }): AssistantSource {
  if (chunk.source_type === "transcript") {
    return {
      href: `/projects/${projectSlug}/transcripts`,
      label: `Transcript chunk: ${chunk.section_label ?? `Transcript ${chunk.transcript_id ?? ""}`.trim()}`
    };
  }

  return {
    href: `/projects/${projectSlug}/documents/${chunk.document_id}`,
    label: `Chunk: ${chunk.section_label ?? `Page ${chunk.page_number ?? "unknown"}`}`
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

function sourceForRoadWorkspace(projectSlug: string, label: string): AssistantSource {
  return {
    href: `/projects/${projectSlug}/road`,
    label
  };
}

function sourceForLidarScan(projectSlug: string, scanId: string, title: string): AssistantSource {
  return {
    href: `/projects/${projectSlug}/lidar/${scanId}`,
    label: `LiDAR scan: ${title}`
  };
}

function classifyQuestion(question: string): "status" | "evidence" | "mixed" {
  const normalized = question.toLowerCase();

  if (
    normalized.includes("road") ||
    normalized.includes("closure") ||
    normalized.includes("weather risk") ||
    normalized.includes("passable") ||
    normalized.includes("field report") ||
    normalized.includes("lidar") ||
    normalized.includes("measurement") ||
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

async function answerRoadStatus(projectSlug: string): Promise<AssistantResponsePayload> {
  const [overview, reports, snapshots] = await Promise.all([
    getRoadOverviewByProjectSlug(projectSlug),
    getRoadOverviewByProjectSlug(projectSlug).then((value) =>
      value ? getRoadConditionReportsByCorridorId(value.corridor.id, 3) : []
    ),
    getRoadOverviewByProjectSlug(projectSlug).then((value) =>
      value ? getRecentRoadDailySnapshots(value.corridor.id, 3) : []
    )
  ]);

  if (!overview) {
    return {
      type: "status",
      answer: "Road intelligence is not configured for this project yet.",
      disclaimer: FULL_DISCLAIMER,
      sources: []
    };
  }

  const sources = [
    sourceForRoadWorkspace(projectSlug, "Road workspace"),
    ...overview.activeAlerts.map((alert) => sourceForRoadWorkspace(projectSlug, `Road alert: ${alert.title}`)),
    ...reports.map((report) => sourceForRoadWorkspace(projectSlug, `Road report: ${report.condition ?? "Condition report"}`))
  ];

  const answerParts = [
    `Current consolidated road status is ${overview.currentStatus.consolidated_status ?? "unknown"} with ${overview.currentStatus.overall_access_risk ?? "unknown"} access risk.`,
    overview.currentStatus.consolidated_status_reason
      ? `Reason: ${overview.currentStatus.consolidated_status_reason}.`
      : `Source: ${overview.currentStatus.consolidated_status_source ?? "deterministic reconciliation"}.`,
    `Official status is ${overview.currentStatus.official_status ?? "unknown"} and partner status is ${overview.currentStatus.partner_status ?? "unknown"}.`,
    overview.activeAlerts.length > 0
      ? `Active alerts: ${overview.activeAlerts.slice(0, 3).map((alert) => alert.title).join(", ")}.`
      : "No active road alerts are stored right now.",
    reports.length > 0
      ? `Recent field reports: ${reports.map((report) => report.condition ?? "Condition report").join("; ")}.`
      : "No recent field road reports are stored.",
    snapshots[0]?.summary ? `Latest snapshot: ${snapshots[0].summary}` : ""
  ].filter(Boolean);

  return {
    type: "status",
    answer: answerParts.join(" "),
    disclaimer: FULL_DISCLAIMER,
    sources: uniqueSources(sources)
  };
}

async function answerRoadWeatherRisk(projectSlug: string): Promise<AssistantResponsePayload> {
  const overview = await getRoadOverviewByProjectSlug(projectSlug);

  if (!overview) {
    return {
      type: "status",
      answer: "Road weather intelligence is not configured for this project yet.",
      disclaimer: FULL_DISCLAIMER,
      sources: []
    };
  }

  const weatherLines = overview.weatherSnapshots.slice(0, 3).map((snapshot) => {
    const observation = snapshot.latestObservation;
    const forecast = snapshot.nextForecast;

    return `${snapshot.location.name}: ${observation?.temperature_f ?? "unknown"} F, ${
      observation?.weather_description ?? "no current condition"
    }, wind ${observation?.wind_speed_mph ?? "?"} mph, POP ${forecast?.precipitation_probability ?? "?"}%${forecast?.snowfall_inches != null ? `, snow ${forecast.snowfall_inches} in` : ""}`;
  });

  return {
    type: "status",
    answer: [
      `Current road weather risk is ${overview.currentStatus.overall_access_risk ?? "unknown"}.`,
      weatherLines.length > 0 ? `Weather sample sites: ${weatherLines.join("; ")}.` : "No weather sample sites are populated.",
      overview.currentStatus.active_weather_alert_count
        ? `${overview.currentStatus.active_weather_alert_count} active weather alerts are influencing the corridor risk picture.`
        : "No active weather alerts are currently stored."
    ].join(" "),
    disclaimer: FULL_DISCLAIMER,
    sources: uniqueSources([sourceForRoadWorkspace(projectSlug, "Road weather and risk")])
  };
}

async function answerRoadEvidence(projectSlug: string): Promise<AssistantResponsePayload> {
  const project = await getProjectBySlug(projectSlug);
  const overview = await getRoadOverviewByProjectSlug(projectSlug);

  if (!project || !overview) {
    return {
      type: "evidence",
      answer: "Road evidence records are not configured for this project yet.",
      disclaimer: FULL_DISCLAIMER,
      sources: []
    };
  }

  const [culverts, roadMeasurements, lidarScans, fieldPoints] = await Promise.all([
    getCulvertsByProjectId(project.id),
    getRoadFieldMeasurementsByCorridorId(overview.corridor.id, 8),
    getLidarScansByProjectSlug(projectSlug),
    getFieldPointsByProjectSlug(projectSlug)
  ]);

  const roadFieldPoints = fieldPoints.filter((point) =>
    ["road_edge", "gate", "turnout", "driveway", "culvert_inlet", "culvert_outlet", "ditch", "swale", "berm", "photo_station"].includes(point.point_type)
  );

  const sources = [
    sourceForRoadWorkspace(projectSlug, "Road evidence workspace"),
    ...roadMeasurements.map((measurement) =>
      sourceForRoadWorkspace(projectSlug, `Measurement: ${measurement.measurement_type}`)
    ),
    ...lidarScans.slice(0, 4).map((scan) => sourceForLidarScan(projectSlug, scan.id, scan.title)),
    ...roadFieldPoints.slice(0, 6).map((point) => sourceForFieldPoint(projectSlug, point.id, point.point_name)),
    ...culverts.slice(0, 6).map((culvert) => sourceForCulvert(projectSlug, culvert.culvert_id))
  ];

  const answerParts = [
    `${lidarScans.length} LiDAR scans are registered for road review.`,
    `${roadMeasurements.length} saved roadway measurements are currently available.`,
    `${roadFieldPoints.length} road-linked field points and ${culverts.length} culvert records support the corridor evidence set.`,
    roadMeasurements.length > 0
      ? `Recent measurements: ${roadMeasurements
          .slice(0, 4)
          .map((measurement) => `${measurement.measurement_type.replaceAll("_", " ")} ${measurement.value ?? "?"} ${measurement.units ?? ""}`.trim())
          .join("; ")}.`
      : "No roadway measurements have been saved yet."
  ];

  return {
    type: "evidence",
    answer: answerParts.join(" "),
    disclaimer: FULL_DISCLAIMER,
    sources: uniqueSources(sources)
  };
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
    ...chunks.map((chunk) => sourceForChunk(projectSlug, chunk))
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
    ...chunks.map((chunk) => sourceForChunk(projectSlug, chunk))
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

  if (
    normalized.includes("road status") ||
    normalized.includes("closure") ||
    normalized.includes("passable") ||
    normalized.includes("fs 0300")
  ) {
    return answerRoadStatus(projectSlug);
  }

  if (normalized.includes("weather risk") || (normalized.includes("road") && normalized.includes("weather"))) {
    return answerRoadWeatherRisk(projectSlug);
  }

  if (
    normalized.includes("lidar") ||
    normalized.includes("measurement") ||
    normalized.includes("road evidence") ||
    normalized.includes("scan support")
  ) {
    return answerRoadEvidence(projectSlug);
  }

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
  const [comments, tasks, accessLogs, roadOverview] = await Promise.all([
    getReviewerCommentsByProjectSlug(projectSlug),
    getProjectTasksByProjectSlug(projectSlug),
    getAccessLogsByProjectSlug(projectSlug),
    getRoadOverviewByProjectSlug(projectSlug)
  ]);

  return {
    openComments: comments.filter((comment) => comment.status !== "resolved" && comment.status !== "deferred"),
    tasks,
    accessLogs,
    roadOverview
  };
}
