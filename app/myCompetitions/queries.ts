import { gql } from '@/src/gql';

export const GET_COMPETITIONS = gql(`
  query GetCompetitions($limit: Int) {
    competitions(limit: $limit) {
      items {
        id
        name
        status
        startedAt
        endedAt
        plannedDates {
          start
          end
        }
        series {
          id
          name
        }
        holders
      }
    }
  }
`)