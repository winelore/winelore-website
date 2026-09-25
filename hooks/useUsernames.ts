"use client";

import { useState, useEffect, useMemo } from "react";
import { getUsernamesAction } from "@/app/userActions";

interface UsernameCacheEntry {
  name: string;
  expiresAt: number;
}

const usernameClientCache = new Map<string, UsernameCacheEntry>();
const usernameRequests = new Map<string, Promise<Record<string, string>>>();
const USERNAME_TTL_MS = 10 * 60 * 1000;
const FALLBACK_TTL_MS = 60 * 1000;

function loadUsernames(auids: string[]) {
  const key = JSON.stringify(auids);
  const existing = usernameRequests.get(key);
  if (existing) return existing;
  const request = getUsernamesAction(auids).finally(() => usernameRequests.delete(key));
  usernameRequests.set(key, request);
  return request;
}

export function useUsernames(auids: (string | number)[]) {
  const stableAuidsKey = useMemo(() => {
    const uniqueSorted = Array.from(new Set(auids.map(id => String(id)))).sort();
    return JSON.stringify(uniqueSorted);
  }, [auids]);

  const [usernames, setUsernames] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    const now = Date.now();
    for (const id of auids) {
      const strId = String(id);
      const cached = usernameClientCache.get(strId);
      if (cached && cached.expiresAt > now) {
        initial[strId] = cached.name;
      }
    }
    return initial;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const parsedAuids = JSON.parse(stableAuidsKey) as string[];
    if (parsedAuids.length === 0) {
      setLoading(false);
      return;
    }

    const now = Date.now();
    const missingAuids = parsedAuids.filter((id) => {
      const cached = usernameClientCache.get(id);
      return !cached || cached.expiresAt <= now;
    });

    // If everything is already cached:
    if (missingAuids.length === 0) {
      const cachedResults: Record<string, string> = {};
      for (const id of parsedAuids) {
        cachedResults[id] = usernameClientCache.get(id)?.name ?? id;
      }
      setUsernames(cachedResults);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    loadUsernames(missingAuids)
      .then((res) => {
        const currentTime = Date.now();
        for (const [id, name] of Object.entries(res)) {
          const isFallback = !name || name === id || name === `@${id}`;
          usernameClientCache.set(id, {
            name: name || id,
            expiresAt: currentTime + (isFallback ? FALLBACK_TTL_MS : USERNAME_TTL_MS),
          });
        }
        for (const id of missingAuids) {
          if (!usernameClientCache.has(id)) {
            usernameClientCache.set(id, {
              name: id,
              expiresAt: currentTime + FALLBACK_TTL_MS,
            });
          }
        }
        if (isMounted) {
          setUsernames((prev) => {
            const next = { ...prev };
            for (const id of parsedAuids) {
              next[id] = usernameClientCache.get(id)?.name ?? id;
            }
            return next;
          });
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error loading usernames:", err);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [stableAuidsKey]);

  return { usernames, loading };
}
