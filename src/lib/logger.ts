// Logger utility for Buildr 3.0
// Sends logs to /api/log endpoint

type LogType = 
  | "api_call"
  | "api_error" 
  | "stream_error"
  | "stream_interrupted"
  | "build_start"
  | "build_success"
  | "build_error"
  | "code_extraction_failed"
  | "ui_error"
  | "network_error"
  | "recovery_attempted"
  | "recovery_success"
  | "user_action";

type Severity = "info" | "warning" | "error" | "critical";

interface LogData {
  type: LogType;
  severity?: Severity;
  message?: string;
  stack?: string;
  userId?: string;
  projectId?: string;
  endpoint?: string;
  requestDurationMs?: number;
  requestPayload?: Record<string, unknown>;
  responseStatus?: number;
  responseBody?: string;
  prompt?: string;
  bytesReceived?: number;
  lastValidChunk?: string;
  codeLength?: number;
  metadata?: Record<string, unknown>;
}

// Generate session ID for grouping related logs
const getSessionId = (): string => {
  if (typeof window === "undefined") return "server";
  
  let sessionId = sessionStorage.getItem("buildr_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    sessionStorage.setItem("buildr_session_id", sessionId);
  }
  return sessionId;
};

// Main log function
export async function log(data: LogData): Promise<void> {
  const sessionId = getSessionId();
  
  // Also log to console in development
  const consoleMethod = data.severity === "error" || data.severity === "critical" 
    ? console.error 
    : data.severity === "warning" 
      ? console.warn 
      : console.log;
  
  consoleMethod(`[Buildr ${data.type}]`, data.message, data);

  // Send to API (fire and forget - don't block on logging)
  try {
    fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        sessionId,
        severity: data.severity || "info",
      }),
    }).catch(() => {
      // Silently fail - logging should never break the app
    });
  } catch {
    // Silently fail
  }
}

// Convenience methods
export const logger = {
  // Info level
  info: (type: LogType, message: string, metadata?: Record<string, unknown>) =>
    log({ type, severity: "info", message, metadata }),

  // Warning level
  warn: (type: LogType, message: string, metadata?: Record<string, unknown>) =>
    log({ type, severity: "warning", message, metadata }),

  // Error level
  error: (type: LogType, message: string, error?: Error, metadata?: Record<string, unknown>) =>
    log({
      type,
      severity: "error",
      message,
      stack: error?.stack,
      metadata: { ...metadata, errorName: error?.name },
    }),

  // Critical level
  critical: (type: LogType, message: string, error?: Error, metadata?: Record<string, unknown>) =>
    log({
      type,
      severity: "critical",
      message,
      stack: error?.stack,
      metadata: { ...metadata, errorName: error?.name },
    }),

  // API call logging
  apiCall: (endpoint: string, durationMs: number, status: number, metadata?: Record<string, unknown>) =>
    log({
      type: "api_call",
      severity: status >= 400 ? "error" : "info",
      message: `${endpoint} - ${status} (${durationMs}ms)`,
      endpoint,
      requestDurationMs: durationMs,
      responseStatus: status,
      metadata,
    }),

  // Build logging
  buildStart: (prompt: string, projectId?: string) =>
    log({
      type: "build_start",
      severity: "info",
      message: "Build started",
      prompt,
      projectId,
    }),

  buildSuccess: (prompt: string, codeLength: number, durationMs: number, projectId?: string) =>
    log({
      type: "build_success",
      severity: "info",
      message: "Build completed successfully",
      prompt,
      codeLength,
      requestDurationMs: durationMs,
      projectId,
    }),

  buildError: (
    prompt: string,
    error: Error | string,
    bytesReceived: number,
    lastChunk: string,
    durationMs: number,
    projectId?: string
  ) =>
    log({
      type: "build_error",
      severity: "error",
      message: typeof error === "string" ? error : error.message,
      stack: typeof error === "object" ? error.stack : undefined,
      prompt,
      bytesReceived,
      lastValidChunk: lastChunk,
      requestDurationMs: durationMs,
      projectId,
    }),

  // Stream errors
  streamError: (message: string, bytesReceived: number, lastChunk: string) =>
    log({
      type: "stream_error",
      severity: "error",
      message,
      bytesReceived,
      lastValidChunk: lastChunk,
    }),

  streamInterrupted: (bytesReceived: number, lastChunk: string, reason?: string) =>
    log({
      type: "stream_interrupted",
      severity: "warning",
      message: reason || "Stream interrupted unexpectedly",
      bytesReceived,
      lastValidChunk: lastChunk,
    }),

  // Code extraction
  codeExtractionFailed: (responseLength: number, responsePreview: string) =>
    log({
      type: "code_extraction_failed",
      severity: "warning",
      message: `Failed to extract code from response (${responseLength} chars)`,
      bytesReceived: responseLength,
      lastValidChunk: responsePreview,
    }),

  // Recovery
  recoveryAttempted: (source: string) =>
    log({
      type: "recovery_attempted",
      severity: "info",
      message: `Recovery attempted from ${source}`,
      metadata: { source },
    }),

  recoverySuccess: (source: string, codeLength: number) =>
    log({
      type: "recovery_success",
      severity: "info",
      message: `Recovery successful from ${source}`,
      codeLength,
      metadata: { source },
    }),

  // User actions
  userAction: (action: string, metadata?: Record<string, unknown>) =>
    log({
      type: "user_action",
      severity: "info",
      message: action,
      metadata,
    }),
};

export default logger;
