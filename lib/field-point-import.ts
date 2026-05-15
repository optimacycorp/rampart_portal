import { FieldPointImportRow } from "@/lib/types";

export const FIELD_POINT_TYPE_OPTIONS = [
  "monument",
  "culvert_inlet",
  "culvert_outlet",
  "berm",
  "swale",
  "ditch",
  "road_edge",
  "gate",
  "turnout",
  "driveway",
  "building_corner",
  "control",
  "photo_station",
  "other"
] as const;

export const FIELD_POINT_CONFIDENCE_OPTIONS = [
  "survey_control",
  "field_observed",
  "rtk_observed",
  "lidar_derived",
  "estimated",
  "historic",
  "needs_review"
] as const;

export const FIELD_POINT_IMPORT_FIELDS = [
  "point_name",
  "point_type",
  "easting",
  "northing",
  "elevation",
  "latitude",
  "longitude",
  "description",
  "source_equipment",
  "collection_method",
  "confidence"
] as const;

export function validateFieldPointImportRow(row: Omit<FieldPointImportRow, "validationIssues">): FieldPointImportRow {
  const validationIssues: string[] = [];

  if (!row.point_name) {
    validationIssues.push("Missing point name.");
  }

  if (!row.point_type) {
    validationIssues.push("Missing point type.");
  } else if (!FIELD_POINT_TYPE_OPTIONS.includes(row.point_type as (typeof FIELD_POINT_TYPE_OPTIONS)[number])) {
    validationIssues.push("Point type is not in the allowed list.");
  }

  if (row.easting == null && row.northing == null && row.latitude == null && row.longitude == null) {
    validationIssues.push("Missing both projected and geographic coordinates.");
  }

  if ((row.easting == null) !== (row.northing == null)) {
    validationIssues.push("Projected coordinates should include both easting and northing.");
  }

  if ((row.latitude == null) !== (row.longitude == null)) {
    validationIssues.push("Geographic coordinates should include both latitude and longitude.");
  }

  if (
    row.confidence &&
    !FIELD_POINT_CONFIDENCE_OPTIONS.includes(row.confidence as (typeof FIELD_POINT_CONFIDENCE_OPTIONS)[number])
  ) {
    validationIssues.push("Confidence value is not in the allowed list.");
  }

  return {
    ...row,
    confidence: row.confidence || "field_observed",
    validationIssues
  };
}
