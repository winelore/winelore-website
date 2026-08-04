"use server"

import { axusSdk } from "@/lib/axusClient";

// Simple in-memory cache for display names
const displayNameCache = new Map<string, string>();

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
      
      const displayName = defaultUsername ? `@${defaultUsername}` : auid;
      displayNameCache.set(auid, displayName);
      result[auid] = displayName;
    } catch (error) {
      console.error(`Failed to fetch user details for AUID ${auid}:`, error);
      result[auid] = auid;
    }
  });

  await Promise.all(fetchPromises);
  return result;
}
