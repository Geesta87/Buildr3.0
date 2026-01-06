import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client lazily to avoid build-time errors
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    return null;
  }
  
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      // Silently fail if DB not configured - logging shouldn't break the app
      return NextResponse.json({ success: true, note: "logging_disabled" });
    }
    
    const body = await request.json();
    
    const {
      type,
      severity = "error",
      message,
      stack,
      userId,
      projectId,
      sessionId,
      endpoint,
      requestDurationMs,
      requestPayload,
      responseStatus,
      responseBody,
      prompt,
      bytesReceived,
      lastValidChunk,
      codeLength,
      metadata,
    } = body;

    // Get client info from headers
    const userAgent = request.headers.get("user-agent") || "";
    const url = request.headers.get("referer") || "";

    // Insert log into Supabase
    const { error } = await supabase.from("error_logs").insert({
      type,
      severity,
      message,
      stack,
      user_id: userId || null,
      project_id: projectId || null,
      session_id: sessionId,
      endpoint,
      request_duration_ms: requestDurationMs,
      request_payload: requestPayload,
      response_status: responseStatus,
      response_body: responseBody?.substring(0, 5000), // Limit size
      prompt: prompt?.substring(0, 2000), // Limit size
      bytes_received: bytesReceived,
      last_valid_chunk: lastValidChunk?.substring(0, 1000), // Limit size
      code_length: codeLength,
      user_agent: userAgent,
      url,
      metadata,
    });

    if (error) {
      console.error("Failed to insert log:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Log endpoint error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
