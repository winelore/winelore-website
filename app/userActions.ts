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
      
      if (defaultUsername) {
        // Find default variation or fallback to first variation
        let defaultVar = null;
        if (res.defaultVariation?.variationId) {
          defaultVar = res.variations?.find(v => v.id === res.defaultVariation?.variationId);
        }
        if (!defaultVar && res.variations && res.variations.length > 0) {
          defaultVar = res.variations[0];
        }

        const fName = defaultVar?.firstName?.trim();
        const lName = defaultVar?.lastName?.trim();
        const isPlaceholder = fName === "Default" && lName === "Variation";

        let displayName = "";
        if ((fName || lName) && !isPlaceholder) {
          displayName = [fName, lName].filter(Boolean).join(" ");
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
