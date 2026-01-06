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

export async function GET(request: NextRequest) {
  // Check for debug key
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const limit = parseInt(searchParams.get("limit") || "50");
  const type = searchParams.get("type"); // Filter by type
  const severity = searchParams.get("severity"); // Filter by severity
  const hours = parseInt(searchParams.get("hours") || "24"); // Time range
  
  // Verify debug key
  const debugKey = process.env.DEBUG_API_KEY;
  if (!debugKey || key !== debugKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }
    
    // Build query
    let query = supabase
      .from("error_logs")
      .select("*")
      .gte("created_at", new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (type) {
      query = query.eq("type", type);
    }
    if (severity) {
      query = query.eq("severity", severity);
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      return NextResponse.json({ error: logsError.message }, { status: 500 });
    }

    // Get stats
    const { data: stats } = await supabase
      .from("error_logs")
      .select("type, severity")
      .gte("created_at", new Date(Date.now() - hours * 60 * 60 * 1000).toISOString());

    // Calculate aggregated stats
    const statsSummary = {
      totalLogs: stats?.length || 0,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      timeRange: `Last ${hours} hours`,
    };

    stats?.forEach((log) => {
      statsSummary.byType[log.type] = (statsSummary.byType[log.type] || 0) + 1;
      statsSummary.bySeverity[log.severity] = (statsSummary.bySeverity[log.severity] || 0) + 1;
    });

    // Get recent build performance
    const { data: buildLogs } = await supabase
      .from("error_logs")
      .select("request_duration_ms, code_length, bytes_received, type")
      .in("type", ["build_success", "build_error", "api_call"])
      .gte("created_at", new Date(Date.now() - hours * 60 * 60 * 1000).toISOString());

    const buildStats = {
      totalBuilds: buildLogs?.filter(l => l.type === "build_success" || l.type === "build_error").length || 0,
      successfulBuilds: buildLogs?.filter(l => l.type === "build_success").length || 0,
      failedBuilds: buildLogs?.filter(l => l.type === "build_error").length || 0,
      avgDurationMs: 0,
      avgCodeLength: 0,
    };

    const durations = buildLogs?.filter(l => l.request_duration_ms).map(l => l.request_duration_ms) || [];
    const codeLengths = buildLogs?.filter(l => l.code_length).map(l => l.code_length) || [];
    
    if (durations.length > 0) {
      buildStats.avgDurationMs = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    }
    if (codeLengths.length > 0) {
      buildStats.avgCodeLength = Math.round(codeLengths.reduce((a, b) => a + b, 0) / codeLengths.length);
    }

    // Format response for easy reading
    const response = {
      summary: {
        ...statsSummary,
        builds: buildStats,
        generatedAt: new Date().toISOString(),
      },
      recentErrors: logs?.filter(l => l.severity === "error" || l.severity === "critical").slice(0, 10).map(log => ({
        id: log.id,
        time: log.created_at,
        type: log.type,
        severity: log.severity,
        message: log.message,
        endpoint: log.endpoint,
        responseStatus: log.response_status,
        durationMs: log.request_duration_ms,
        bytesReceived: log.bytes_received,
        prompt: log.prompt?.substring(0, 200) + (log.prompt?.length > 200 ? "..." : ""),
        lastChunk: log.last_valid_chunk?.substring(0, 300),
        metadata: log.metadata,
      })),
      allLogs: logs?.map(log => ({
        id: log.id,
        time: log.created_at,
        type: log.type,
        severity: log.severity,
        message: log.message,
        endpoint: log.endpoint,
        responseStatus: log.response_status,
        durationMs: log.request_duration_ms,
        codeLength: log.code_length,
        bytesReceived: log.bytes_received,
      })),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Debug endpoint error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
