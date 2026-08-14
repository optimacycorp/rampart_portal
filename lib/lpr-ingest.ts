import { getSupabaseAdminClient } from "@/lib/supabase";
import { readCallerMetadata } from "@/lib/address/audit";

type LprAuditPayload = {
  camera_id?: string | null;
  action: "ingest";
  success: boolean;
  status_code: number;
  caller_system?: string | null;
  client_ip?: string | null;
  user_agent?: string | null;
  error_message?: string | null;
  request_headers?: Record<string, string>;
  request_payload?: Record<string, unknown> | null;
  response_summary?: Record<string, unknown> | null;
};

type LprCameraRow = {
  id: string;
  project_id: string;
  name: string;
  camera_key?: string | null;
  active?: boolean | null;
};

type IngestLookupContext = {
  cameraId?: string | null;
  cameraName?: string | null;
  cameraKey?: string | null;
};

export type NormalizedLprEvent = {
  cameraId: string;
  projectId: string;
  observedAt: string;
  plateText: string | null;
  plateConfidence: number | null;
  plateState: string | null;
  vehicleType: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleColor: string | null;
  direction: string | null;
  imagePath: string | null;
  plateCropPath: string | null;
  eventLatitude: number | null;
  eventLongitude: number | null;
  rawPayload: Record<string, unknown>;
  cameraName: string;
};

export async function writeLprIngestAuditLog(payload: LprAuditPayload) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  const { error } = await supabase.from("lpr_ingest_audit_log").insert({
    ...payload,
    request_headers: payload.request_headers ?? null,
    request_payload: payload.request_payload ?? null,
    response_summary: payload.response_summary ?? null
  });

  if (error) {
    console.error("LPR ingest audit log write failed", error.message);
  }
}

export function readLprCallerMetadata(request: Request) {
  return readCallerMetadata(request);
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeNumeric(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeDirection(value: unknown) {
  const normalized = normalizeText(value)?.toLowerCase().replace(/\s+/g, "_");

  if (!normalized) {
    return null;
  }

  if (["in", "ingress", "entering", "northbound_inbound"].includes(normalized)) {
    return "inbound";
  }

  if (["out", "egress", "exiting", "southbound_outbound"].includes(normalized)) {
    return "outbound";
  }

  if (["inbound", "outbound", "unknown"].includes(normalized)) {
    return normalized;
  }

  return normalized;
}

export function normalizePlateText(value: unknown) {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  const normalized = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized.length ? normalized : null;
}

async function getCameraByKey(cameraKey: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("lpr_cameras")
    .select("id, project_id, name, camera_key, active")
    .eq("camera_key", cameraKey)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as LprCameraRow;
}

async function getCameraByIdentity({ cameraId, cameraName }: IngestLookupContext) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  if (cameraId) {
    const { data, error } = await supabase
      .from("lpr_cameras")
      .select("id, project_id, name, camera_key, active")
      .eq("id", cameraId)
      .maybeSingle();

    if (!error && data) {
      return data as LprCameraRow;
    }
  }

  if (cameraName) {
    const { data, error } = await supabase
      .from("lpr_cameras")
      .select("id, project_id, name, camera_key, active")
      .ilike("name", cameraName)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return data as LprCameraRow;
    }
  }

  return null;
}

export async function authenticateLprCamera(request: Request, payload: Record<string, unknown>) {
  const sharedSecret = process.env.LPR_INGEST_SHARED_SECRET?.trim() || null;
  const bodyCameraKey = normalizeText(payload.camera_key);
  const headerCameraKey =
    normalizeText(request.headers.get("x-lpr-camera-key")) ??
    normalizeText(request.headers.get("x-camera-key")) ??
    readBearerToken(request);
  const providedKey = headerCameraKey ?? bodyCameraKey;
  const identity = {
    cameraId: normalizeText(payload.camera_id),
    cameraName:
      normalizeText(payload.camera_name) ??
      normalizeText(payload.device_name) ??
      normalizeText(payload.source_name),
    cameraKey: providedKey
  };

  if (providedKey) {
    const camera = await getCameraByKey(providedKey);

    if (camera) {
      return {
        ok: true as const,
        camera,
        authMode: "camera_key" as const
      };
    }

    if (sharedSecret && providedKey === sharedSecret) {
      const camera = await getCameraByIdentity(identity);

      if (camera) {
        return {
          ok: true as const,
          camera,
          authMode: "shared_secret" as const
        };
      }
    }
  }

  return {
    ok: false as const,
    camera: null,
    authMode: null
  };
}

function parseObservedAt(payload: Record<string, unknown>) {
  const candidates = [
    payload.observed_at,
    payload.timestamp,
    payload.capture_time,
    payload.event_time,
    payload.time
  ];

  for (const value of candidates) {
    const text = normalizeText(value);

    if (!text) {
      continue;
    }

    const timestamp = new Date(text);

    if (!Number.isNaN(timestamp.valueOf())) {
      return timestamp.toISOString();
    }
  }

  return new Date().toISOString();
}

export function normalizeLprPayload(camera: LprCameraRow, payload: Record<string, unknown>): NormalizedLprEvent {
  return {
    cameraId: camera.id,
    projectId: camera.project_id,
    observedAt: parseObservedAt(payload),
    plateText:
      normalizePlateText(payload.plate_text) ??
      normalizePlateText(payload.plate) ??
      normalizePlateText(payload.license_plate) ??
      normalizePlateText(payload.plateNumber),
    plateConfidence:
      normalizeNumeric(payload.plate_confidence) ??
      normalizeNumeric(payload.confidence) ??
      normalizeNumeric(payload.score),
    plateState: normalizeText(payload.plate_state) ?? normalizeText(payload.state),
    vehicleType: normalizeText(payload.vehicle_type) ?? normalizeText(payload.type),
    vehicleMake: normalizeText(payload.vehicle_make) ?? normalizeText(payload.make),
    vehicleModel: normalizeText(payload.vehicle_model) ?? normalizeText(payload.model),
    vehicleColor: normalizeText(payload.vehicle_color) ?? normalizeText(payload.color),
    direction: normalizeDirection(payload.direction),
    imagePath: normalizeText(payload.image_path) ?? normalizeText(payload.image_url),
    plateCropPath: normalizeText(payload.plate_crop_path) ?? normalizeText(payload.plate_image_url),
    eventLatitude: normalizeNumeric(payload.event_latitude) ?? normalizeNumeric(payload.latitude),
    eventLongitude: normalizeNumeric(payload.event_longitude) ?? normalizeNumeric(payload.longitude),
    rawPayload: payload,
    cameraName: camera.name
  };
}

export async function insertLprEvent(event: NormalizedLprEvent) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase is not configured for LPR ingest.");
  }

  const { data, error } = await supabase
    .from("lpr_events")
    .insert({
      camera_id: event.cameraId,
      observed_at: event.observedAt,
      plate_text: event.plateText,
      plate_confidence: event.plateConfidence,
      plate_state: event.plateState,
      vehicle_type: event.vehicleType,
      vehicle_make: event.vehicleMake,
      vehicle_model: event.vehicleModel,
      vehicle_color: event.vehicleColor,
      direction: event.direction,
      image_path: event.imagePath,
      plate_crop_path: event.plateCropPath,
      event_latitude: event.eventLatitude,
      event_longitude: event.eventLongitude,
      raw_payload: event.rawPayload
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "LPR event insert failed.");
  }

  return data.id as string;
}

export async function touchLprCameraLastSeen(cameraId: string, observedAt: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  const { error } = await supabase.from("lpr_cameras").update({ last_seen_at: observedAt }).eq("id", cameraId);

  if (error) {
    console.error("LPR camera last_seen_at update failed", error.message);
  }
}

export async function recomputeLprDailyStats(cameraId: string, observedAt: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  const eventDate = observedAt.slice(0, 10);
  const rangeStart = `${eventDate}T00:00:00.000Z`;
  const rangeEnd = `${eventDate}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from("lpr_events")
    .select("observed_at, plate_text, direction")
    .eq("camera_id", cameraId)
    .gte("observed_at", rangeStart)
    .lte("observed_at", rangeEnd)
    .order("observed_at", { ascending: true });

  if (error || !data) {
    console.error("LPR daily stat recompute read failed", error?.message);
    return;
  }

  const uniquePlates = new Set(
    data
      .map((row) => normalizePlateText(row.plate_text))
      .filter((plate): plate is string => Boolean(plate))
  );

  const inboundCount = data.filter((row) => normalizeDirection(row.direction) === "inbound").length;
  const outboundCount = data.filter((row) => normalizeDirection(row.direction) === "outbound").length;

  const { error: upsertError } = await supabase.from("lpr_daily_stats").upsert(
    {
      camera_id: cameraId,
      stat_date: eventDate,
      total_vehicles: data.length,
      unique_plates: uniquePlates.size,
      inbound_count: inboundCount,
      outbound_count: outboundCount,
      first_vehicle_at: data[0]?.observed_at ?? null,
      last_vehicle_at: data.at(-1)?.observed_at ?? null
    },
    {
      onConflict: "camera_id,stat_date"
    }
  );

  if (upsertError) {
    console.error("LPR daily stat recompute write failed", upsertError.message);
  }
}
