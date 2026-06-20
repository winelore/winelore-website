import { gql } from "@/src/gql"

export const GET_MY_COMPETITIONS = gql(`
  query GetMyCompetitions($limit: Int, $filter: CompetitionFilterInput) {
    competitions(limit: $limit, filter: $filter) {
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