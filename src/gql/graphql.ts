/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
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


export type GetCommissionQuery = { commission: { id: string, name: string, status: CommissionStatus, startedAt: string | null, endedAt: string | null, createdAt: string, plannedDates: { start: string | null, end: string | null } | null, competition: { id: string, name: string, holders: Array<Array<number>> }, members: Array<{ id: string, auid: Array<number>, role: CommissionMemberRole, isReady: boolean }> } | null };

export type GetCommissionTemplatesQueryVariables = Exact<{
  id: string | number;
}>;


export type GetCommissionTemplatesQuery = { commission: { id: string, templateEditions: Array<{ id: string, beverageType: BeverageType, templateEdition: { id: string, version: number, status: EvaluationTemplateEditionStatus, categories: Array<{ id: string, name: string, properties: Array<
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


export type StartCommissionMutation = { startCommission: { id: string, status: CommissionStatus, startedAt: string | null } };

export type CompleteCommissionMutationVariables = Exact<{
  id: string | number;
}>;


export type CompleteCommissionMutation = { completeCommission: { id: string, status: CommissionStatus, endedAt: string | null } };

export type GetCommissionCandidatesQueryVariables = Exact<{
  commissionId: string | number;
}>;


export type GetCommissionCandidatesQuery = { commissionCandidatesByCommission: { items: Array<{ id: string, anonymizedCode: string | null, orderIndex: number | null, status: CommissionCandidateStatus, sample: { id: string, volumeMl: number | null, batch: { id: string, vintage: number | null, beverage: { id: string, name: string, status: BeverageStatus } } } }> } };

export type GetCompetitionPageQueryVariables = Exact<{
  id: string | number;
}>;


export type GetCompetitionPageQuery = { competition: { id: string, name: string, status: CompetitionStatus, startedAt: string | null, endedAt: string | null, holders: Array<Array<number>>, plannedDates: { start: string | null, end: string | null } | null, series: { id: string, name: string, status: CompetitionSeriesStatus } } | null, commissionsByCompetition: { items: Array<{ id: string, name: string, status: CommissionStatus, startedAt: string | null, endedAt: string | null, plannedDates: { start: string | null, end: string | null } | null }> } };

export type StartCompetitionMutationVariables = Exact<{
  id: string | number;
}>;


export type StartCompetitionMutation = { startCompetition: { id: string, status: CompetitionStatus, startedAt: string | null } };

export type GetDashboardCompetitionsQueryVariables = Exact<{
  limit?: number | null | undefined;
}>;


export type GetDashboardCompetitionsQuery = { competitions: { items: Array<{ id: string, name: string, status: CompetitionStatus, startedAt: string | null, endedAt: string | null, holders: Array<Array<number>>, plannedDates: { start: string | null, end: string | null } | null, series: { id: string, name: string, status: CompetitionSeriesStatus } }> } };


export const GetCommissionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCommission"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commission"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"plannedDates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"end"}}]}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"competition"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"holders"}}]}},{"kind":"Field","name":{"kind":"Name","value":"members"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"auid"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isReady"}}]}}]}}]}}]} as unknown as DocumentNode<GetCommissionQuery, GetCommissionQueryVariables>;
export const GetCommissionTemplatesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCommissionTemplates"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commission"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"templateEditions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"beverageType"}},{"kind":"Field","name":{"kind":"Name","value":"templateEdition"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"categories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"properties"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"isRequired"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BooleanProperty"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"boolDefaultValue"},"name":{"kind":"Name","value":"defaultValue"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"IntProperty"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"intMinLimit"},"name":{"kind":"Name","value":"minLimit"}},{"kind":"Field","alias":{"kind":"Name","value":"intMaxLimit"},"name":{"kind":"Name","value":"maxLimit"}},{"kind":"Field","alias":{"kind":"Name","value":"intDefaultValue"},"name":{"kind":"Name","value":"defaultValue"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DoubleProperty"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"doubleMinLimit"},"name":{"kind":"Name","value":"minLimit"}},{"kind":"Field","alias":{"kind":"Name","value":"doubleMaxLimit"},"name":{"kind":"Name","value":"maxLimit"}},{"kind":"Field","alias":{"kind":"Name","value":"doubleDefaultValue"},"name":{"kind":"Name","value":"defaultValue"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EnumProperty"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"enumAllowedValues"},"name":{"kind":"Name","value":"allowedValues"}},{"kind":"Field","alias":{"kind":"Name","value":"enumDefaultValue"},"name":{"kind":"Name","value":"defaultValue"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DiscreteNumbersProperty"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"discreteAllowedValues"},"name":{"kind":"Name","value":"allowedValues"}},{"kind":"Field","alias":{"kind":"Name","value":"discreteDefaultValue"},"name":{"kind":"Name","value":"defaultValue"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SmartProperty"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"expression"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BinaryExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"left"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}},{"kind":"Field","name":{"kind":"Name","value":"right"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ConstantExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VariableExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]}}]}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetCommissionTemplatesQuery, GetCommissionTemplatesQueryVariables>;
export const GetCommissionCandidateCountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCommissionCandidateCount"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"commissionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commissionCandidateCount"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"commissionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"commissionId"}}}]}]}}]} as unknown as DocumentNode<GetCommissionCandidateCountQuery, GetCommissionCandidateCountQueryVariables>;
export const MarkMemberReadyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkMemberReady"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"commissionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"memberId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markCommissionMemberReady"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"commissionId"}}},{"kind":"Argument","name":{"kind":"Name","value":"memberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"memberId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"members"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isReady"}}]}}]}}]}}]} as unknown as DocumentNode<MarkMemberReadyMutation, MarkMemberReadyMutationVariables>;
export const MarkMemberNotReadyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkMemberNotReady"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"commissionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"memberId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markCommissionMemberNotReady"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"commissionId"}}},{"kind":"Argument","name":{"kind":"Name","value":"memberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"memberId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"members"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isReady"}}]}}]}}]}}]} as unknown as DocumentNode<MarkMemberNotReadyMutation, MarkMemberNotReadyMutationVariables>;
export const StartCommissionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StartCommission"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startCommission"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}}]}}]}}]} as unknown as DocumentNode<StartCommissionMutation, StartCommissionMutationVariables>;
export const CompleteCommissionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CompleteCommission"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"completeCommission"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}}]}}]}}]} as unknown as DocumentNode<CompleteCommissionMutation, CompleteCommissionMutationVariables>;
export const GetCommissionCandidatesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCommissionCandidates"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"commissionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commissionCandidatesByCommission"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"commissionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"commissionId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"anonymizedCode"}},{"kind":"Field","name":{"kind":"Name","value":"orderIndex"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"sample"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"volumeMl"}},{"kind":"Field","name":{"kind":"Name","value":"batch"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"vintage"}},{"kind":"Field","name":{"kind":"Name","value":"beverage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetCommissionCandidatesQuery, GetCommissionCandidatesQueryVariables>;
export const GetCompetitionPageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCompetitionPage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"competition"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"plannedDates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"end"}}]}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"holders"}},{"kind":"Field","name":{"kind":"Name","value":"series"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"commissionsByCompetition"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"competitionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"50"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"plannedDates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"end"}}]}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}}]}}]}}]}}]} as unknown as DocumentNode<GetCompetitionPageQuery, GetCompetitionPageQueryVariables>;
export const StartCompetitionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StartCompetition"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startCompetition"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}}]}}]}}]} as unknown as DocumentNode<StartCompetitionMutation, StartCompetitionMutationVariables>;
export const GetDashboardCompetitionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetDashboardCompetitions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"competitions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"plannedDates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"end"}}]}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"holders"}},{"kind":"Field","name":{"kind":"Name","value":"series"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetDashboardCompetitionsQuery, GetDashboardCompetitionsQueryVariables>;