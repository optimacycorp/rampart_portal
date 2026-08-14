import { NextRequest, NextResponse } from "next/server";
import {
  authenticateLprCamera,
  insertLprEvent,
  normalizeLprPayload,
  readLprCallerMetadata,
  recomputeLprDailyStats,
  touchLprCameraLastSeen,
  writeLprIngestAuditLog
} from "@/lib/lpr-ingest";

export async function POST(request: NextRequest) {
  const caller = readLprCallerMetadata(request);
  let payload: Record<string, unknown> = {};

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    await writeLprIngestAuditLog({
      action: "ingest",
      success: false,
      status_code: 400,
      caller_system: caller.callerSystem,
      client_ip: caller.clientIp,
      user_agent: caller.userAgent,
      request_headers: caller.requestHeaders,
      error_message: "Invalid JSON payload"
    });
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const authResult = await authenticateLprCamera(request, payload);

  if (!authResult.ok || !authResult.camera?.active) {
    await writeLprIngestAuditLog({
      camera_id: authResult.camera?.id ?? null,
      action: "ingest",
      success: false,
      status_code: 401,
      caller_system: caller.callerSystem,
      client_ip: caller.clientIp,
      user_agent: caller.userAgent,
      request_headers: caller.requestHeaders,
      request_payload: payload,
      error_message: authResult.camera?.active === false ? "Camera is inactive" : "Unauthorized camera ingest"
    });
    return NextResponse.json({ error: "Unauthorized camera ingest." }, { status: 401 });
  }

  try {
    const event = normalizeLprPayload(authResult.camera, payload);
    const eventId = await insertLprEvent(event);
    await Promise.all([
      touchLprCameraLastSeen(event.cameraId, event.observedAt),
      recomputeLprDailyStats(event.cameraId, event.observedAt)
    ]);

    await writeLprIngestAuditLog({
      camera_id: event.cameraId,
      action: "ingest",
      success: true,
      status_code: 200,
      caller_system: caller.callerSystem,
      client_ip: caller.clientIp,
      user_agent: caller.userAgent,
      request_headers: caller.requestHeaders,
      request_payload: payload,
      response_summary: {
        auth_mode: authResult.authMode,
        camera_name: event.cameraName,
        event_id: eventId,
        observed_at: event.observedAt,
        plate_text: event.plateText
      }
    });

    return NextResponse.json({
      ok: true,
      eventId,
      cameraId: event.cameraId,
      cameraName: event.cameraName,
      authMode: authResult.authMode,
      observedAt: event.observedAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected LPR ingest error.";

    await writeLprIngestAuditLog({
      camera_id: authResult.camera.id,
      action: "ingest",
      success: false,
      status_code: 500,
      caller_system: caller.callerSystem,
      client_ip: caller.clientIp,
      user_agent: caller.userAgent,
      request_headers: caller.requestHeaders,
      request_payload: payload,
      error_message: message
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
