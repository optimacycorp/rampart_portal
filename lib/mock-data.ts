import { AccessLogEntry, FieldPoint, Project, ReviewerComment } from "@/lib/types";

export const seededProject: Project = {
  id: "4d00e17d-0bcf-4840-83a7-9d24f8079f11",
  name: "3245 Rampart Range Road",
  slug: "3245-rampart-range-road",
  description:
    "Rampart Range development, access, drainage, easement, and planning evidence portal.",
  parcel_number: "7333200002",
  address: "3245 Rampart Range Road, Colorado Springs, CO",
  county: "El Paso County",
  state: "Colorado"
};

export const seededReviewerComments: ReviewerComment[] = [
  {
    id: "c1",
    project_id: seededProject.id,
    application_number: "SUBD-24-0106",
    comment_id: "PLN-01",
    reviewer_name: "Planning Staff",
    department: "Planning",
    priority: "high",
    status: "open",
    responsible_party: "Thomas",
    comment_text: "Clarify the document trail supporting private access assumptions.",
    response_text: "Collecting deed and easement support into the portal.",
    linked_document_id: "doc-fallback-1",
    linked_document_title: "Access Exhibit Index"
  },
  {
    id: "c2",
    project_id: seededProject.id,
    application_number: "DEPN-25-0102",
    comment_id: "SWENT-04",
    reviewer_name: "Stormwater Reviewer",
    department: "City Engineering - SWENT",
    priority: "critical",
    status: "waiting_on_engineer",
    responsible_party: "Dave Gorman / MVE",
    comment_text: "Identify culvert assumptions and supporting field evidence for drainage routing."
  },
  {
    id: "c3",
    project_id: seededProject.id,
    application_number: "STM-MP24-0278",
    comment_id: "FIRE-02",
    reviewer_name: "Fire Reviewer",
    department: "Fire",
    priority: "medium",
    status: "in_progress",
    responsible_party: "Fire",
    comment_text: "Provide access observations relevant to seasonal or gate-related constraints."
  }
];

export const seededApplicationNumbers = [
  "SUBD-24-0106",
  "DEPN-25-0102",
  "STM-MP24-0278",
  "STM-REV24-0768"
];

export const seededDepartments = [
  "Planning",
  "City Engineering - SWENT",
  "City Engineering Dev Review",
  "Colorado Springs Utilities",
  "Fire",
  "Real Estate Services",
  "Regional Building",
  "USFS"
];

export const seededResponsibleParties = [
  "Thomas",
  "Dave Gorman / MVE",
  "Surveyor",
  "City Planning",
  "CSU",
  "USFS",
  "Fire",
  "TBD"
];

export const seededFieldPoints: FieldPoint[] = [
  {
    id: "fp-1",
    uploaded_by_user_id: "demo-owner",
    uploaded_by_email: "team@rampart-range.org",
    import_source_file: "emlid-field-points-template.csv",
    import_batch_name: "Initial Control Import",
    point_name: "CEN1",
    point_type: "monument",
    easting: 3171382.152,
    northing: 1381355.997,
    elevation: 6992.865,
    latitude: 38.92176425,
    longitude: -104.61773785,
    confidence: "rtk_observed",
    description: "POB/NW corner",
    collected_at: "2026-02-08T13:27:12-06:00"
  },
  {
    id: "fp-2",
    uploaded_by_user_id: "demo-owner",
    uploaded_by_email: "team@rampart-range.org",
    import_source_file: "emlid-field-points-template.csv",
    import_batch_name: "Initial Control Import",
    point_name: "DW_FOUND_CAP",
    point_type: "monument",
    easting: 3171950.996,
    northing: 1381143.475,
    elevation: 6938.907,
    latitude: 38.92176425,
    longitude: -104.61773785,
    confidence: "rtk_observed",
    description: "Found cap likely property corner",
    collected_at: "2026-02-08T13:27:53-06:00"
  },
  {
    id: "fp-3",
    uploaded_by_user_id: "demo-owner",
    uploaded_by_email: "team@rampart-range.org",
    import_source_file: "emlid-field-points-template.csv",
    import_batch_name: "Drainage Recon Batch A",
    point_name: "CULV-IN-01",
    point_type: "culvert_inlet",
    elevation: 6942.1,
    latitude: 38.9221,
    longitude: -104.6184,
    confidence: "field_observed",
    description: "Observed inlet on uphill road edge",
    collected_at: "2026-02-08T13:29:00-06:00"
  }
];

export const seededAccessLogs: AccessLogEntry[] = [
  {
    id: "access-1",
    project_id: seededProject.id,
    log_date: "2026-05-10",
    access_feature: "FS 0300 road segment",
    status: "Road maintenance",
    description: "Observed rutting and drainage crossing near turnout.",
    road_condition: "Rutting near crossing",
    gate_condition: null,
    weather: "Dry",
    linked_document_id: "doc-fallback-2",
    linked_document_title: "Drainage Observation Log"
  },
  {
    id: "access-2",
    project_id: seededProject.id,
    log_date: "2026-05-06",
    access_feature: "Garden of the Gods gate",
    status: "Gate condition",
    description: "Gate condition documented with photo set and access notes.",
    road_condition: null,
    gate_condition: "Operational during visit",
    weather: "Clear",
    linked_document_id: "doc-fallback-1",
    linked_document_title: "Access Exhibit Index"
  }
];
