/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import * as Types from './graphql';

import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
export type CommissionMemberRole =
  | 'EXPERT'
  | 'HEAD'
  | 'TRAINEE_EXPERT';

export type CommissionStatus =
  | 'APPROVED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'PLANNED'
  | 'STARTED';

export type CompetitionSeriesStatus =
  | 'APPROVED'
  | 'ARCHIVED'
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'PUBLISHED'
  | 'SUSPENDED';

export type CompetitionStatus =
  | 'APPROVED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'PLANNED'
  | 'STARTED';

export type GetCommissionQueryVariables = Exact<{
  id: string | number;
}>;


export type GetCommissionQuery = { commission: { id: string, name: string, status: Types.CommissionStatus, startedAt: string | null, endedAt: string | null, createdAt: string, plannedDates: { start: string | null, end: string | null } | null, competition: { id: string, name: string, holders: Array<Array<number>> }, members: Array<{ id: string, auid: Array<number>, role: Types.CommissionMemberRole, isReady: boolean }> } | null };

export type GetCommissionCandidateCountQueryVariables = Exact<{
  commissionId: string | number;
}>;


export type GetCommissionCandidateCountQuery = { commissionCandidateCount: number };

export type MarkMemberReadyMutationVariables = Exact<{
  commissionId: string | number;
  memberId: string | number;
}>;


export type MarkMemberReadyMutation = { markCommissionMemberReady: { id: string, members: Array<{ id: string, isReady: boolean }> } };

export type MarkMemberNotReadyMutationVariables = Exact<{
  commissionId: string | number;
  memberId: string | number;
}>;


export type MarkMemberNotReadyMutation = { markCommissionMemberNotReady: { id: string, members: Array<{ id: string, isReady: boolean }> } };

export type StartCommissionMutationVariables = Exact<{
  id: string | number;
}>;


export type StartCommissionMutation = { startCommission: { id: string, status: Types.CommissionStatus, startedAt: string | null } };

export type CompleteCommissionMutationVariables = Exact<{
  id: string | number;
}>;


export type CompleteCommissionMutation = { completeCommission: { id: string, status: Types.CommissionStatus, endedAt: string | null } };

export type GetCompetitionPageQueryVariables = Exact<{
  id: string | number;
}>;


export type GetCompetitionPageQuery = { competition: { id: string, name: string, status: Types.CompetitionStatus, startedAt: string | null, endedAt: string | null, holders: Array<Array<number>>, plannedDates: { start: string | null, end: string | null } | null, series: { id: string, name: string, status: Types.CompetitionSeriesStatus } } | null, commissionsByCompetition: { items: Array<{ id: string, name: string, status: Types.CommissionStatus, startedAt: string | null, endedAt: string | null, plannedDates: { start: string | null, end: string | null } | null }> } };

export type StartCompetitionMutationVariables = Exact<{
  id: string | number;
}>;


export type StartCompetitionMutation = { startCompetition: { id: string, status: Types.CompetitionStatus, startedAt: string | null } };

export type GetDashboardCompetitionsQueryVariables = Exact<{
  limit?: number | null | undefined;
}>;


export type GetDashboardCompetitionsQuery = { competitions: { items: Array<{ id: string, name: string, status: Types.CompetitionStatus, startedAt: string | null, endedAt: string | null, holders: Array<Array<number>>, plannedDates: { start: string | null, end: string | null } | null, series: { id: string, name: string, status: Types.CompetitionSeriesStatus } }> } };


export const GetCommissionDocument = gql`
    query GetCommission($id: ID!) {
  commission(id: $id) {
    id
    name
    status
    plannedDates {
      start
      end
    }
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
    `;
export const GetCommissionCandidateCountDocument = gql`
    query GetCommissionCandidateCount($commissionId: ID!) {
  commissionCandidateCount(commissionId: $commissionId)
}
    `;
export const MarkMemberReadyDocument = gql`
    mutation MarkMemberReady($commissionId: ID!, $memberId: ID!) {
  markCommissionMemberReady(id: $commissionId, memberId: $memberId) {
    id
    members {
      id
      isReady
    }
  }
}
    `;
export const MarkMemberNotReadyDocument = gql`
    mutation MarkMemberNotReady($commissionId: ID!, $memberId: ID!) {
  markCommissionMemberNotReady(id: $commissionId, memberId: $memberId) {
    id
    members {
      id
      isReady
    }
  }
}
    `;
export const StartCommissionDocument = gql`
    mutation StartCommission($id: ID!) {
  startCommission(id: $id) {
    id
    status
    startedAt
  }
}
    `;
export const CompleteCommissionDocument = gql`
    mutation CompleteCommission($id: ID!) {
  completeCommission(id: $id) {
    id
    status
    endedAt
  }
}
    `;
export const GetCompetitionPageDocument = gql`
    query GetCompetitionPage($id: ID!) {
  competition(id: $id) {
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
  commissionsByCompetition(competitionId: $id, limit: 50) {
    items {
      id
      name
      status
      plannedDates {
        start
        end
      }
      startedAt
      endedAt
    }
  }
}
    `;
export const StartCompetitionDocument = gql`
    mutation StartCompetition($id: ID!) {
  startCompetition(id: $id) {
    id
    status
    startedAt
  }
}
    `;
export const GetDashboardCompetitionsDocument = gql`
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
    `;
export type Requester<C = {}> = <R, V>(doc: DocumentNode, vars?: V, options?: C) => Promise<R> | AsyncIterable<R>
export function getSdk<C>(requester: Requester<C>) {
  return {
    GetCommission(variables: Types.GetCommissionQueryVariables, options?: C): Promise<Types.GetCommissionQuery> {
      return requester<Types.GetCommissionQuery, Types.GetCommissionQueryVariables>(GetCommissionDocument, variables, options) as Promise<Types.GetCommissionQuery>;
    },
    GetCommissionCandidateCount(variables: Types.GetCommissionCandidateCountQueryVariables, options?: C): Promise<Types.GetCommissionCandidateCountQuery> {
      return requester<Types.GetCommissionCandidateCountQuery, Types.GetCommissionCandidateCountQueryVariables>(GetCommissionCandidateCountDocument, variables, options) as Promise<Types.GetCommissionCandidateCountQuery>;
    },
    MarkMemberReady(variables: Types.MarkMemberReadyMutationVariables, options?: C): Promise<Types.MarkMemberReadyMutation> {
      return requester<Types.MarkMemberReadyMutation, Types.MarkMemberReadyMutationVariables>(MarkMemberReadyDocument, variables, options) as Promise<Types.MarkMemberReadyMutation>;
    },
    MarkMemberNotReady(variables: Types.MarkMemberNotReadyMutationVariables, options?: C): Promise<Types.MarkMemberNotReadyMutation> {
      return requester<Types.MarkMemberNotReadyMutation, Types.MarkMemberNotReadyMutationVariables>(MarkMemberNotReadyDocument, variables, options) as Promise<Types.MarkMemberNotReadyMutation>;
    },
    StartCommission(variables: Types.StartCommissionMutationVariables, options?: C): Promise<Types.StartCommissionMutation> {
      return requester<Types.StartCommissionMutation, Types.StartCommissionMutationVariables>(StartCommissionDocument, variables, options) as Promise<Types.StartCommissionMutation>;
    },
    CompleteCommission(variables: Types.CompleteCommissionMutationVariables, options?: C): Promise<Types.CompleteCommissionMutation> {
      return requester<Types.CompleteCommissionMutation, Types.CompleteCommissionMutationVariables>(CompleteCommissionDocument, variables, options) as Promise<Types.CompleteCommissionMutation>;
    },
    GetCompetitionPage(variables: Types.GetCompetitionPageQueryVariables, options?: C): Promise<Types.GetCompetitionPageQuery> {
      return requester<Types.GetCompetitionPageQuery, Types.GetCompetitionPageQueryVariables>(GetCompetitionPageDocument, variables, options) as Promise<Types.GetCompetitionPageQuery>;
    },
    StartCompetition(variables: Types.StartCompetitionMutationVariables, options?: C): Promise<Types.StartCompetitionMutation> {
      return requester<Types.StartCompetitionMutation, Types.StartCompetitionMutationVariables>(StartCompetitionDocument, variables, options) as Promise<Types.StartCompetitionMutation>;
    },
    GetDashboardCompetitions(variables?: Types.GetDashboardCompetitionsQueryVariables, options?: C): Promise<Types.GetDashboardCompetitionsQuery> {
      return requester<Types.GetDashboardCompetitionsQuery, Types.GetDashboardCompetitionsQueryVariables>(GetDashboardCompetitionsDocument, variables, options) as Promise<Types.GetDashboardCompetitionsQuery>;
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;