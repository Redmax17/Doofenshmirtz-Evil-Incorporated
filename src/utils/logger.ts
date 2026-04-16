/*
    This File Is Used To Log Errors That Occur Accross The Site
*/

// Defines The Severity Of The Log
type LogLevel = "info" | "warn" | "error";

// Interface For Log Structure
interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: string; // Where The Error Came From
    details?: unknown; // The Raw Error Data
}

// Cap For Preventing Over Storage
const MAX_LOGS = 100;

// Key For JSON Storage
const LOG_KEY = "app_logs";

// This Function Writes A Log Entry Into LocalStoage And The Console
function writeLog(level: LogLevel, message: string, context?: string, details?: unknown) {
    const entry: LogEntry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        context,
        details,
    };

    if (level === "error") console.error('[${context}]', message, details);
    if (level === "warn") console.warn('[${context}]', message, details);
    if (level === "info") console.log('[${context}]', message, details);

    // Save To LocalStorage
    try {
        const existing = JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]") as LogEntry[];
        const updated = [entry, ...existing].slice(0, MAX_LOGS); // Keeps Only The Latest Logs
        localStorage.setItem(LOG_KEY, JSON.stringify(updated));
    } catch {
        console.error("Logger Failed To Write To LocalStorage");
    }
}

// Logger Functions
export const logger = {
    // For Info
    info: (message: string, context?: string, details?: unknown) =>
        writeLog("info", message, context, details),

    // For Warn
    warn: (message: string, context?: string, details?: unknown) =>
        writeLog("warn", message, context, details),

    // For Error
    error: (message: string, context?: string, details?: unknown) =>
        writeLog("error", message, context, details),

    // Returns All Stored Logs
    getLogs: (): LogEntry[] => {
        try {
            return JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]");
        } catch {
            return [];
        }
    },

    clearLogs: () => localStorage.removeItem(LOG_KEY),
}