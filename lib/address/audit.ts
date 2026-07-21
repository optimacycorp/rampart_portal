import { getSupabaseAdminClient } from "@/lib/supabase";

type AddressAuditLogPayload = {
  action: "search" | "validate";
  query_text: string;
  provider: string;
  normalized_address?: string | null;
  result_count?: number | null;
  success: boolean;
  status_code: number;
  caller_system?: string | null;
  client_ip?: string | null;
  user_agent?: string | null;
  request_headers?: Record<string, string>;
  response_summary?: Record<string, unknown> | null;
  error_message?: string | null;
};

export async function writeAddressAuditLog(payload: AddressAuditLogPayload) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  const { error } = await supabase.from("address_audit_log").insert({
    ...payload,
    request_headers: payload.request_headers ?? null,
    response_summary: payload.response_summary ?? null
  });

  if (error) {
    console.error("Address audit log write failed", error);
  }
}

export function readCallerMetadata(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const clientIp =
    forwardedFor.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    null;

  return {
    callerSystem:
      request.headers.get("x-caller-system") ||
      request.headers.get("x-client-app") ||
      request.headers.get("origin") ||
      null,
    clientIp,
    userAgent: request.headers.get("user-agent") || null,
    requestHeaders: {
      origin: request.headers.get("origin") || "",
      referer: request.headers.get("referer") || "",
      host: request.headers.get("host") || "",
      "x-forwarded-for": forwardedFor,
      "x-caller-system": request.headers.get("x-caller-system") || "",
      "x-client-app": request.headers.get("x-client-app") || ""
    }
  };
}
