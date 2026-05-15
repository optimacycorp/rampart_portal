import {
  seededApplicationNumbers,
  seededDepartments,
  seededProject,
  seededResponsibleParties,
  seededReviewerComments
} from "@/lib/mock-data";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { ReviewerComment } from "@/lib/types";

type ReviewerCommentRow = {
  id: string;
  project_id: string;
  application_number: string | null;
  comment_id: string | null;
  reviewer_name: string | null;
  department: string | null;
  status: ReviewerComment["status"];
  priority: ReviewerComment["priority"];
  comment_text: string;
  response_text: string | null;
  responsible_party: string | null;
  linked_document_id: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  documents: { title: string } | { title: string }[] | null;
};

export type ReviewerCommentFilters = {
  status?: string;
  priority?: string;
  department?: string;
  responsibleParty?: string;
  applicationNumber?: string;
};

export async function getReviewerCommentsByProjectSlug(
  projectSlug: string,
  filters: ReviewerCommentFilters = {}
): Promise<ReviewerComment[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return seededReviewerComments.filter((comment) => {
      if (projectSlug !== seededProject.slug) {
        return false;
      }

      return matchesCommentFilters(comment, filters);
    });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", projectSlug)
    .single();

  if (!project) {
    return [];
  }

  let query = supabase
    .from("reviewer_comments")
    .select(
      "id, project_id, application_number, comment_id, reviewer_name, department, status, priority, comment_text, response_text, responsible_party, linked_document_id, due_date, created_at, updated_at, documents(title)"
    )
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.priority) {
    query = query.eq("priority", filters.priority);
  }

  if (filters.department) {
    query = query.eq("department", filters.department);
  }

  if (filters.responsibleParty) {
    query = query.eq("responsible_party", filters.responsibleParty);
  }

  if (filters.applicationNumber) {
    query = query.eq("application_number", filters.applicationNumber);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return (data as ReviewerCommentRow[]).map((row) => ({
    id: row.id,
    project_id: row.project_id,
    application_number: row.application_number ?? "",
    comment_id: row.comment_id ?? "",
    reviewer_name: row.reviewer_name ?? "",
    department: row.department ?? "",
    priority: row.priority,
    status: row.status,
    responsible_party: row.responsible_party ?? "",
    comment_text: row.comment_text,
    response_text: row.response_text ?? "",
    linked_document_id: row.linked_document_id,
    linked_document_title:
      Array.isArray(row.documents) ? row.documents[0]?.title ?? undefined : row.documents?.title ?? undefined,
    due_date: row.due_date,
    created_at: row.created_at,
    updated_at: row.updated_at
  }));
}

function matchesCommentFilters(comment: ReviewerComment, filters: ReviewerCommentFilters) {
  if (filters.status && comment.status !== filters.status) {
    return false;
  }

  if (filters.priority && comment.priority !== filters.priority) {
    return false;
  }

  if (filters.department && comment.department !== filters.department) {
    return false;
  }

  if (filters.responsibleParty && comment.responsible_party !== filters.responsibleParty) {
    return false;
  }

  if (filters.applicationNumber && comment.application_number !== filters.applicationNumber) {
    return false;
  }

  return true;
}

export function getReviewerCommentFilterOptions() {
  return {
    applicationNumbers: seededApplicationNumbers,
    departments: seededDepartments,
    responsibleParties: seededResponsibleParties,
    statuses: [
      "open",
      "in_progress",
      "waiting_on_city",
      "waiting_on_owner",
      "waiting_on_engineer",
      "resolved",
      "deferred"
    ],
    priorities: ["low", "medium", "high", "critical"]
  };
}
