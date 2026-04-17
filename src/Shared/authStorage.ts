// src/Shared/authStorage.ts
// Shared auth helpers so Login/Register/Layout/Account all use the same token logic.

import { apiClient } from "./apiClient";
import type { AuthLoginResponse, AuthMeResponse } from "./types";

const authTokenStorageKeyValue = "authToken";

/**
 * Reads the current auth token from localStorage.
 * Inputs: none
 * Output: string
 * Purpose: single source of truth for the front-end auth token.
 */
export function getStoredAuthTokenValue(): string {
  return String(localStorage.getItem(authTokenStorageKeyValue) ?? "").trim();
}

/**
 * Persists the current auth token.
 * Inputs: tokenValue string
 * Output: none
 * Purpose: save login/register results in the exact key the API client expects.
 */
export function setStoredAuthTokenValue(tokenValue: string): void {
  const safeTokenValue = String(tokenValue ?? "").trim();

  if (!safeTokenValue) {
    localStorage.removeItem(authTokenStorageKeyValue);
    return;
  }

  localStorage.setItem(authTokenStorageKeyValue, safeTokenValue);
}

/**
 * Clears the saved auth token.
 * Inputs: none
 * Output: none
 * Purpose: logout helper used across multiple pages.
 */
export function clearStoredAuthTokenValue(): void {
  localStorage.removeItem(authTokenStorageKeyValue);
}

/**
 * Stores an auth response from login/register.
 * Inputs: responseValue
 * Output: none
 * Purpose: keep token persistence code out of page components.
 */
export function saveAuthResponseValue(responseValue: AuthLoginResponse): void {
  setStoredAuthTokenValue(responseValue.token);
}

/**
 * Checks whether the app currently has a saved auth token.
 * Inputs: none
 * Output: boolean
 * Purpose: lightweight UI state for nav/account/login pages.
 */
export function hasStoredAuthTokenValue(): boolean {
  return getStoredAuthTokenValue().length > 0;
}

/**
 * Loads the signed-in user through the existing /api/auth/me route.
 * Inputs: none
 * Output: AuthMeResponse
 * Purpose: shared helper for Account + auth-aware UI.
 */
export async function loadCurrentUserValue(): Promise<AuthMeResponse> {
  return apiClient.get<AuthMeResponse>("/api/auth/me");
}

/**
 * Navigates to another page in the static multi-page app.
 * Inputs: hrefValue string
 * Output: none
 * Purpose: keep redirects readable and consistent.
 */
export function navigateToValue(hrefValue: string): void {
  window.location.href = hrefValue;
}

/**
 * Logs the current user out on the front-end.
 * Inputs: optional redirect path
 * Output: none
 * Purpose: the dev backend bypass does not expose a logout endpoint, so the token is the whole session.
 */
export function logoutValue(redirectHrefValue = "./Login.html"): void {
  clearStoredAuthTokenValue();
  navigateToValue(redirectHrefValue);
}
