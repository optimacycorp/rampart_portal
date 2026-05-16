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
