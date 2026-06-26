"use server"

import { axusSdk } from "@/lib/axusClient";

// Simple in-memory cache for usernames
const usernameCache = new Map<string, string>();

export async function getUsernamesAction(auids: (string | number)[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const uniqueAuids = Array.from(new Set(auids.map(id => String(id))));
  
  const fetchPromises = uniqueAuids.map(async (auid) => {
    if (usernameCache.has(auid)) {
      result[auid] = usernameCache.get(auid)!;
      return;
    }
    
    try {
      const res = await axusSdk.Usernames({ auid });
      if (res?.usernames?.defaultUsername) {
        const username = res.usernames.defaultUsername;
        usernameCache.set(auid, username);
        result[auid] = username;
      } else {
        result[auid] = auid;
      }
    } catch (error) {
      console.error(`Failed to fetch username for AUID ${auid}:`, error);
      result[auid] = auid;
    }
  });

  await Promise.all(fetchPromises);
  return result;
}
