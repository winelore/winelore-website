/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type BeverageFilterInput = {
  producers?: Array<Array<number>> | null | undefined;
  status?: BeverageStatus | null | undefined;
  typeId?: string | number | null | undefined;
};

export type BeverageStatus =
  | 'APPROVED'
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'PUBLISHED'
  | 'SUSPENDED';

export type CommissionReplicaCandidateStatus =
  | 'DISQUALIFIED'
  | 'EVALUATED'
  | 'PENDING'
  | 'POSTPONED';

export type CommissionReplicaMemberRole =
  | 'EXPERT'
  | 'HEAD';

export type CommissionReplicaStatus =
  | 'CANCELLED'
  | 'COMPLETED'
  | 'DRAFT'
  | 'PLANNED'
  | 'STARTED';

export type CommissionReplicaType =
  | 'STANDARD'
  | 'TRAINEE';

export type CommissionStatus =
  | 'APPROVED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'PLANNED'
  | 'STARTED';

export type CompetitionFilterInput = {
  holders?: Array<Array<number>> | null | undefined;
  seriesId?: string | number | null | undefined;
  status?: CompetitionStatus | null | undefined;
};

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

export type CreateEvaluationTemplateEditionInput = {
  categories: Array<EvaluationTemplateEditionCategoryInput>;
  templateId: string | number;
  version: number;
};

export type CreateEvaluationTemplateInput = {
  beverageTypeId: string | number;
  name: string;
  owners: Array<Array<number>>;
};

export type EvaluatedPropertyScoreInput = {
  code: string;
  value?: string | null | undefined;
};

export type EvaluationCommentInput = {
  propertyId?: string | number | null | undefined;
  sortOrder: number;
  text?: string | null | undefined;
  voiceUrl?: string | null | undefined;
};

export type EvaluationExpressionInput = {
  constantValue?: string | null | undefined;
  left?: EvaluationExpressionInput | null | undefined;
  right?: EvaluationExpressionInput | null | undefined;
  type: string;
  variableCode?: string | null | undefined;
};

export type EvaluationPropertyInput = {
  allowedValues?: Array<string> | null | undefined;
  code: string;
  defaultValue?: string | null | undefined;
  description?: string | null | undefined;
  expression?: EvaluationExpressionInput | null | undefined;
  id?: string | number | null | undefined;
  isRequired: boolean;
  isResult?: boolean;
  maxLimit?: number | null | undefined;
  minLimit?: number | null | undefined;
  name: string;
  type: string;
};

export type EvaluationTemplateEditionCategoryInput = {
  id?: string | number | null | undefined;
  name: string;
  properties: Array<EvaluationPropertyInput>;
};

export type EvaluationTemplateEditionStatus =
  | 'ACTIVE'
  | 'ARCHIVED'
  | 'DRAFT';

export type ProducerRole =
  | 'BOTTLER'
  | 'MAKER';

export type SubmitEvaluationInput = {
  candidateId: string | number;
  comments?: Array<EvaluationCommentInput> | null | undefined;
  scores: Array<EvaluatedPropertyScoreInput>;
};

export type GetBeverageQueryVariables = Exact<{
  id: string | number;
}>;


export type GetBeverageQuery = { beverage: { id: string, name: string, status: BeverageStatus, typeId: string, schemaEditionIds: string, attributes: string, createdAt: string, producers: Array<{ id: string, auid: Array<number>, role: ProducerRole }>, origin: { latitude: number, longitude: number } | null } | null };

export type GetBeverageAwardsQueryVariables = Exact<{
  id: string | number;
}>;


export type GetBeverageAwardsQuery = { beverageAwards: Array<{ id: string, commissionId: string, candidateId: string, assignedAt: string, award: { id: string, code: string, name: string, description: string | null, badgeUrl: string | null } }> };

export type GetCommissionForAwardQueryVariables = Exact<{
  id: string | number;
}>;


export type GetCommissionForAwardQuery = { commission: { id: string, name: string, competition: { id: string, name: string, status: CompetitionStatus, startedAt: string | null, endedAt: string | null, plannedDates: { start: string | null, end: string | null } | null, series: { id: string, name: string } } } | null };

export type GetCommissionQueryVariables = Exact<{
  id: string | number;
}>;


export type GetCommissionQuery = { commission: { id: string, name: string, status: CommissionStatus, startedAt: string | null, endedAt: string | null, createdAt: string, wineJumperMiniGameEnabled: boolean, voiceCommentsEnabled: boolean, propertyCommentsEnabled: boolean, beverageOriginDuringEvaluationEnabled: boolean, plannedDates: { start: string | null, end: string | null } | null, panels: Array<{ id: string, name: string }>, candidates: Array<{ id: string, panelId: string }>, competition: { id: string, name: string, holders: Array<Array<number>> }, replicas: Array<{ id: string, name: string | null, type: CommissionReplicaType, status: CommissionReplicaStatus, currentCandidateId: string | null, members: Array<{ id: string, auid: Array<number>, role: CommissionReplicaMemberRole, isReady: boolean }>, replicaCandidates: Array<{ id: string, status: CommissionReplicaCandidateStatus, candidate: { id: string, anonymizedCode: string | null, panelId: string } }> }> } | null };

export type GetCommissionTemplatesQueryVariables = Exact<{
  id: string | number;
}>;


export type GetCommissionTemplatesQuery = { commission: { id: string, templateEditions: Array<{ id: string, beverageType: { id: string, code: string, name: string }, templateEdition: { id: string, version: number, status: EvaluationTemplateEditionStatus, categories: Array<{ id: string, name: string, properties: Array<
            | { __typename: 'BooleanProperty', id: string, code: string, name: string, description: string | null, isRequired: boolean, isResult: boolean, boolDefaultValue: boolean | null }
            | { __typename: 'DiscreteNumbersProperty', id: string, code: string, name: string, description: string | null, isRequired: boolean, isResult: boolean, discreteAllowedValues: Array<number>, discreteDefaultValue: number | null }
            | { __typename: 'DoubleProperty', id: string, code: string, name: string, description: string | null, isRequired: boolean, isResult: boolean, doubleMinLimit: number | null, doubleMaxLimit: number | null, doubleDefaultValue: number | null }
            | { __typename: 'EnumProperty', id: string, code: string, name: string, description: string | null, isRequired: boolean, isResult: boolean, enumAllowedValues: Array<string>, enumDefaultValue: string | null }
            | { __typename: 'IntProperty', id: string, code: string, name: string, description: string | null, isRequired: boolean, isResult: boolean, intMinLimit: number | null, intMaxLimit: number | null, intDefaultValue: number | null }
            | { __typename: 'SmartProperty', id: string, code: string, name: string, description: string | null, isRequired: boolean, isResult: boolean, expression:
                | { __typename: 'BinaryExpression', type: string, left:
                    | { __typename: 'BinaryExpression', type: string, left:
                        | { __typename: 'BinaryExpression', type: string, left:
                            | { __typename: 'BinaryExpression', type: string }
                            | { __typename: 'ConstantExpression', value: string, type: string }
                            | { __typename: 'VariableExpression', code: string, type: string }
                          , right:
                            | { __typename: 'BinaryExpression', type: string }
                            | { __typename: 'ConstantExpression', value: string, type: string }
                            | { __typename: 'VariableExpression', code: string, type: string }
                           }
                        | { __typename: 'ConstantExpression', value: string, type: string }
                        | { __typename: 'VariableExpression', code: string, type: string }
                      , right:
                        | { __typename: 'BinaryExpression', type: string, left:
                            | { __typename: 'BinaryExpression', type: string }
                            | { __typename: 'ConstantExpression', value: string, type: string }
                            | { __typename: 'VariableExpression', code: string, type: string }
                          , right:
                            | { __typename: 'BinaryExpression', type: string }
                            | { __typename: 'ConstantExpression', value: string, type: string }
                            | { __typename: 'VariableExpression', code: string, type: string }
                           }
                        | { __typename: 'ConstantExpression', value: string, type: string }
                        | { __typename: 'VariableExpression', code: string, type: string }
                       }
                    | { __typename: 'ConstantExpression', value: string, type: string }
                    | { __typename: 'VariableExpression', code: string, type: string }
                  , right:
                    | { __typename: 'BinaryExpression', type: string, left:
                        | { __typename: 'BinaryExpression', type: string, left:
                            | { __typename: 'BinaryExpression', type: string }
                            | { __typename: 'ConstantExpression', value: string, type: string }
                            | { __typename: 'VariableExpression', code: string, type: string }
                          , right:
                            | { __typename: 'BinaryExpression', type: string }
                            | { __typename: 'ConstantExpression', value: string, type: string }
                            | { __typename: 'VariableExpression', code: string, type: string }
                           }
                        | { __typename: 'ConstantExpression', value: string, type: string }
                        | { __typename: 'VariableExpression', code: string, type: string }
                      , right:
                        | { __typename: 'BinaryExpression', type: string, left:
                            | { __typename: 'BinaryExpression', type: string }
                            | { __typename: 'ConstantExpression', value: string, type: string }
                            | { __typename: 'VariableExpression', code: string, type: string }
                          , right:
                            | { __typename: 'BinaryExpression', type: string }
                            | { __typename: 'ConstantExpression', value: string, type: string }
                            | { __typename: 'VariableExpression', code: string, type: string }
                           }
                        | { __typename: 'ConstantExpression', value: string, type: string }
                        | { __typename: 'VariableExpression', code: string, type: string }
                       }
                    | { __typename: 'ConstantExpression', value: string, type: string }
                    | { __typename: 'VariableExpression', code: string, type: string }
                   }
                | { __typename: 'ConstantExpression', value: string, type: string }
                | { __typename: 'VariableExpression', code: string, type: string }
               }
          > }> } }> } | null };

export type GetCommissionCandidateCountQueryVariables = Exact<{
  commissionId: string | number;
}>;


export type GetCommissionCandidateCountQuery = { commissionCandidateCount: number };

export type MarkReplicaMemberReadyMutationVariables = Exact<{
  replicaId: string | number;
  memberId: string | number;
}>;


export type MarkReplicaMemberReadyMutation = { markCommissionReplicaMemberReady: { id: string, members: Array<{ id: string, isReady: boolean }> } };

export type MarkReplicaMemberNotReadyMutationVariables = Exact<{
  replicaId: string | number;
  memberId: string | number;
}>;


export type MarkReplicaMemberNotReadyMutation = { markCommissionReplicaMemberNotReady: { id: string, members: Array<{ id: string, isReady: boolean }> } };

export type StartCommissionReplicaMutationVariables = Exact<{
  id: string | number;
}>;


export type StartCommissionReplicaMutation = { startCommissionReplica: { id: string, status: CommissionReplicaStatus } };

export type GetReplicaCandidatesQueryVariables = Exact<{
  replicaId: string | number;
}>;


export type GetReplicaCandidatesQuery = { commissionReplica: { id: string, status: CommissionReplicaStatus, commission: { id: string, panels: Array<{ id: string, name: string }>, candidates: Array<{ id: string, panelId: string }> }, replicaCandidates: Array<{ id: string, status: CommissionReplicaCandidateStatus, candidate: { id: string, anonymizedCode: string | null, panelId: string, beverageType: { id: string, code: string, name: string }, sample: { id: string, volumeMl: number | null, batch: { id: string, attributes: string, beverage: { id: string, name: string, status: BeverageStatus, attributes: string, producers: Array<{ auid: Array<number> }>, origin: { latitude: number, longitude: number } | null } } } } }> } | null };

export type GetReplicaCandidateQueryVariables = Exact<{
  id: string | number;
}>;


export type GetReplicaCandidateQuery = { commissionReplicaCandidate: { id: string, status: CommissionReplicaCandidateStatus, replica: { id: string, name: string | null, type: CommissionReplicaType, status: CommissionReplicaStatus, commission: { id: string, name: string } }, candidate: { id: string, anonymizedCode: string | null, sample: { id: string, volumeMl: number | null, batch: { id: string, attributes: string, beverage: { id: string, name: string, status: BeverageStatus, attributes: string, origin: { latitude: number, longitude: number } | null } } } } } | null };

export type CreateEvaluationTemplateMutationVariables = Exact<{
  input: CreateEvaluationTemplateInput;
}>;


export type CreateEvaluationTemplateMutation = { createEvaluationTemplate: { id: string, name: string } };

export type CreateEvaluationTemplateEditionMutationVariables = Exact<{
  input: CreateEvaluationTemplateEditionInput;
}>;


export type CreateEvaluationTemplateEditionMutation = { createEvaluationTemplateEdition: { id: string, version: number } };

export type ActivateEvaluationTemplateEditionMutationVariables = Exact<{
  id: string | number;
}>;


export type ActivateEvaluationTemplateEditionMutation = { activateEvaluationTemplateEdition: { id: string, status: EvaluationTemplateEditionStatus } };

export type SetCommissionTemplateEditionMutationVariables = Exact<{
  id: string | number;
  beverageTypeId: string | number;
  templateEditionId: string | number;
}>;


export type SetCommissionTemplateEditionMutation = { setCommissionTemplateEdition: { id: string } };

export type SubmitEvaluationMutationVariables = Exact<{
  input: SubmitEvaluationInput;
}>;


export type SubmitEvaluationMutation = { submitEvaluation: { id: string, isComplete: boolean, scores: Array<{ code: string, value: string | null }> } };

export type MarkCommissionReplicaCandidateAsEvaluatedMutationVariables = Exact<{
  id: string | number;
}>;


export type MarkCommissionReplicaCandidateAsEvaluatedMutation = { markCommissionReplicaCandidateAsEvaluated: { id: string, status: CommissionReplicaCandidateStatus } };

export type GetMyEvaluationForCandidateQueryVariables = Exact<{
  replicaCandidateId: string | number;
}>;


export type GetMyEvaluationForCandidateQuery = { evaluationByReplicaCandidateAndEvaluator: { evaluatorAuid: Array<number>, isComplete: boolean, scores: Array<{ code: string, value: string | null }>, comments: Array<{ id: string, propertyId: string | null, text: string | null, voiceUrl: string | null }> } | null };

export type GetEvaluationsForCandidateQueryVariables = Exact<{
  replicaCandidateId: string | number;
  limit?: number | null | undefined;
}>;


export type GetEvaluationsForCandidateQuery = { evaluationsByReplicaCandidate: { items: Array<{ id: string, evaluatorAuid: Array<number>, isComplete: boolean, templateEdition: { id: string }, scores: Array<{ code: string, value: string | null }>, comments: Array<{ id: string, propertyId: string | null, text: string | null, voiceUrl: string | null }> }> } };

export type GetPanelResultsQueryVariables = Exact<{
  replicaId: string | number;
}>;


export type GetPanelResultsQuery = { commissionReplica: { id: string, commission: { id: string, outcomePolicyEdition: { outputProperties: Array<
          | { code: string, name: string }
          | { code: string, name: string }
          | { code: string, name: string }
          | { code: string, name: string }
          | { code: string, name: string }
        > } | null }, outcomes: Array<{ beverageId: string, scores: string }>, replicaCandidates: Array<{ id: string, status: CommissionReplicaCandidateStatus, candidate: { id: string, anonymizedCode: string | null, panelId: string, sample: { batch: { beverage: { id: string, name: string } } } } }> } | null };

export type GetCompetitionPageQueryVariables = Exact<{
  id: string | number;
}>;


export type GetCompetitionPageQuery = { competition: { id: string, name: string, status: CompetitionStatus, startedAt: string | null, endedAt: string | null, holders: Array<Array<number>>, plannedDates: { start: string | null, end: string | null } | null, series: { id: string, name: string, status: CompetitionSeriesStatus } } | null, commissionsByCompetition: { items: Array<{ id: string, name: string, status: CommissionStatus, startedAt: string | null, endedAt: string | null, plannedDates: { start: string | null, end: string | null } | null }> } };

export type StartCompetitionMutationVariables = Exact<{
  id: string | number;
}>;


export type StartCompetitionMutation = { startCompetition: { id: string, status: CompetitionStatus, startedAt: string | null } };

export type GetMyBeveragesQueryVariables = Exact<{
  limit?: number | null | undefined;
  filter?: BeverageFilterInput | null | undefined;
}>;


export type GetMyBeveragesQuery = { beverages: { items: Array<{ id: string, name: string, status: BeverageStatus, typeId: string, attributes: string, producers: Array<{ id: string, auid: Array<number>, role: ProducerRole }>, origin: { latitude: number, longitude: number } | null }> } };

export type GetMyCompetitionsQueryVariables = Exact<{
  limit?: number | null | undefined;
  filter?: CompetitionFilterInput | null | undefined;
}>;


export type GetMyCompetitionsQuery = { competitions: { items: Array<{ id: string, name: string, status: CompetitionStatus, startedAt: string | null, endedAt: string | null, holders: Array<Array<number>>, plannedDates: { start: string | null, end: string | null } | null, series: { id: string, name: string } }> } };

export type GetDashboardCompetitionsQueryVariables = Exact<{
  limit?: number | null | undefined;
}>;


export type GetDashboardCompetitionsQuery = { competitions: { items: Array<{ id: string, name: string, status: CompetitionStatus, startedAt: string | null, endedAt: string | null, holders: Array<Array<number>>, plannedDates: { start: string | null, end: string | null } | null, series: { id: string, name: string, status: CompetitionSeriesStatus } }> } };


export const GetBeverageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBeverage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"beverage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"typeId"}},{"kind":"Field","name":{"kind":"Name","value":"schemaEditionIds"}},{"kind":"Field","name":{"kind":"Name","value":"attributes"}},{"kind":"Field","name":{"kind":"Name","value":"producers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"auid"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"Field","name":{"kind":"Name","value":"origin"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetBeverageQuery, GetBeverageQueryVariables>;
export const GetBeverageAwardsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBeverageAwards"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"beverageAwards"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"beverageId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"commissionId"}},{"kind":"Field","name":{"kind":"Name","value":"candidateId"}},{"kind":"Field","name":{"kind":"Name","value":"assignedAt"}},{"kind":"Field","name":{"kind":"Name","value":"award"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"badgeUrl"}}]}}]}}]}}]} as unknown as DocumentNode<GetBeverageAwardsQuery, GetBeverageAwardsQueryVariables>;
export const GetCommissionForAwardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCommissionForAward"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commission"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"competition"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"plannedDates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"end"}}]}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"series"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetCommissionForAwardQuery, GetCommissionForAwardQueryVariables>;
export const GetCommissionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCommission"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commission"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"plannedDates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"end"}}]}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"wineJumperMiniGameEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"voiceCommentsEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"propertyCommentsEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"beverageOriginDuringEvaluationEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"candidates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"competition"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"holders"}}]}},{"kind":"Field","name":{"kind":"Name","value":"replicas"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"currentCandidateId"}},{"kind":"Field","name":{"kind":"Name","value":"members"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"auid"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isReady"}}]}},{"kind":"Field","name":{"kind":"Name","value":"replicaCandidates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"candidate"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"anonymizedCode"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetCommissionQuery, GetCommissionQueryVariables>;
export const GetCommissionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCommission"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commission"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"plannedDates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"end"}}]}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"wineJumperMiniGameEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"voiceCommentsEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"propertyCommentsEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"beverageOriginDuringEvaluationEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"panels"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"candidates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"panelId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"competition"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"holders"}}]}},{"kind":"Field","name":{"kind":"Name","value":"replicas"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"currentCandidateId"}},{"kind":"Field","name":{"kind":"Name","value":"members"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"auid"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isReady"}}]}},{"kind":"Field","name":{"kind":"Name","value":"replicaCandidates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"candidate"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"anonymizedCode"}},{"kind":"Field","name":{"kind":"Name","value":"panelId"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetCommissionQuery, GetCommissionQueryVariables>;
export const GetCommissionTemplatesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCommissionTemplates"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commission"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"templateEditions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"beverageType"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"templateEdition"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"categories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"properties"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"isRequired"}},{"kind":"Field","name":{"kind":"Name","value":"isResult"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BooleanProperty"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"boolDefaultValue"},"name":{"kind":"Name","value":"defaultValue"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"IntProperty"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"intMinLimit"},"name":{"kind":"Name","value":"minLimit"}},{"kind":"Field","alias":{"kind":"Name","value":"intMaxLimit"},"name":{"kind":"Name","value":"maxLimit"}},{"kind":"Field","alias":{"kind":"Name","value":"intDefaultValue"},"name":{"kind":"Name","value":"defaultValue"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DoubleProperty"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"doubleMinLimit"},"name":{"kind":"Name","value":"minLimit"}},{"kind":"Field","alias":{"kind":"Name","value":"doubleMaxLimit"},"name":{"kind":"Name","value":"maxLimit"}},{"kind":"Field","alias":{"kind":"Name","value":"doubleDefaultValue"},"name":{"kind":"Name","value":"defaultValue"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EnumProperty"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"enumAllowedValues"},"name":{"kind":"Name","value":"allowedValues"}},{"kind":"Field","alias":{"kind":"Name","value":"enumDefaultValue"},"name":{"kind":"Name","value":"defaultValue"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DiscreteNumbersProperty"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"discreteAllowedValues"},"name":{"kind":"Name","value":"allowedValues"}},{"kind":"Field","alias":{"kind":"Name","value":"discreteDefaultValue"},"name":{"kind":"Name","value":"defaultValue"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SmartProperty"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"expression"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ConstantExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VariableExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BinaryExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"left"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ConstantExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VariableExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BinaryExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"left"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ConstantExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VariableExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BinaryExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"left"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ConstantExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VariableExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"right"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ConstantExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VariableExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"right"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ConstantExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VariableExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BinaryExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"left"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ConstantExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VariableExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"right"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ConstantExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VariableExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]}}]}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"right"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ConstantExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VariableExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BinaryExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"left"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ConstantExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VariableExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BinaryExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"left"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ConstantExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VariableExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"right"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ConstantExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VariableExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"right"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ConstantExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VariableExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BinaryExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"left"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ConstantExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VariableExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"right"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ConstantExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VariableExpression"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]}}]}}]}}]}}]}}]}}]}}]}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetCommissionTemplatesQuery, GetCommissionTemplatesQueryVariables>;
export const GetCommissionCandidateCountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCommissionCandidateCount"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"commissionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commissionCandidateCount"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"commissionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"commissionId"}}}]}]}}]} as unknown as DocumentNode<GetCommissionCandidateCountQuery, GetCommissionCandidateCountQueryVariables>;
export const MarkReplicaMemberReadyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkReplicaMemberReady"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"replicaId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"memberId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markCommissionReplicaMemberReady"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"replicaId"}}},{"kind":"Argument","name":{"kind":"Name","value":"memberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"memberId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"members"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isReady"}}]}}]}}]}}]} as unknown as DocumentNode<MarkReplicaMemberReadyMutation, MarkReplicaMemberReadyMutationVariables>;
export const MarkReplicaMemberNotReadyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkReplicaMemberNotReady"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"replicaId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"memberId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markCommissionReplicaMemberNotReady"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"replicaId"}}},{"kind":"Argument","name":{"kind":"Name","value":"memberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"memberId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"members"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isReady"}}]}}]}}]}}]} as unknown as DocumentNode<MarkReplicaMemberNotReadyMutation, MarkReplicaMemberNotReadyMutationVariables>;
export const StartCommissionReplicaDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StartCommissionReplica"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startCommissionReplica"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<StartCommissionReplicaMutation, StartCommissionReplicaMutationVariables>;
export const GetReplicaCandidatesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetReplicaCandidates"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"replicaId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commissionReplica"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"replicaId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"commission"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"panels"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"candidates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"panelId"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"replicaCandidates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"candidate"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"anonymizedCode"}},{"kind":"Field","name":{"kind":"Name","value":"panelId"}},{"kind":"Field","name":{"kind":"Name","value":"beverageType"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sample"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"volumeMl"}},{"kind":"Field","name":{"kind":"Name","value":"batch"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"attributes"}},{"kind":"Field","name":{"kind":"Name","value":"beverage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"attributes"}},{"kind":"Field","name":{"kind":"Name","value":"producers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"auid"}}]}},{"kind":"Field","name":{"kind":"Name","value":"origin"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}}]}}]}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetReplicaCandidatesQuery, GetReplicaCandidatesQueryVariables>;
export const GetReplicaCandidateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetReplicaCandidate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commissionReplicaCandidate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"replica"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"commission"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"candidate"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"anonymizedCode"}},{"kind":"Field","name":{"kind":"Name","value":"sample"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"volumeMl"}},{"kind":"Field","name":{"kind":"Name","value":"batch"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"attributes"}},{"kind":"Field","name":{"kind":"Name","value":"beverage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"attributes"}},{"kind":"Field","name":{"kind":"Name","value":"origin"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}}]}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetReplicaCandidateQuery, GetReplicaCandidateQueryVariables>;
export const CreateEvaluationTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateEvaluationTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateEvaluationTemplateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createEvaluationTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<CreateEvaluationTemplateMutation, CreateEvaluationTemplateMutationVariables>;
export const CreateEvaluationTemplateEditionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateEvaluationTemplateEdition"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateEvaluationTemplateEditionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createEvaluationTemplateEdition"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]}}]} as unknown as DocumentNode<CreateEvaluationTemplateEditionMutation, CreateEvaluationTemplateEditionMutationVariables>;
export const ActivateEvaluationTemplateEditionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ActivateEvaluationTemplateEdition"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"activateEvaluationTemplateEdition"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<ActivateEvaluationTemplateEditionMutation, ActivateEvaluationTemplateEditionMutationVariables>;
export const SetCommissionTemplateEditionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetCommissionTemplateEdition"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"beverageTypeId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"templateEditionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setCommissionTemplateEdition"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"beverageTypeId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"beverageTypeId"}}},{"kind":"Argument","name":{"kind":"Name","value":"templateEditionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"templateEditionId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<SetCommissionTemplateEditionMutation, SetCommissionTemplateEditionMutationVariables>;
export const SubmitEvaluationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SubmitEvaluation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SubmitEvaluationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"submitEvaluation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isComplete"}},{"kind":"Field","name":{"kind":"Name","value":"scores"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}}]}}]}}]} as unknown as DocumentNode<SubmitEvaluationMutation, SubmitEvaluationMutationVariables>;
export const MarkCommissionReplicaCandidateAsEvaluatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkCommissionReplicaCandidateAsEvaluated"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markCommissionReplicaCandidateAsEvaluated"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<MarkCommissionReplicaCandidateAsEvaluatedMutation, MarkCommissionReplicaCandidateAsEvaluatedMutationVariables>;
export const GetMyEvaluationForCandidateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMyEvaluationForCandidate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"replicaCandidateId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"evaluationByReplicaCandidateAndEvaluator"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"replicaCandidateId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"replicaCandidateId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"evaluatorAuid"}},{"kind":"Field","name":{"kind":"Name","value":"isComplete"}},{"kind":"Field","name":{"kind":"Name","value":"scores"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"comments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"propertyId"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"voiceUrl"}}]}}]}}]}}]} as unknown as DocumentNode<GetMyEvaluationForCandidateQuery, GetMyEvaluationForCandidateQueryVariables>;
export const GetEvaluationsForCandidateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEvaluationsForCandidate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"replicaCandidateId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"evaluationsByReplicaCandidate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"replicaCandidateId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"replicaCandidateId"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"evaluatorAuid"}},{"kind":"Field","name":{"kind":"Name","value":"isComplete"}},{"kind":"Field","name":{"kind":"Name","value":"templateEdition"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"scores"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"comments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"propertyId"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"voiceUrl"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetEvaluationsForCandidateQuery, GetEvaluationsForCandidateQueryVariables>;
export const GetPanelResultsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPanelResults"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"replicaId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commissionReplica"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"replicaId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"commission"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"outcomePolicyEdition"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"outputProperties"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"outcomes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"beverageId"}},{"kind":"Field","name":{"kind":"Name","value":"scores"}}]}},{"kind":"Field","name":{"kind":"Name","value":"replicaCandidates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"candidate"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"anonymizedCode"}},{"kind":"Field","name":{"kind":"Name","value":"panelId"}},{"kind":"Field","name":{"kind":"Name","value":"sample"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"batch"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"beverage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetPanelResultsQuery, GetPanelResultsQueryVariables>;
export const GetCompetitionPageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCompetitionPage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"competition"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"plannedDates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"end"}}]}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"holders"}},{"kind":"Field","name":{"kind":"Name","value":"series"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"commissionsByCompetition"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"competitionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"50"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"plannedDates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"end"}}]}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}}]}}]}}]}}]} as unknown as DocumentNode<GetCompetitionPageQuery, GetCompetitionPageQueryVariables>;
export const StartCompetitionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StartCompetition"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startCompetition"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}}]}}]}}]} as unknown as DocumentNode<StartCompetitionMutation, StartCompetitionMutationVariables>;
export const GetMyBeveragesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMyBeverages"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BeverageFilterInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"beverages"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"typeId"}},{"kind":"Field","name":{"kind":"Name","value":"attributes"}},{"kind":"Field","name":{"kind":"Name","value":"producers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"auid"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"Field","name":{"kind":"Name","value":"origin"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetMyBeveragesQuery, GetMyBeveragesQueryVariables>;
export const GetMyCompetitionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMyCompetitions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CompetitionFilterInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"competitions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"plannedDates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"end"}}]}},{"kind":"Field","name":{"kind":"Name","value":"series"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"holders"}}]}}]}}]}}]} as unknown as DocumentNode<GetMyCompetitionsQuery, GetMyCompetitionsQueryVariables>;
export const GetDashboardCompetitionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetDashboardCompetitions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"competitions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"plannedDates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"end"}}]}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"holders"}},{"kind":"Field","name":{"kind":"Name","value":"series"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetDashboardCompetitionsQuery, GetDashboardCompetitionsQueryVariables>;