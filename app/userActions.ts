"use server"

import { resolveAvatarUrl as coreResolveAvatarUrl, resolveDisplayName } from "@winelore/core/auth";
import { getAxusConfig } from "@/lib/axusConfig";

// Simple in-memory cache for display names
const displayNameCache = new Map<string, string>();

// Avatar photo URLs change when users update their photo. Missing photos and
// transient lookup failures retry sooner than a known photo URL.
const avatarUrlCache = new Map<string, { url: string | null; expiresAt: number }>();
const AVATAR_URL_TTL_MS = 10 * 60 * 1000;
const MISSING_AVATAR_TTL_MS = 60 * 1000;

async function resolveAvatarUrl(auid: string): Promise<string | null> {
  const cached = avatarUrlCache.get(auid);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }
  const config = getAxusConfig();
  const url = await coreResolveAvatarUrl(config, auid);
  avatarUrlCache.set(auid, { url, expiresAt: Date.now() + (url ? AVATAR_URL_TTL_MS : MISSING_AVATAR_TTL_MS) });
  return url;
}

export async function getAvatarUrlsAction(auids: (string | number)[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  const uniqueAuids = Array.from(new Set(auids.map(id => String(id))));

  await Promise.all(
    uniqueAuids.map(async (auid) => {
      result[auid] = await resolveAvatarUrl(auid);
    }),
  );
  return result;
}

export async function getUsernamesAction(auids: (string | number)[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const uniqueAuids = Array.from(new Set(auids.map(id => String(id))));
  const config = getAxusConfig();

  const fetchPromises = uniqueAuids.map(async (auid) => {
    if (displayNameCache.has(auid)) {
      result[auid] = displayNameCache.get(auid)!;
      return;
    }

    try {
      const displayName = await resolveDisplayName(config, auid, auid);
      // An AXUS ID outage falls back to @AUID. Let the next visit retry it.
      if (displayName !== `@${auid}` && displayName !== auid) {
        displayNameCache.set(auid, displayName);
      }
      result[auid] = displayName;
    } catch (error) {
      console.error(`Failed to fetch user details for AUID ${auid}:`, error);
      result[auid] = auid;
    }
  });

  await Promise.all(fetchPromises);
  return result;
}
