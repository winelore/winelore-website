import { useState, useEffect, useMemo } from "react";
import { getUsernamesAction } from "@/app/userActions";

const usernameClientCache = new Map<string, string>();
const usernameRequests = new Map<string, Promise<Record<string, string>>>();

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
    for (const id of auids) {
      const strId = String(id);
      const cached = usernameClientCache.get(strId);
      if (cached) {
        initial[strId] = cached;
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

    const missingAuids = parsedAuids.filter((id) => !usernameClientCache.has(id));

    // If everything is already cached:
    if (missingAuids.length === 0) {
      const cachedResults: Record<string, string> = {};
      for (const id of parsedAuids) {
        cachedResults[id] = usernameClientCache.get(id)!;
      }
      setUsernames(cachedResults);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    loadUsernames(missingAuids)
      .then((res) => {
        for (const [id, name] of Object.entries(res)) {
          if (name !== id && name !== `@${id}`) usernameClientCache.set(id, name);
        }
        if (isMounted) {
          setUsernames((prev) => {
            const next = { ...prev };
            for (const id of parsedAuids) {
              if (usernameClientCache.has(id)) {
                next[id] = usernameClientCache.get(id)!;
              }
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
