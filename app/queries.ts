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

export const GET_COMMISSIONS = gql(`
  query GetCommissions($limit: Int, $offset: Int) {
      commissions(limit: $limit, offset: $offset) {
          items {
              id
              name
              status
              replicas {
                  members {
                      auid
                      role
                  }
              }
          }
      }
  }
`);