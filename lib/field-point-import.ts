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
  "coordinate_system",
  "latitude",
  "longitude",
  "description",
  "source_equipment",
  "collection_method",
  "collected_at",
  "confidence"
] as const;

export const FIELD_POINT_IMPORT_ALIASES: Record<(typeof FIELD_POINT_IMPORT_FIELDS)[number], string[]> = {
  point_name: ["point_name", "name", "point", "point id"],
  point_type: ["point_type", "type", "code", "code description", "feature type"],
  easting: ["easting", "x"],
  northing: ["northing", "y"],
  elevation: ["elevation", "z", "height"],
  coordinate_system: ["coordinate_system", "cs name", "coordinate system"],
  latitude: ["latitude", "lat"],
  longitude: ["longitude", "lon", "lng"],
  description: ["description", "desc", "notes", "code description"],
  source_equipment: ["source_equipment", "device type", "equipment"],
  collection_method: ["collection_method", "correction type", "method", "solution status"],
  collected_at: ["collected_at", "averaging start", "date collected", "observation date", "date"],
  confidence: ["confidence", "solution status", "quality"]
};

export function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

export function inferFieldMapping(headers: string[]) {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header)
  }));

  return FIELD_POINT_IMPORT_FIELDS.reduce<Record<string, string>>((accumulator, field) => {
    const aliases = FIELD_POINT_IMPORT_ALIASES[field];
    const match = normalizedHeaders.find((header) => aliases.includes(header.normalized));
    accumulator[field] = match?.original ?? "";
    return accumulator;
  }, {});
}

export function inferPointType(rawPointType: string, description = "") {
  const normalizedType = rawPointType.trim().toLowerCase();
  const normalizedDescription = description.trim().toLowerCase();
  const combined = `${normalizedType} ${normalizedDescription}`.trim();

  if (FIELD_POINT_TYPE_OPTIONS.includes(normalizedType as (typeof FIELD_POINT_TYPE_OPTIONS)[number])) {
    return normalizedType;
  }

  if (combined.includes("road edge")) return "road_edge";
  if (combined.includes("culvert")) return "culvert_inlet";
  if (combined.includes("monument")) return "monument";
  if (combined.includes("control") || combined.includes("anchor")) return "control";
  if (combined.includes("gate")) return "gate";
  if (combined.includes("turnout")) return "turnout";
  if (combined.includes("driveway")) return "driveway";
  if (combined.includes("ditch")) return "ditch";
  if (combined.includes("swale")) return "swale";
  if (combined.includes("berm")) return "berm";
  if (combined.includes("photo")) return "photo_station";

  return rawPointType.trim() ? "other" : "";
}

export function inferConfidence(rawConfidence: string, collectionMethod = "") {
  const combined = `${rawConfidence} ${collectionMethod}`.trim().toLowerCase();

  if (FIELD_POINT_CONFIDENCE_OPTIONS.includes(rawConfidence.trim().toLowerCase() as (typeof FIELD_POINT_CONFIDENCE_OPTIONS)[number])) {
    return rawConfidence.trim().toLowerCase();
  }

  if (combined.includes("fix") || combined.includes("rtk")) return "rtk_observed";
  if (combined.includes("survey")) return "survey_control";
  if (combined.includes("lidar")) return "lidar_derived";
  if (combined.includes("historic")) return "historic";
  if (combined.includes("estimate")) return "estimated";

  return "field_observed";
}

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
