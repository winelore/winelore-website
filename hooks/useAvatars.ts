"use client";

import { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import Cookies from "js-cookie";
import { getAvatarUrlsAction } from "@/app/userActions";

const avatarClientCache = new Map<string, { url: string | null; expiresAt: number }>();
const avatarRequests = new Map<string, Promise<Record<string, string | null>>>();
const CLIENT_TTL_MS = 10 * 60 * 1000;

function loadAvatars(auids: string[]) {
  const key = JSON.stringify(auids);
  const existing = avatarRequests.get(key);
  if (existing) return existing;
  const request = getAvatarUrlsAction(auids).finally(() => avatarRequests.delete(key));
  avatarRequests.set(key, request);
  return request;
}

export function useAvatars(auids: (string | number)[]) {
  const stableAuidsKey = useMemo(() => {
    const uniqueSorted = Array.from(new Set(auids.map(id => String(id)))).sort();
    return JSON.stringify(uniqueSorted);
  }, [auids]);

  const [avatars, setAvatars] = useState<Record<string, string | null>>(() => {
    const initial: Record<string, string | null> = {};
    const now = Date.now();
    for (const id of auids) {
      const strId = String(id);
      const cached = avatarClientCache.get(strId);
      if (cached && cached.expiresAt > now) {
        initial[strId] = cached.url;
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
      const cached = avatarClientCache.get(id);
      return !cached || cached.expiresAt <= now;
    });

    // If all requested avatars are already in the client cache and unexpired
    if (missingAuids.length === 0) {
      const cachedResults: Record<string, string | null> = {};
      for (const id of parsedAuids) {
        cachedResults[id] = avatarClientCache.get(id)?.url ?? null;
      }
      setAvatars(cachedResults);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    loadAvatars(missingAuids)
      .then((res) => {
        const fetchedAt = Date.now();
        for (const [id, url] of Object.entries(res)) {
          avatarClientCache.set(id, { url, expiresAt: fetchedAt + (url ? CLIENT_TTL_MS : 60 * 1000) });
        }
        if (isMounted) {
          setAvatars((prev) => {
            const next = { ...prev };
            for (const id of parsedAuids) {
              next[id] = avatarClientCache.get(id)?.url ?? null;
            }
            return next;
          });
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error loading avatars:", err);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [stableAuidsKey]);

  return { avatars, loading };
}

const emptySubscribe = () => () => {};
const getAuidSnapshot = () => (typeof window !== "undefined" ? Cookies.get("auid") ?? null : null);
const getServerAuidSnapshot = () => null;

/**
 * Profile photo URL for the signed-in user (auid cookie), or null when
 * signed out or photo-less. For lists, prefer useAvatars(auids).
 */
export function useCurrentUserAvatar() {
  const auid = useSyncExternalStore(emptySubscribe, getAuidSnapshot, getServerAuidSnapshot);
  const { avatars } = useAvatars(auid ? [auid] : []);
  return auid ? (avatars[auid] ?? null) : null;
}
