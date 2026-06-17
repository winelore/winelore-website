import { gql } from '@/src/gql';

export const GET_DASHBOARD_COMPETITIONS = gql(`
  query GetDashboardCompetitions($limit: Int) {
      competitions(limit: $limit) {
          items {
              id
              name
              status
              startedAt
              plannedStartAt
              plannedEndAt
              endedAt
              holders
              series {
                  id
                  name
                  status
              }
          }
      }
  }
`);
