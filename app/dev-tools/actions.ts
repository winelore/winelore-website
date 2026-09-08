'use server';

import { getCompetitionsListAction as _getCompetitionsListAction } from '@/lib/seeder';
import { isProd } from '@/lib/isProd';
import { notFound } from 'next/navigation';

export async function getCompetitionsListAction() {
  if (isProd()) {
    notFound();
  }
  return await _getCompetitionsListAction();
}
