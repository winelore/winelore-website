import { gql } from "@/src/gql"

export const GET_MY_COMPETITIONS = gql(`
  query GetMyCompetitions($limit: Int, $cursor: ID, $offset: Int, $filter: CompetitionFilterInput) {
    competitions(limit: $limit, cursor: $cursor, offset: $offset, filter: $filter) {
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