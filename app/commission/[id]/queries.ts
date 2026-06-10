import { gql } from '@/src/gql';

export const GET_COMMISSION = gql(`
  query GetCommission($id: ID!) {
    commission(id: $id) {
      id
      competitionId
      name
      status
      startedAt
      createdAt
      members {
        id
        auid
        role
      }
      registeredCandidates {
        candidateId
      }
    }
  }
`);

export const GET_COMPETITION = gql(`
  query GetCompetition($id: ID!) {
    competition(id: $id) {
      id
      name
    }
  }
`);