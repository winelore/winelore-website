/**
 * The competition page's query and mutations, as raw strings both apps send.
 *
 * The page query is the web's GetCompetitionPage plus each commission's
 * replicas and members, so the app can open a judge's own lobby straight
 * from the list rather than fetching the commission again to find it.
 */

export const GET_COMPETITION_PAGE_WITH_MEMBERS = `
  query GetCompetitionPageWithMembers($id: ID!) {
      competition(id: $id) {
          id
          name
          status
          startedAt
          plannedDates { start end }
          endedAt
          holders
          series { id name status }
      }
      commissionsByCompetition(competitionId: $id, limit: 50) {
          items {
              id
              name
              status
              plannedDates { start end }
              startedAt
              endedAt
              wineJumperMiniGameEnabled
              voiceCommentsEnabled
              propertyCommentsEnabled
              beverageOriginDuringEvaluationEnabled
              replicas {
                  id
                  status
                  members { auid role }
              }
          }
      }
  }
`

export const CHANGE_COMPETITION_NAME = `
  mutation ChangeCompetitionName($id: ID!, $newName: String!) {
      changeCompetitionName(id: $id, newName: $newName) { id name }
  }
`

export const UPDATE_COMPETITION_DATES = `
  mutation UpdateCompetitionDates($id: ID!, $input: PlannedDatesInput!) {
      updateCompetitionDates(id: $id, input: $input) { id }
  }
`

export const CREATE_COMMISSION = `
  mutation CreateCommission($input: CreateCommissionInput!) {
      createCommission(input: $input) { id name }
  }
`
