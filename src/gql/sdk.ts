/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import * as Types from './graphql';

import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
export type BeverageStatus =
  | 'APPROVED'
  | 'DRAFT'
  | 'PUBLISHED'
  | 'SUBMITTED'
  | 'SUSPENDED';

export type BeverageType =
  | 'BEER'
  | 'CIDER'
  | 'OTHER'
  | 'SPIRIT'
  | 'WINE';

export type CommissionCandidateStatus =
  | 'DISQUALIFIED'
  | 'EVALUATED'
  | 'PENDING'
  | 'POSTPONED';

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

export type EvaluationTemplateEditionStatus =
  | 'ACTIVE'
  | 'ARCHIVED'
  | 'DRAFT';

export type GetCommissionQueryVariables = Exact<{
  id: string | number;
}>;


export type GetCommissionQuery = { commission: { id: string, name: string, status: Types.CommissionStatus, startedAt: string | null, endedAt: string | null, createdAt: string, plannedDates: { start: string | null, end: string | null } | null, competition: { id: string, name: string, holders: Array<Array<number>> }, members: Array<{ id: string, auid: Array<number>, role: Types.CommissionMemberRole, isReady: boolean }> } | null };

export type GetCommissionTemplatesQueryVariables = Exact<{
  id: string | number;
}>;


export type GetCommissionTemplatesQuery = { commission: { id: string, templateEditions: Array<{ id: string, beverageType: Types.BeverageType, templateEdition: { id: string, version: number, status: Types.EvaluationTemplateEditionStatus, categories: Array<{ id: string, name: string, properties: Array<
            | { __typename: 'BooleanProperty', id: string, code: string, name: string, description: string | null, isRequired: boolean, boolDefaultValue: boolean | null }
            | { __typename: 'DiscreteNumbersProperty', id: string, code: string, name: string, description: string | null, isRequired: boolean, discreteAllowedValues: Array<number>, discreteDefaultValue: number | null }
            | { __typename: 'DoubleProperty', id: string, code: string, name: string, description: string | null, isRequired: boolean, doubleMinLimit: number | null, doubleMaxLimit: number | null, doubleDefaultValue: number | null }
            | { __typename: 'EnumProperty', id: string, code: string, name: string, description: string | null, isRequired: boolean, enumAllowedValues: Array<string>, enumDefaultValue: string | null }
            | { __typename: 'IntProperty', id: string, code: string, name: string, description: string | null, isRequired: boolean, intMinLimit: number | null, intMaxLimit: number | null, intDefaultValue: number | null }
            | { __typename: 'SmartProperty', id: string, code: string, name: string, description: string | null, isRequired: boolean, expression:
                | { __typename: 'BinaryExpression', type: string, left:
                    | { __typename: 'BinaryExpression', type: string }
                    | { __typename: 'ConstantExpression', type: string }
                    | { __typename: 'VariableExpression', type: string }
                  , right:
                    | { __typename: 'BinaryExpression', type: string }
                    | { __typename: 'ConstantExpression', type: string }
                    | { __typename: 'VariableExpression', type: string }
                   }
                | { __typename: 'ConstantExpression', value: string, type: string }
                | { __typename: 'VariableExpression', code: string, type: string }
               }
          > }> } }> } | null };

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

export type GetCommissionCandidatesQueryVariables = Exact<{
  commissionId: string | number;
}>;


export type GetCommissionCandidatesQuery = { commissionCandidatesByCommission: { items: Array<{ id: string, anonymizedCode: string | null, orderIndex: number | null, status: Types.CommissionCandidateStatus, sample: { id: string, volumeMl: number | null, batch: { id: string, vintage: number | null, beverage: { id: string, name: string, status: Types.BeverageStatus } } } }> } };

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
export const GetCommissionTemplatesDocument = gql`
    query GetCommissionTemplates($id: ID!) {
  commission(id: $id) {
    id
    templateEditions {
      id
      beverageType
      templateEdition {
        id
        version
        status
        categories {
          id
          name
          properties {
            __typename
            id
            code
            name
            description
            isRequired
            ... on BooleanProperty {
              boolDefaultValue: defaultValue
            }
            ... on IntProperty {
              intMinLimit: minLimit
              intMaxLimit: maxLimit
              intDefaultValue: defaultValue
            }
            ... on DoubleProperty {
              doubleMinLimit: minLimit
              doubleMaxLimit: maxLimit
              doubleDefaultValue: defaultValue
            }
            ... on EnumProperty {
              enumAllowedValues: allowedValues
              enumDefaultValue: defaultValue
            }
            ... on DiscreteNumbersProperty {
              discreteAllowedValues: allowedValues
              discreteDefaultValue: defaultValue
            }
            ... on SmartProperty {
              expression {
                __typename
                type
                ... on BinaryExpression {
                  left {
                    __typename
                    type
                  }
                  right {
                    __typename
                    type
                  }
                }
                ... on ConstantExpression {
                  value
                }
                ... on VariableExpression {
                  code
                }
              }
            }
          }
        }
      }
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
export const GetCommissionCandidatesDocument = gql`
    query GetCommissionCandidates($commissionId: ID!) {
  commissionCandidatesByCommission(commissionId: $commissionId) {
    items {
      id
      anonymizedCode
      orderIndex
      status
      sample {
        id
        volumeMl
        batch {
          id
          vintage
          beverage {
            id
            name
            status
          }
        }
      }
    }
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
    GetCommissionTemplates(variables: Types.GetCommissionTemplatesQueryVariables, options?: C): Promise<Types.GetCommissionTemplatesQuery> {
      return requester<Types.GetCommissionTemplatesQuery, Types.GetCommissionTemplatesQueryVariables>(GetCommissionTemplatesDocument, variables, options) as Promise<Types.GetCommissionTemplatesQuery>;
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
    GetCommissionCandidates(variables: Types.GetCommissionCandidatesQueryVariables, options?: C): Promise<Types.GetCommissionCandidatesQuery> {
      return requester<Types.GetCommissionCandidatesQuery, Types.GetCommissionCandidatesQueryVariables>(GetCommissionCandidatesDocument, variables, options) as Promise<Types.GetCommissionCandidatesQuery>;
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