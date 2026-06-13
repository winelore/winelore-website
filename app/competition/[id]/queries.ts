export const GET_COMPETITION_PAGE = `
  query GetCompetitionPage($id: ID!) {
      competition(id: $id) {
          id
          name
          status
          startedAt
          plannedStartAt
          holders
      }
      commissionsByCompetition(competitionId: $id, limit: 50) {
          items {
              id
              name
              status
              startedAt
          }
      }
  }
`;