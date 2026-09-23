'use server';

import { getCompetitionsListAction as _getCompetitionsListAction } from '@/lib/seeder';
import { isProd } from '@/lib/isProd';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';

export async function getCompetitionsListAction() {
  if (isProd()) {
    notFound();
  }
  return await _getCompetitionsListAction();
}

export async function switchDevActorAction(auid: number | string) {
  if (isProd()) {
    notFound();
  }
  const auidStr = String(auid);
  const cookieStore = await cookies();
  cookieStore.set("auid", auidStr, { path: "/", secure: false, sameSite: "lax" });
  cookieStore.set("actor", auidStr, { path: "/", secure: false, sameSite: "lax" });
  cookieStore.delete("username");
  cookieStore.delete("displayName");
  cookieStore.delete("axus_access_token");
  cookieStore.delete("axus_refresh_token");
  return { success: true, auid: auidStr };
}
