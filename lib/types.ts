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
  project_id?: string;
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
  linked_document_id?: string | null;
  linked_document_title?: string;
  due_date?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type FieldPoint = {
  id: string;
  project_id?: string;
  uploaded_by_user_id?: string | null;
  uploaded_by_email?: string | null;
  import_source_file?: string | null;
  import_batch_name?: string | null;
  point_name: string;
  point_type: string;
  easting?: number;
  northing?: number;
  elevation?: number;
  coordinate_system?: string;
  latitude?: number;
  longitude?: number;
  collection_method?: string;
  source_equipment?: string;
  confidence: string;
  description?: string;
  photo_document_id?: string | null;
  collected_at?: string | null;
  created_at?: string;
};

export type FieldPointImportRow = {
  point_name: string;
  point_type: string;
  easting?: number;
  northing?: number;
  elevation?: number;
  coordinate_system?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  source_equipment?: string;
  collection_method?: string;
  confidence: string;
  collected_at?: string;
  validationIssues: string[];
};

export type Culvert = {
  id: string;
  project_id: string;
  culvert_id: string;
  inlet_point_id: string | null;
  outlet_point_id: string | null;
  diameter_inches: number | null;
  material: string | null;
  length_feet: number | null;
  slope_percent: number | null;
  condition: string | null;
  ownership: string | null;
  flow_direction: string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
};

export type DocumentType =
  | "deed"
  | "easement"
  | "annexation_agreement"
  | "title_commitment"
  | "survey"
  | "plat"
  | "drainage_report"
  | "geohazard_report"
  | "city_comment_letter"
  | "usfs_correspondence"
  | "fire_review"
  | "utility_correspondence"
  | "photo_log"
  | "lidar"
  | "other";

export type ProjectDocument = {
  id: string;
  project_id: string;
  created_by_user_id?: string | null;
  created_by_email?: string | null;
  title: string;
  document_type: DocumentType;
  record_date: string | null;
  reception_number: string | null;
  book: string | null;
  page: string | null;
  source_agency: string | null;
  file_path: string | null;
  external_url: string | null;
  notes: string | null;
  status: string;
  current_version_number: number;
  created_at: string;
  updated_at: string;
};

export type DocumentVersion = {
  id: string;
  document_id: string;
  uploaded_by_user_id?: string | null;
  uploaded_by_email?: string | null;
  version_number: number;
  file_path: string;
  notes: string | null;
  is_current: boolean;
  superseded_at: string | null;
  created_at: string;
};
