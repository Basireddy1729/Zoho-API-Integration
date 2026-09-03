import crypto from "crypto";
import { env } from "../config/env";
import { prisma } from "../db/prisma";

const TOKEN_REFRESH_SKEW_MS = 60_000;
const STATE_TTL_MS = 10 * 60_000;

interface PendingOAuthState {
  adminUserId: string;
  expiresAt: number;
}

// In-memory CSRF-state store for the admin-initiated OAuth setup flow. Zoho's callback is a
// plain browser redirect (no Authorization header reaches us), so this `state` round-trip is
// what proves the callback belongs to an admin request we issued, not a forged one.
const pendingOAuthStates = new Map<string, PendingOAuthState>();

export function createPendingOAuthState(adminUserId: string): string {
  const state = crypto.randomUUID();
  pendingOAuthStates.set(state, { adminUserId, expiresAt: Date.now() + STATE_TTL_MS });
  return state;
}

export function consumePendingOAuthState(state: string): PendingOAuthState | null {
  const entry = pendingOAuthStates.get(state);
  pendingOAuthStates.delete(state);
  if (!entry || entry.expiresAt < Date.now()) {
    return null;
  }
  return entry;
}

export function getZohoAuthorizationUrl(scope: string, state: string): string {
  const url = new URL("/oauth/v2/auth", env.zoho.accountsBaseUrl);
  url.searchParams.set("client_id", env.zoho.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", env.zoho.redirectUri);
  url.searchParams.set("scope", scope);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

interface ZohoTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  error?: string;
}

/** One-time exchange of the admin-granted authorization code for the service account's tokens. */
export async function exchangeCodeForToken(code: string): Promise<void> {
  const url = new URL("/oauth/v2/token", env.zoho.accountsBaseUrl);
  url.searchParams.set("grant_type", "authorization_code");
  url.searchParams.set("client_id", env.zoho.clientId);
  url.searchParams.set("client_secret", env.zoho.clientSecret);
  url.searchParams.set("redirect_uri", env.zoho.redirectUri);
  url.searchParams.set("code", code);

  const response = await fetch(url.toString(), { method: "POST" });
  const data = (await response.json()) as ZohoTokenResponse;

  const refreshToken = data.refresh_token;
  if (!response.ok || data.error || !refreshToken) {
    throw new Error(`Zoho token exchange failed: ${data.error ?? response.statusText}`);
  }

  await persistToken({ ...data, refresh_token: refreshToken });
}

/**
 * Exchanges a Zoho "Self Client" grant code for tokens. Self Client codes are generated
 * directly in the API Console (no browser redirect involved), so — unlike the authorization-
 * code flow above — no redirect_uri is sent; Zoho rejects the exchange if one is included for
 * a self-client-issued code.
 */
export async function exchangeSelfClientCode(code: string): Promise<void> {
  const url = new URL("/oauth/v2/token", env.zoho.accountsBaseUrl);
  url.searchParams.set("grant_type", "authorization_code");
  url.searchParams.set("client_id", env.zoho.clientId);
  url.searchParams.set("client_secret", env.zoho.clientSecret);
  url.searchParams.set("code", code);

  const response = await fetch(url.toString(), { method: "POST" });
  const data = (await response.json()) as ZohoTokenResponse;

  const refreshToken = data.refresh_token;
  if (!response.ok || data.error || !refreshToken) {
    throw new Error(`Zoho token exchange failed: ${data.error ?? response.statusText}`);
  }

  await persistToken({ ...data, refresh_token: refreshToken });
}

async function refreshAccessToken(refreshToken: string): Promise<ZohoTokenResponse> {
  const url = new URL("/oauth/v2/token", env.zoho.accountsBaseUrl);
  url.searchParams.set("grant_type", "refresh_token");
  url.searchParams.set("client_id", env.zoho.clientId);
  url.searchParams.set("client_secret", env.zoho.clientSecret);
  url.searchParams.set("refresh_token", refreshToken);

  const response = await fetch(url.toString(), { method: "POST" });
  const data = (await response.json()) as ZohoTokenResponse;

  if (!response.ok || data.error) {
    throw new Error(`Zoho token refresh failed: ${data.error ?? response.statusText}`);
  }

  return data;
}

async function persistToken(data: ZohoTokenResponse & { refresh_token: string }): Promise<void> {
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  const existing = await prisma.zohoOAuthToken.findFirst();

  if (existing) {
    await prisma.zohoOAuthToken.update({
      where: { id: existing.id },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
        scope: data.scope,
      },
    });
  } else {
    await prisma.zohoOAuthToken.create({
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
        scope: data.scope,
      },
    });
  }
}

/** Returns a valid access token for the shared Zoho service account, refreshing it if it's expiring soon. */
export async function getValidServiceAccountToken(): Promise<string> {
  const record = await prisma.zohoOAuthToken.findFirst();
  if (!record) {
    throw new Error("Zoho service account is not connected yet. An admin must complete the OAuth setup first.");
  }

  const isExpiringSoon = record.expiresAt.getTime() - Date.now() < TOKEN_REFRESH_SKEW_MS;
  if (!isExpiringSoon) {
    return record.accessToken;
  }

  const refreshed = await refreshAccessToken(record.refreshToken);
  await prisma.zohoOAuthToken.update({
    where: { id: record.id },
    data: {
      accessToken: refreshed.access_token,
      expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
      scope: refreshed.scope,
    },
  });

  return refreshed.access_token;
}

export async function isZohoConnected(): Promise<boolean> {
  const record = await prisma.zohoOAuthToken.findFirst();
  return record !== null;
}
