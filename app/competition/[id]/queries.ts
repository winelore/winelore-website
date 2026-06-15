import { gql } from '@/src/gql';

export const GET_COMPETITION_PAGE = gql(`
  query GetCompetitionPage($id: ID!) {
      competition(id: $id) {
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
      commissionsByCompetition(competitionId: $id, limit: 50) {
          items {
              id
              name
              status
              startedAt
              endedAt
          }
      }
  }
`);

export const START_COMPETITION = gql(`
  mutation StartCompetition($id: ID!) {
      startCompetition(id: $id) {
          id
          status
          startedAt
      }
  }
`);