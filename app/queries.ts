import { gql } from '@/src/gql';

export const GET_DASHBOARD_COMPETITIONS = gql(`
  query GetDashboardCompetitions($limit: Int, $cursor: ID, $offset: Int) {
      competitions(limit: $limit, cursor: $cursor, offset: $offset) {
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
      competitionCount
  }
`);

