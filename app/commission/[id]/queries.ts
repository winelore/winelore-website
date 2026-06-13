import { gql } from '@/src/gql';

export const GET_COMMISSION = gql(`
  query GetCommission($id: ID!) {
    commission(id: $id) {
      id
      name
      status
      plannedStartAt
      startedAt
      endedAt
      createdAt
      competition {
        id
        name
        holders
      }
      members {
        id
        auid
        role
        isReady
      }
    }
  }
`);

export const GET_CANDIDATE_COUNT = gql(`
  query GetCommissionCandidateCount($commissionId: ID!) {
    commissionCandidateCount(commissionId: $commissionId)
  }
`);

export const MARK_MEMBER_READY = gql(`
  mutation MarkMemberReady($commissionId: ID!, $memberId: ID!) {
    markCommissionMemberReady(id: $commissionId, memberId: $memberId) {
      id
      members {
        id
        isReady
      }
    }
  }
`);

export const MARK_MEMBER_NOT_READY = gql(`
  mutation MarkMemberNotReady($commissionId: ID!, $memberId: ID!) {
    markCommissionMemberNotReady(id: $commissionId, memberId: $memberId) {
      id
      members {
        id
        isReady
      }
    }
  }
`);