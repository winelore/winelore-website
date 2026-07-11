import { gql } from '@/src/gql';

export const GET_DASHBOARD_COMPETITIONS = gql(`
  query GetDashboardCompetitions($limit: Int) {
      competitions(limit: $limit) {
          items {
              id
              name
              status
              startedAt
              plannedDates {
                  start
                  end
              }
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

