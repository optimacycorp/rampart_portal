import { NextRequest, NextResponse } from "next/server";
import { readCallerMetadata, writeAddressAuditLog } from "@/lib/address/audit";
import { isAddressApiAuthorized, searchAddresses } from "@/lib/address/geoapify";

export async function POST(request: NextRequest) {
  const caller = readCallerMetadata(request);

  if (!isAddressApiAuthorized(request)) {
    await writeAddressAuditLog({
      action: "search",
      query_text: "",
      provider: "geoapify",
      result_count: 0,
      success: false,
      status_code: 401,
      caller_system: caller.callerSystem,
      client_ip: caller.clientIp,
      user_agent: caller.userAgent,
      request_headers: caller.requestHeaders,
      error_message: "Unauthorized"
    });
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { query?: string; limit?: number };
    const query = `${body.query ?? ""}`.trim();
    const limit = Math.max(1, Math.min(Number(body.limit ?? 5), 10));

    if (!query) {
      await writeAddressAuditLog({
        action: "search",
        query_text: query,
        provider: "geoapify",
        result_count: 0,
        success: false,
        status_code: 400,
        caller_system: caller.callerSystem,
        client_ip: caller.clientIp,
        user_agent: caller.userAgent,
        request_headers: caller.requestHeaders,
        error_message: "query is required"
      });
      return NextResponse.json({ error: "query is required." }, { status: 400 });
    }

    const candidates = await searchAddresses(query, limit);
    await writeAddressAuditLog({
      action: "search",
      query_text: query,
      provider: "geoapify",
      normalized_address: candidates[0]?.formatted ?? null,
      result_count: candidates.length,
      success: true,
      status_code: 200,
      caller_system: caller.callerSystem,
      client_ip: caller.clientIp,
      user_agent: caller.userAgent,
      request_headers: caller.requestHeaders,
      response_summary: {
        top_candidate: candidates[0]?.formatted ?? null,
        top_place_id: candidates[0]?.placeId ?? null,
        limit
      }
    });

    return NextResponse.json({
      query,
      candidates
    });
  } catch (error) {
    await writeAddressAuditLog({
      action: "search",
      query_text: "",
      provider: "geoapify",
      result_count: 0,
      success: false,
      status_code: 500,
      caller_system: caller.callerSystem,
      client_ip: caller.clientIp,
      user_agent: caller.userAgent,
      request_headers: caller.requestHeaders,
      error_message: error instanceof Error ? error.message : "Unexpected address search error."
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected address search error."
      },
      { status: 500 }
    );
  }
}
