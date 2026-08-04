'use server';

import { getCompetitionsListAction as _getCompetitionsListAction } from '@/lib/seeder';

export async function getCompetitionsListAction() {
  return await _getCompetitionsListAction();
}
