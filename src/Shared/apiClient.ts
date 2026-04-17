/* eslint-disable @typescript-eslint/no-explicit-any */
// src/Shared/apiClient.ts
// Centralized API client so every page calls the backend consistently,
// regardless of where the frontend is hosted (Amplify, localhost, etc).

/**
 * Used when you deploy on Amplify:
 * - Set VITE_API_BASE_URL in Amplify env vars (ex: https://your-api.example.com)
 *
 * Local fallback:
 * - If VITE_API_BASE_URL is not set, we use the hardcoded default below.
 */

// When this will be used: Base URL for all API requests in production builds.
const apiBaseUrlValue =
  (import.meta as any)?.env?.VITE_API_BASE_URL?.trim?.() ||
  "http://localhost:5000"
  //"https://d1ge6vvg3l32dq.cloudfront.net";


/**
 * When this will be used: Retrieves the current auth token from storage.
 * @returns string token (empty string if missing)
 */
function getAuthTokenValue(): string {
  return String(localStorage.getItem("authToken") ?? "").trim();
}

// File: src/Shared/apiClient.ts

// This helper returns the base API URL used by all requests.
// Inputs: none
// Output: string API base URL
// Purpose: keep the backend URL centralized for easier dev/prod switching.
export function getApiBaseUrl(): string {
  return apiBaseUrlValue;
}

/**
 * When this will be used: Safely builds request headers without TypeScript unions.
 * This avoids the TS error where Authorization can be inferred as undefined.
 *
 * @param extraHeadersValue - Extra headers to add/override
 * @returns Record<string, string> for fetch headers
 */
function buildHeadersValue(extraHeadersValue: Record<string, string> = {}): Record<string, string> {
  // When this will be used: Base headers for JSON requests.
  const headersValue: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeadersValue,
  };

  // When this will be used: Add Authorization only when a token exists.
  const tokenValue = getAuthTokenValue();
  if (tokenValue) {
    headersValue.Authorization = `Bearer ${tokenValue}`;
  }

  return headersValue;
}

/**
 * When this will be used: Builds a full URL safely, handling missing/extra slashes.
 * @param pathValue - API path like "/api/v1/accounts"
 * @returns Full URL string
 */
function buildUrlValue(pathValue: string): string {
  const baseValue = apiBaseUrlValue.replace(/\/+$/, "");
  const pathCleanValue = `/${String(pathValue ?? "").replace(/^\/+/, "")}`;
  return `${baseValue}${pathCleanValue}`;
}

/**
 * When this will be used: Attempts to parse JSON response without crashing on empty/non-JSON bodies.
 * @param resValue - Fetch response
 * @returns Parsed JSON or null
 */
async function parseJsonSafeValue(resValue: Response): Promise<unknown | null> {
  const contentTypeValue = resValue.headers.get("content-type") || "";
  if (!contentTypeValue.toLowerCase().includes("application/json")) return null;

  try {
    return await resValue.json();
  } catch {
    return null;
  }
}

/**
 * When this will be used: Extracts a useful error message from the response.
 * @param resValue - Fetch response
 * @returns Error string
 */
async function getErrorMessageValue(resValue: Response): Promise<string> {
  const jsonValue = (await parseJsonSafeValue(resValue)) as any;

  // Common API patterns:
  // { error: "..." } or { message: "..." } or { detail: "..." }
  const candidateValue =
    (jsonValue && (jsonValue.error || jsonValue.message || jsonValue.detail)) ?? null;

  if (candidateValue) return String(candidateValue);

  try {
    const textValue = await resValue.text();
    return textValue || `Request failed: ${resValue.status}`;
  } catch {
    return `Request failed: ${resValue.status}`;
  }
}

/**
 * When this will be used: The core request helper used by get/post/put/delete.
 * @param methodValue - HTTP method
 * @param pathValue - API path
 * @param bodyValue - Optional request body
 * @param extraHeadersValue - Optional extra headers
 * @returns Parsed JSON typed as T (or null if no JSON body)
 */
async function apiRequestValue<T>(
  methodValue: "GET" | "POST" | "PUT" | "DELETE",
  pathValue: string,
  bodyValue?: unknown,
  extraHeadersValue: Record<string, string> = {}
): Promise<T> {
  const urlValue = buildUrlValue(pathValue);

  // When this will be used: Fetch init options.
  const requestInitValue: RequestInit = {
    method: methodValue,
    headers: buildHeadersValue(extraHeadersValue),
  };

  // Only attach a body for non-GET requests and when a body is provided.
  if (methodValue !== "GET" && bodyValue !== undefined) {
    requestInitValue.body = JSON.stringify(bodyValue);
  }

  const resValue = await fetch(urlValue, requestInitValue);

  if (!resValue.ok) {
    const messageValue = await getErrorMessageValue(resValue);
    throw new Error(messageValue);
  }

  const dataValue = await parseJsonSafeValue(resValue);

  // For endpoints that return 204 or empty body, return null-ish as T safely.
  return (dataValue ?? (null as unknown)) as T;
}

export const apiClient = {
  /**
   * GET helper
   * @param pathValue - API path
   * @returns T parsed from JSON response
   */
  async get<T>(pathValue: string): Promise<T> {
    return apiRequestValue<T>("GET", pathValue);
  },

  /**
   * POST helper
   * @param pathValue - API path
   * @param bodyValue - Request body object
   * @returns T parsed from JSON response
   */
  async post<T>(pathValue: string, bodyValue: unknown): Promise<T> {
    return apiRequestValue<T>("POST", pathValue, bodyValue);
  },

  /**
   * PUT helper
   * @param pathValue - API path
   * @param bodyValue - Request body object
   * @returns T parsed from JSON response
   */
  async put<T>(pathValue: string, bodyValue: unknown): Promise<T> {
    return apiRequestValue<T>("PUT", pathValue, bodyValue);
  },

  /**
   * DELETE helper
   * @param pathValue - API path
   * @returns T parsed from JSON response (or null if empty)
   */
  async delete<T>(pathValue: string): Promise<T> {
    return apiRequestValue<T>("DELETE", pathValue);
  },

  /**
   * When this will be used: Helpful for debugging / logging current base URL.
   * @returns API base URL currently in use
   */
  getBaseUrl(): string {
    return apiBaseUrlValue;
  },
};