"use server"

import { axusSdk } from "@/lib/axusClient";
import { getAxusEndpoint } from "@/lib/graphqlEndpoint";

// Simple in-memory cache for display names
const displayNameCache = new Map<string, string>();

// Avatar photo URLs change when users update their photo, so unlike display
// names this cache expires. Failures are not cached: the next call retries.
const avatarUrlCache = new Map<string, { url: string | null; expiresAt: number }>();
const AVATAR_URL_TTL_MS = 10 * 60 * 1000;

function axusAvatarImageUrl(variationId: string): string {
  const base = getAxusEndpoint().replace(/\/graphql\/?$/, "");
  return `${base}/v1/variations/${encodeURIComponent(variationId)}/avatar`;
}

async function resolveAvatarUrl(auid: string): Promise<string | null> {
  const cached = avatarUrlCache.get(auid);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }
  let url: string | null = null;
  try {
    const res = await axusSdk.UserDetails({ auid });
    let varId = res?.defaultVariation?.variationId;
    if (!varId && res?.variations && res.variations.length > 0) {
      varId = res.variations[0].id;
    }
    if (varId) {
      const avatarRes = await axusSdk.Avatar({ variationId: varId });
      if (avatarRes?.avatar?.objectKey) {
        url = axusAvatarImageUrl(varId);
      }
    }
  } catch (error) {
    console.error(`Failed to fetch avatar for AUID ${auid}:`, error);
  }
  avatarUrlCache.set(auid, { url, expiresAt: Date.now() + AVATAR_URL_TTL_MS });
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
  
  const fetchPromises = uniqueAuids.map(async (auid) => {
    if (displayNameCache.has(auid)) {
      result[auid] = displayNameCache.get(auid)!;
      return;
    }
    
    try {
      const res = await axusSdk.UserDetails({ auid });
      const defaultUsername = res?.usernames?.defaultUsername;
      
      if (defaultUsername) {
        let varId = res.defaultVariation?.variationId;
        if (!varId && res.variations && res.variations.length > 0) {
          varId = res.variations[0].id;
        }

        let displayName = "";
        if (varId) {
          const nameRes = await axusSdk.VariationName({ variationId: varId });
          const nameText = nameRes?.name?.displayName?.trim();
          if (nameText && nameText !== "Default Variation") {
            displayName = nameText;
          } else {
            displayName = `@${defaultUsername}`;
          }
        } else {
          displayName = `@${defaultUsername}`;
        }

        displayNameCache.set(auid, displayName);
        result[auid] = displayName;
      } else {
        result[auid] = auid;
      }
    } catch (error) {
      console.error(`Failed to fetch user details for AUID ${auid}:`, error);
      result[auid] = auid;
    }
  });

  await Promise.all(fetchPromises);
  return result;
}
