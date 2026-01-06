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
  const hours = parseInt(searchParams.get("hours") || "24");
  
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
    
    // Simple query - just get all columns that exist
    const { data: logs, error: logsError } = await supabase
      .from("error_logs")
      .select("*")
      .gte("created_at", new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (logsError) {
      return NextResponse.json({ 
        error: "Database query failed", 
        details: logsError.message,
        hint: logsError.hint || null
      }, { status: 500 });
    }

    // Calculate simple stats
    const stats = {
      totalLogs: logs?.length || 0,
      timeRange: `Last ${hours} hours`,
      generatedAt: new Date().toISOString(),
    };

    // Return simplified response
    return NextResponse.json({
      status: "ok",
      stats,
      logs: logs || [],
    }, {
      headers: { "Cache-Control": "no-store" },
    });
    
  } catch (err) {
    return NextResponse.json({ 
      error: "Internal error", 
      message: err instanceof Error ? err.message : "Unknown error"
    }, { status: 500 });
  }
}
