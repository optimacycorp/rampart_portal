import { NextRequest, NextResponse } from "next/server";
import { readCallerMetadata, writeAddressAuditLog } from "@/lib/address/audit";
import { isAddressApiAuthorized, validateAddress } from "@/lib/address/geoapify";

export async function POST(request: NextRequest) {
  const caller = readCallerMetadata(request);

  if (!isAddressApiAuthorized(request)) {
    await writeAddressAuditLog({
      action: "validate",
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
    const body = (await request.json()) as { input?: string };
    const input = `${body.input ?? ""}`.trim();

    if (!input) {
      await writeAddressAuditLog({
        action: "validate",
        query_text: input,
        provider: "geoapify",
        result_count: 0,
        success: false,
        status_code: 400,
        caller_system: caller.callerSystem,
        client_ip: caller.clientIp,
        user_agent: caller.userAgent,
        request_headers: caller.requestHeaders,
        error_message: "input is required"
      });
      return NextResponse.json({ error: "input is required." }, { status: 400 });
    }

    const result = await validateAddress(input);

    if (!result) {
      await writeAddressAuditLog({
        action: "validate",
        query_text: input,
        provider: "geoapify",
        result_count: 0,
        success: false,
        status_code: 404,
        caller_system: caller.callerSystem,
        client_ip: caller.clientIp,
        user_agent: caller.userAgent,
        request_headers: caller.requestHeaders,
        error_message: "No matching address found within the configured service area."
      });
      return NextResponse.json(
        {
          input,
          validated: false,
          error: "No matching address found within the configured service area."
        },
        { status: 404 }
      );
    }

    await writeAddressAuditLog({
      action: "validate",
      query_text: input,
      provider: "geoapify",
      normalized_address: result.formatted,
      result_count: 1,
      success: true,
      status_code: 200,
      caller_system: caller.callerSystem,
      client_ip: caller.clientIp,
      user_agent: caller.userAgent,
      request_headers: caller.requestHeaders,
      response_summary: {
        source_id: result.sourceId,
        confidence: result.confidence,
        result_type: result.resultType,
        match_type: result.matchType
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    await writeAddressAuditLog({
      action: "validate",
      query_text: "",
      provider: "geoapify",
      result_count: 0,
      success: false,
      status_code: 500,
      caller_system: caller.callerSystem,
      client_ip: caller.clientIp,
      user_agent: caller.userAgent,
      request_headers: caller.requestHeaders,
      error_message: error instanceof Error ? error.message : "Unexpected address validation error."
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected address validation error."
      },
      { status: 500 }
    );
  }
}
