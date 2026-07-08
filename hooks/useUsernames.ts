import { useState, useEffect, useMemo } from "react";
import { getUsernamesAction } from "@/app/userActions";

export function useUsernames(auids: (string | number)[]) {
  const [usernames, setUsernames] = useState<Record<string, string>>({});
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

    getUsernamesAction(parsedAuids)
      .then((res) => {
        if (isMounted) {
          setUsernames(res);
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
