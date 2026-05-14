export type Project = {
  id: string;
  name: string;
  slug: string;
  description: string;
  parcel_number: string;
  address: string;
  county: string;
  state: string;
};

export type ReviewerComment = {
  id: string;
  application_number: string;
  comment_id: string;
  reviewer_name: string;
  department: string;
  priority: "low" | "medium" | "high" | "critical";
  status:
    | "open"
    | "in_progress"
    | "waiting_on_city"
    | "waiting_on_owner"
    | "waiting_on_engineer"
    | "resolved"
    | "deferred";
  responsible_party: string;
  comment_text: string;
  response_text?: string;
  linked_document_title?: string;
};

export type FieldPoint = {
  id: string;
  point_name: string;
  point_type: string;
  easting?: number;
  northing?: number;
  elevation?: number;
  latitude?: number;
  longitude?: number;
  confidence: string;
  description?: string;
};
