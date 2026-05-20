export const FULL_DISCLAIMER =
  "This portal is an internal project coordination and evidence management tool. It does not constitute a land survey, engineering report, legal opinion, drainage report, title opinion, access determination, or governmental approval. Survey, engineering, legal, drainage, access, and planning conclusions must be made by the appropriate licensed professionals or reviewing agencies. Data shown here may be preliminary, approximate, incomplete, or subject to correction.";

export const SHORT_DISCLAIMER =
  "Coordination tool only. Not a survey, engineering report, legal opinion, or agency approval.";

export const DOCUMENT_TYPE_OPTIONS = [
  "deed",
  "easement",
  "annexation_agreement",
  "title_commitment",
  "survey",
  "plat",
  "drainage_report",
  "geohazard_report",
  "city_comment_letter",
  "usfs_correspondence",
  "fire_review",
  "utility_correspondence",
  "photo_log",
  "lidar",
  "other"
] as const;

export const CULVERT_MATERIAL_OPTIONS = ["CMP", "HDPE", "RCP", "PVC", "concrete", "unknown", "other"] as const;

export const CULVERT_OWNERSHIP_OPTIONS = ["private", "city", "usfs", "unknown", "shared"] as const;

export const ACCESS_LOG_STATUS_OPTIONS = [
  "USFS correspondence",
  "Gate condition",
  "Road maintenance",
  "Snow/winter access",
  "Fire access",
  "Road drainage",
  "Turnout/width",
  "General observation"
] as const;

export const PHOTO_CATEGORY_OPTIONS = [
  "culvert",
  "berm",
  "drainage",
  "road",
  "gate",
  "monument",
  "vegetation",
  "fire_access",
  "utility",
  "general"
] as const;

export const PLAN_TYPE_OPTIONS = ["site_plan", "land_usability", "final_plat", "building_plans"] as const;

export const PLAN_TYPE_LABELS: Record<(typeof PLAN_TYPE_OPTIONS)[number], string> = {
  site_plan: "Site Plan",
  land_usability: "Land Usability",
  final_plat: "Final Plat",
  building_plans: "Building Plans"
};

export const PLAN_TYPE_HINTS: Record<(typeof PLAN_TYPE_OPTIONS)[number], string> = {
  site_plan: "Current site plan sheets and revisions used for coordination and review.",
  land_usability: "Land usability exhibits, hillside or site-constraint sheets, and related revisions.",
  final_plat: "Final plat submissions, revisions, and recorded-ready plan sheets.",
  building_plans: "Building plan sets, architectural sheets, and related review revisions."
};
