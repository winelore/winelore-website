import { useState, useEffect, useMemo } from "react";
import Cookies from "js-cookie";
import { getAvatarUrlsAction } from "@/app/userActions";

export function useAvatars(auids: (string | number)[]) {
  const [avatars, setAvatars] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);

  const stableAuidsKey = useMemo(() => {
    const uniqueSorted = Array.from(new Set(auids.map(id => String(id)))).sort();
    return JSON.stringify(uniqueSorted);
  }, [auids]);

  useEffect(() => {
    const parsedAuids = JSON.parse(stableAuidsKey) as string[];
    if (parsedAuids.length === 0) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    getAvatarUrlsAction(parsedAuids)
      .then((res) => {
        if (isMounted) {
          setAvatars(res);
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

/**
 * Profile photo URL for the signed-in user (auid cookie), or null when
 * signed out or photo-less. For lists, prefer useAvatars(auids).
 */
export function useCurrentUserAvatar() {
  const [auid, setAuid] = useState<string | null>(null);

  useEffect(() => {
    setAuid(Cookies.get("auid") ?? null);
  }, []);

  const { avatars } = useAvatars(auid ? [auid] : []);
  return auid ? (avatars[auid] ?? null) : null;
}
