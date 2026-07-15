/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import * as Types from './graphql';

import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
export type AddCommissionCandidateItemInput = {
  anonymizedCode?: string | null | undefined;
  sampleId: string | number;
};

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

export type CommissionReplicaMemberInput = {
  auid: Array<number>;
  role: CommissionReplicaMemberRole;
};

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

export type CoordinatesInput = {
  latitude: number;
  longitude: number;
};

export type CreateBatchInput = {
  attributes?: string | null | undefined;
  beverageId: string | number;
  lotNumber?: string | null | undefined;
  volumeMl?: number | null | undefined;
};

export type CreateBeverageInput = {
  attributes?: string | null | undefined;
  name: string;
  origin?: CoordinatesInput | null | undefined;
  producers: Array<ProducerInput>;
  typeId: string | number;
};

export type CreateBeverageTypeInput = {
  code: string;
  name: string;
  parentId?: string | number | null | undefined;
};

export type CreateCommissionInput = {
  beverageOriginDuringEvaluationEnabled?: boolean | null | undefined;
  competitionId: string | number;
  name: string;
  plannedDates?: PlannedDatesInput | null | undefined;
  propertyCommentsEnabled?: boolean | null | undefined;
  voiceCommentsEnabled?: boolean | null | undefined;
  wineJumperMiniGameEnabled?: boolean | null | undefined;
};

export type CreateCommissionReplicaInput = {
  chaoticCurrentCandidateChangesEnabled?: boolean | null | undefined;
  commissionId: string | number;
  members: Array<CommissionReplicaMemberInput>;
  name?: string | null | undefined;
  type: CommissionReplicaType;
};

export type CreateCompetitionInput = {
  holders: Array<Array<number>>;
  name: string;
  plannedDates?: PlannedDatesInput | null | undefined;
  seriesId: string | number;
};

export type CreateCompetitionSeriesInput = {
  countriesCodes?: Array<string> | null | undefined;
  countriesType: string;
  name: string;
  owners: Array<Array<number>>;
};

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

export type CreateSampleInput = {
  attributes?: string | null | undefined;
  batchId: string | number;
  volumeMl?: number | null | undefined;
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

export type PlannedDatesInput = {
  end?: string | null | undefined;
  start?: string | null | undefined;
};

export type ProducerInput = {
  auid: Array<number>;
  role: ProducerRole;
};

export type ProducerRole =
  | 'BOTTLER'
  | 'MAKER';

export type SubmitEvaluationInput = {
  candidateId: string | number;
  comments?: Array<EvaluationCommentInput> | null | undefined;
  scores: Array<EvaluatedPropertyScoreInput>;
};

export type GetCommissionQueryVariables = Exact<{
  id: string | number;
}>;


export type GetCommissionQuery = { commission: { id: string, name: string, status: Types.CommissionStatus, startedAt: string | null, endedAt: string | null, createdAt: string, wineJumperMiniGameEnabled: boolean, voiceCommentsEnabled: boolean, propertyCommentsEnabled: boolean, beverageOriginDuringEvaluationEnabled: boolean, plannedDates: { start: string | null, end: string | null } | null, panels: Array<{ id: string, name: string }>, candidates: Array<{ id: string, panelId: string }>, competition: { id: string, name: string, holders: Array<Array<number>> }, replicas: Array<{ id: string, name: string | null, type: Types.CommissionReplicaType, status: Types.CommissionReplicaStatus, currentCandidateId: string | null, members: Array<{ id: string, auid: Array<number>, role: Types.CommissionReplicaMemberRole, isReady: boolean }>, replicaCandidates: Array<{ id: string, status: Types.CommissionReplicaCandidateStatus, candidate: { id: string, anonymizedCode: string | null, panelId: string } }> }> } | null };

export type GetCommissionTemplatesQueryVariables = Exact<{
  id: string | number;
}>;


export type GetCommissionTemplatesQuery = { commission: { id: string, templateEditions: Array<{ id: string, beverageType: { id: string, code: string, name: string }, templateEdition: { id: string, version: number, status: Types.EvaluationTemplateEditionStatus, template: { id: string, name: string }, categories: Array<{ id: string, name: string, properties: Array<
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


export type StartCommissionReplicaMutation = { startCommissionReplica: { id: string, status: Types.CommissionReplicaStatus } };

export type GetReplicaCandidatesQueryVariables = Exact<{
  replicaId: string | number;
}>;


export type GetReplicaCandidatesQuery = { commissionReplica: { id: string, status: Types.CommissionReplicaStatus, commission: { id: string, panels: Array<{ id: string, name: string }>, candidates: Array<{ id: string, panelId: string }> }, replicaCandidates: Array<{ id: string, status: Types.CommissionReplicaCandidateStatus, candidate: { id: string, anonymizedCode: string | null, panelId: string, beverageType: { id: string, code: string, name: string }, sample: { id: string, volumeMl: number | null, batch: { id: string, attributes: string, beverage: { id: string, name: string, status: Types.BeverageStatus, attributes: string, producers: Array<{ auid: Array<number> }>, origin: { latitude: number, longitude: number } | null } } } } }> } | null };

export type GetReplicaCandidateQueryVariables = Exact<{
  id: string | number;
}>;


export type GetReplicaCandidateQuery = { commissionReplicaCandidate: { id: string, status: Types.CommissionReplicaCandidateStatus, replica: { id: string, name: string | null, type: Types.CommissionReplicaType, status: Types.CommissionReplicaStatus, commission: { id: string, name: string } }, candidate: { id: string, anonymizedCode: string | null, sample: { id: string, volumeMl: number | null, batch: { id: string, attributes: string, beverage: { id: string, name: string, status: Types.BeverageStatus, attributes: string, origin: { latitude: number, longitude: number } | null } } } } } | null };

export type CreateEvaluationTemplateMutationVariables = Exact<{
  input: Types.CreateEvaluationTemplateInput;
}>;


export type CreateEvaluationTemplateMutation = { createEvaluationTemplate: { id: string, name: string } };

export type CreateEvaluationTemplateEditionMutationVariables = Exact<{
  input: Types.CreateEvaluationTemplateEditionInput;
}>;


export type CreateEvaluationTemplateEditionMutation = { createEvaluationTemplateEdition: { id: string, version: number } };

export type ActivateEvaluationTemplateEditionMutationVariables = Exact<{
  id: string | number;
}>;


export type ActivateEvaluationTemplateEditionMutation = { activateEvaluationTemplateEdition: { id: string, status: Types.EvaluationTemplateEditionStatus } };

export type SetCommissionTemplateEditionMutationVariables = Exact<{
  id: string | number;
  beverageTypeId: string | number;
  templateEditionId: string | number;
}>;


export type SetCommissionTemplateEditionMutation = { setCommissionTemplateEdition: { id: string } };

export type SubmitEvaluationMutationVariables = Exact<{
  input: Types.SubmitEvaluationInput;
}>;


export type SubmitEvaluationMutation = { submitEvaluation: { id: string, isComplete: boolean, scores: Array<{ code: string, value: string | null }> } };

export type MarkCommissionReplicaCandidateAsEvaluatedMutationVariables = Exact<{
  id: string | number;
}>;


export type MarkCommissionReplicaCandidateAsEvaluatedMutation = { markCommissionReplicaCandidateAsEvaluated: { id: string, status: Types.CommissionReplicaCandidateStatus } };

export type GetMyEvaluationForCandidateQueryVariables = Exact<{
  replicaCandidateId: string | number;
}>;


export type GetMyEvaluationForCandidateQuery = { evaluationByReplicaCandidateAndEvaluator: { evaluatorAuid: Array<number>, isComplete: boolean, scores: Array<{ code: string, value: string | null }>, comments: Array<{ id: string, propertyId: string | null, text: string | null, voiceUrl: string | null }> } | null };

export type GetEvaluationsForCandidateQueryVariables = Exact<{
  replicaCandidateId: string | number;
  limit?: number | null | undefined;
}>;


export type GetEvaluationsForCandidateQuery = { evaluationsByReplicaCandidate: { items: Array<{ id: string, evaluatorAuid: Array<number>, isComplete: boolean, templateEdition: { id: string }, scores: Array<{ code: string, value: string | null }>, comments: Array<{ id: string, propertyId: string | null, text: string | null, voiceUrl: string | null }> }> } };

export type GetCompetitionPageQueryVariables = Exact<{
  id: string | number;
}>;


export type GetCompetitionPageQuery = { competition: { id: string, name: string, status: Types.CompetitionStatus, startedAt: string | null, endedAt: string | null, holders: Array<Array<number>>, plannedDates: { start: string | null, end: string | null } | null, series: { id: string, name: string, status: Types.CompetitionSeriesStatus } } | null, commissionsByCompetition: { items: Array<{ id: string, name: string, status: Types.CommissionStatus, startedAt: string | null, endedAt: string | null, plannedDates: { start: string | null, end: string | null } | null }> } };

export type StartCompetitionMutationVariables = Exact<{
  id: string | number;
}>;


export type StartCompetitionMutation = { startCompetition: { id: string, status: Types.CompetitionStatus, startedAt: string | null } };

export type DevApproveCompetitionMutationVariables = Exact<{
  id: string | number;
}>;


export type DevApproveCompetitionMutation = { approveCompetition: { id: string } };

export type DevCreateCompetitionSeriesMutationVariables = Exact<{
  input: Types.CreateCompetitionSeriesInput;
}>;


export type DevCreateCompetitionSeriesMutation = { createCompetitionSeries: { id: string, name: string } };

export type DevGetBeverageTypesQueryVariables = Exact<{ [key: string]: never; }>;


export type DevGetBeverageTypesQuery = { beverageTypes: { items: Array<{ id: string, code: string }> } };

export type DevCreateBeverageMutationVariables = Exact<{
  input: Types.CreateBeverageInput;
}>;


export type DevCreateBeverageMutation = { createBeverage: { id: string } };

export type DevCreateBatchMutationVariables = Exact<{
  input: Types.CreateBatchInput;
}>;


export type DevCreateBatchMutation = { createBatch: { id: string } };

export type DevCreateSampleMutationVariables = Exact<{
  input: Types.CreateSampleInput;
}>;


export type DevCreateSampleMutation = { createSample: { id: string } };

export type DevSubmitCompetitionSeriesForReviewMutationVariables = Exact<{
  id: string | number;
}>;


export type DevSubmitCompetitionSeriesForReviewMutation = { submitCompetitionSeriesForReview: { id: string } };

export type DevApproveCompetitionSeriesMutationVariables = Exact<{
  id: string | number;
}>;


export type DevApproveCompetitionSeriesMutation = { approveCompetitionSeries: { id: string } };

export type DevCreateCompetitionMutationVariables = Exact<{
  input: Types.CreateCompetitionInput;
}>;


export type DevCreateCompetitionMutation = { createCompetition: { id: string, name: string } };

export type DevSubmitCompetitionForReviewMutationVariables = Exact<{
  id: string | number;
}>;


export type DevSubmitCompetitionForReviewMutation = { submitCompetitionForReview: { id: string } };

export type DevPlanCompetitionMutationVariables = Exact<{
  id: string | number;
}>;


export type DevPlanCompetitionMutation = { planCompetition: { id: string } };

export type DevStartCompetitionMutationVariables = Exact<{
  id: string | number;
}>;


export type DevStartCompetitionMutation = { startCompetition: { id: string } };

export type DevCreateCommissionMutationVariables = Exact<{
  input: Types.CreateCommissionInput;
}>;


export type DevCreateCommissionMutation = { createCommission: { id: string, name: string } };

export type DevAddCommissionPanelMutationVariables = Exact<{
  commissionId: string | number;
  name: string;
}>;


export type DevAddCommissionPanelMutation = { addCommissionPanel: { id: string, name: string } };

export type DevAddCommissionCandidatesMutationVariables = Exact<{
  commissionId: string | number;
  panelId: string | number;
  candidates: Array<Types.AddCommissionCandidateItemInput> | Types.AddCommissionCandidateItemInput;
}>;


export type DevAddCommissionCandidatesMutation = { addCommissionCandidates: { id: string } };

export type DevCreateCommissionReplicaMutationVariables = Exact<{
  input: Types.CreateCommissionReplicaInput;
}>;


export type DevCreateCommissionReplicaMutation = { createCommissionReplica: { id: string } };

export type DevSubmitCommissionForReviewMutationVariables = Exact<{
  id: string | number;
}>;


export type DevSubmitCommissionForReviewMutation = { submitCommissionForReview: { id: string } };

export type DevApproveCommissionMutationVariables = Exact<{
  id: string | number;
}>;


export type DevApproveCommissionMutation = { approveCommission: { id: string } };

export type DevPlanCommissionMutationVariables = Exact<{
  id: string | number;
}>;


export type DevPlanCommissionMutation = { planCommission: { id: string } };

export type DevStartCommissionMutationVariables = Exact<{
  id: string | number;
}>;


export type DevStartCommissionMutation = { startCommission: { id: string } };

export type DevAddCommissionReplicaMemberMutationVariables = Exact<{
  id: string | number;
  input: Types.CommissionReplicaMemberInput;
}>;


export type DevAddCommissionReplicaMemberMutation = { addCommissionReplicaMember: { id: string, members: Array<{ id: string, auid: Array<number> }> } };

export type DevSubmitEvaluationMutationVariables = Exact<{
  input: Types.SubmitEvaluationInput;
}>;


export type DevSubmitEvaluationMutation = { submitEvaluation: { id: string } };

export type DevCreateBeverageTypeMutationVariables = Exact<{
  input: Types.CreateBeverageTypeInput;
}>;


export type DevCreateBeverageTypeMutation = { createBeverageType: { id: string } };

export type DevPublishBeverageTypeMutationVariables = Exact<{
  id: string | number;
}>;


export type DevPublishBeverageTypeMutation = { publishBeverageType: { id: string } };

export type DevSetCommissionTemplateEditionMutationVariables = Exact<{
  id: string | number;
  beverageTypeId: string | number;
  templateEditionId: string | number;
}>;


export type DevSetCommissionTemplateEditionMutation = { setCommissionTemplateEdition: { id: string } };

export type DevGetEvaluationTemplateEditionsQueryVariables = Exact<{ [key: string]: never; }>;


export type DevGetEvaluationTemplateEditionsQuery = { evaluationTemplateEditions: { items: Array<{ id: string, status: Types.EvaluationTemplateEditionStatus, template: { name: string, beverageType: { id: string } }, categories: Array<{ id: string }> }> } };

export type DevPlanCommissionReplicaMutationVariables = Exact<{
  id: string | number;
}>;


export type DevPlanCommissionReplicaMutation = { planCommissionReplica: { id: string } };

export type DevStartCommissionReplicaMutationVariables = Exact<{
  id: string | number;
}>;


export type DevStartCommissionReplicaMutation = { startCommissionReplica: { id: string } };

export type DevMarkCommissionReplicaMemberReadyMutationVariables = Exact<{
  id: string | number;
  memberId: string | number;
}>;


export type DevMarkCommissionReplicaMemberReadyMutation = { markCommissionReplicaMemberReady: { id: string } };

export type DevSetCommissionReplicaCurrentCandidateMutationVariables = Exact<{
  id: string | number;
  currentCandidateId: string | number;
}>;


export type DevSetCommissionReplicaCurrentCandidateMutation = { setCommissionReplicaCurrentCandidate: { id: string } };

export type DevGetCompetitionsListQueryVariables = Exact<{ [key: string]: never; }>;


export type DevGetCompetitionsListQuery = { competitions: { items: Array<{ id: string, name: string }> } };

export type DevGetCommissionsByCompetitionQueryVariables = Exact<{
  competitionId: string | number;
  limit?: number | null | undefined;
}>;


export type DevGetCommissionsByCompetitionQuery = { commissionsByCompetition: { items: Array<{ id: string, name: string }> } };

export type DevGetCommissionReplicasByCommissionQueryVariables = Exact<{
  commissionId: string | number;
}>;


export type DevGetCommissionReplicasByCommissionQuery = { commissionReplicasByCommission: Array<{ id: string, type: Types.CommissionReplicaType, members: Array<{ id: string, auid: Array<number>, role: Types.CommissionReplicaMemberRole }> }> };

export type GetMyBeveragesQueryVariables = Exact<{
  limit?: number | null | undefined;
  cursor?: string | number | null | undefined;
  offset?: number | null | undefined;
  filter?: Types.BeverageFilterInput | null | undefined;
  producer?: Array<number> | number | null | undefined;
}>;


export type GetMyBeveragesQuery = { beverageCount: number, beverages: { items: Array<{ id: string, name: string, status: Types.BeverageStatus, typeId: string, attributes: string, producers: Array<{ id: string, auid: Array<number>, role: Types.ProducerRole }>, origin: { latitude: number, longitude: number } | null }> } };

export type GetMyCompetitionsQueryVariables = Exact<{
  limit?: number | null | undefined;
  cursor?: string | number | null | undefined;
  offset?: number | null | undefined;
  filter?: Types.CompetitionFilterInput | null | undefined;
}>;


export type GetMyCompetitionsQuery = { competitions: { items: Array<{ id: string, name: string, status: Types.CompetitionStatus, startedAt: string | null, endedAt: string | null, holders: Array<Array<number>>, plannedDates: { start: string | null, end: string | null } | null, series: { id: string, name: string } }> } };

export type GetDashboardCompetitionsQueryVariables = Exact<{
  limit?: number | null | undefined;
  cursor?: string | number | null | undefined;
  offset?: number | null | undefined;
}>;


export type GetDashboardCompetitionsQuery = { competitionCount: number, competitions: { items: Array<{ id: string, name: string, status: Types.CompetitionStatus, startedAt: string | null, endedAt: string | null, holders: Array<Array<number>>, plannedDates: { start: string | null, end: string | null } | null, series: { id: string, name: string, status: Types.CompetitionSeriesStatus } }> } };


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
    wineJumperMiniGameEnabled
    voiceCommentsEnabled
    propertyCommentsEnabled
    beverageOriginDuringEvaluationEnabled
    panels {
      id
      name
    }
    candidates {
      id
      panelId
    }
    competition {
      id
      name
      holders
    }
    replicas {
      id
      name
      type
      status
      currentCandidateId
      members {
        id
        auid
        role
        isReady
      }
      replicaCandidates {
        id
        status
        candidate {
          id
          anonymizedCode
          panelId
        }
      }
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
      beverageType {
        id
        code
        name
      }
      templateEdition {
        id
        version
        status
        template {
          id
          name
        }
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
            isResult
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
                ... on ConstantExpression {
                  value
                }
                ... on VariableExpression {
                  code
                }
                ... on BinaryExpression {
                  left {
                    __typename
                    type
                    ... on ConstantExpression {
                      value
                    }
                    ... on VariableExpression {
                      code
                    }
                    ... on BinaryExpression {
                      left {
                        __typename
                        type
                        ... on ConstantExpression {
                          value
                        }
                        ... on VariableExpression {
                          code
                        }
                        ... on BinaryExpression {
                          left {
                            __typename
                            type
                            ... on ConstantExpression {
                              value
                            }
                            ... on VariableExpression {
                              code
                            }
                          }
                          right {
                            __typename
                            type
                            ... on ConstantExpression {
                              value
                            }
                            ... on VariableExpression {
                              code
                            }
                          }
                        }
                      }
                      right {
                        __typename
                        type
                        ... on ConstantExpression {
                          value
                        }
                        ... on VariableExpression {
                          code
                        }
                        ... on BinaryExpression {
                          left {
                            __typename
                            type
                            ... on ConstantExpression {
                              value
                            }
                            ... on VariableExpression {
                              code
                            }
                          }
                          right {
                            __typename
                            type
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
                  right {
                    __typename
                    type
                    ... on ConstantExpression {
                      value
                    }
                    ... on VariableExpression {
                      code
                    }
                    ... on BinaryExpression {
                      left {
                        __typename
                        type
                        ... on ConstantExpression {
                          value
                        }
                        ... on VariableExpression {
                          code
                        }
                        ... on BinaryExpression {
                          left {
                            __typename
                            type
                            ... on ConstantExpression {
                              value
                            }
                            ... on VariableExpression {
                              code
                            }
                          }
                          right {
                            __typename
                            type
                            ... on ConstantExpression {
                              value
                            }
                            ... on VariableExpression {
                              code
                            }
                          }
                        }
                      }
                      right {
                        __typename
                        type
                        ... on ConstantExpression {
                          value
                        }
                        ... on VariableExpression {
                          code
                        }
                        ... on BinaryExpression {
                          left {
                            __typename
                            type
                            ... on ConstantExpression {
                              value
                            }
                            ... on VariableExpression {
                              code
                            }
                          }
                          right {
                            __typename
                            type
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
export const MarkReplicaMemberReadyDocument = gql`
    mutation MarkReplicaMemberReady($replicaId: ID!, $memberId: ID!) {
  markCommissionReplicaMemberReady(id: $replicaId, memberId: $memberId) {
    id
    members {
      id
      isReady
    }
  }
}
    `;
export const MarkReplicaMemberNotReadyDocument = gql`
    mutation MarkReplicaMemberNotReady($replicaId: ID!, $memberId: ID!) {
  markCommissionReplicaMemberNotReady(id: $replicaId, memberId: $memberId) {
    id
    members {
      id
      isReady
    }
  }
}
    `;
export const StartCommissionReplicaDocument = gql`
    mutation StartCommissionReplica($id: ID!) {
  startCommissionReplica(id: $id) {
    id
    status
  }
}
    `;
export const GetReplicaCandidatesDocument = gql`
    query GetReplicaCandidates($replicaId: ID!) {
  commissionReplica(id: $replicaId) {
    id
    status
    commission {
      id
      panels {
        id
        name
      }
      candidates {
        id
        panelId
      }
    }
    replicaCandidates {
      id
      status
      candidate {
        id
        anonymizedCode
        panelId
        beverageType {
          id
          code
          name
        }
        sample {
          id
          volumeMl
          batch {
            id
            attributes
            beverage {
              id
              name
              status
              attributes
              producers {
                auid
              }
              origin {
                latitude
                longitude
              }
            }
          }
        }
      }
    }
  }
}
    `;
export const GetReplicaCandidateDocument = gql`
    query GetReplicaCandidate($id: ID!) {
  commissionReplicaCandidate(id: $id) {
    id
    status
    replica {
      id
      name
      type
      status
      commission {
        id
        name
      }
    }
    candidate {
      id
      anonymizedCode
      sample {
        id
        volumeMl
        batch {
          id
          attributes
          beverage {
            id
            name
            status
            attributes
            origin {
              latitude
              longitude
            }
          }
        }
      }
    }
  }
}
    `;
export const CreateEvaluationTemplateDocument = gql`
    mutation CreateEvaluationTemplate($input: CreateEvaluationTemplateInput!) {
  createEvaluationTemplate(input: $input) {
    id
    name
  }
}
    `;
export const CreateEvaluationTemplateEditionDocument = gql`
    mutation CreateEvaluationTemplateEdition($input: CreateEvaluationTemplateEditionInput!) {
  createEvaluationTemplateEdition(input: $input) {
    id
    version
  }
}
    `;
export const ActivateEvaluationTemplateEditionDocument = gql`
    mutation ActivateEvaluationTemplateEdition($id: ID!) {
  activateEvaluationTemplateEdition(id: $id) {
    id
    status
  }
}
    `;
export const SetCommissionTemplateEditionDocument = gql`
    mutation SetCommissionTemplateEdition($id: ID!, $beverageTypeId: ID!, $templateEditionId: ID!) {
  setCommissionTemplateEdition(
    id: $id
    beverageTypeId: $beverageTypeId
    templateEditionId: $templateEditionId
  ) {
    id
  }
}
    `;
export const SubmitEvaluationDocument = gql`
    mutation SubmitEvaluation($input: SubmitEvaluationInput!) {
  submitEvaluation(input: $input) {
    id
    isComplete
    scores {
      code
      value
    }
  }
}
    `;
export const MarkCommissionReplicaCandidateAsEvaluatedDocument = gql`
    mutation MarkCommissionReplicaCandidateAsEvaluated($id: ID!) {
  markCommissionReplicaCandidateAsEvaluated(id: $id) {
    id
    status
  }
}
    `;
export const GetMyEvaluationForCandidateDocument = gql`
    query GetMyEvaluationForCandidate($replicaCandidateId: ID!) {
  evaluationByReplicaCandidateAndEvaluator(
    replicaCandidateId: $replicaCandidateId
  ) {
    evaluatorAuid
    isComplete
    scores {
      code
      value
    }
    comments {
      id
      propertyId
      text
      voiceUrl
    }
  }
}
    `;
export const GetEvaluationsForCandidateDocument = gql`
    query GetEvaluationsForCandidate($replicaCandidateId: ID!, $limit: Int) {
  evaluationsByReplicaCandidate(
    replicaCandidateId: $replicaCandidateId
    limit: $limit
  ) {
    items {
      id
      evaluatorAuid
      isComplete
      templateEdition {
        id
      }
      scores {
        code
        value
      }
      comments {
        id
        propertyId
        text
        voiceUrl
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
export const DevApproveCompetitionDocument = gql`
    mutation DevApproveCompetition($id: ID!) {
  approveCompetition(id: $id) {
    id
  }
}
    `;
export const DevCreateCompetitionSeriesDocument = gql`
    mutation DevCreateCompetitionSeries($input: CreateCompetitionSeriesInput!) {
  createCompetitionSeries(input: $input) {
    id
    name
  }
}
    `;
export const DevGetBeverageTypesDocument = gql`
    query DevGetBeverageTypes {
  beverageTypes {
    items {
      id
      code
    }
  }
}
    `;
export const DevCreateBeverageDocument = gql`
    mutation DevCreateBeverage($input: CreateBeverageInput!) {
  createBeverage(input: $input) {
    id
  }
}
    `;
export const DevCreateBatchDocument = gql`
    mutation DevCreateBatch($input: CreateBatchInput!) {
  createBatch(input: $input) {
    id
  }
}
    `;
export const DevCreateSampleDocument = gql`
    mutation DevCreateSample($input: CreateSampleInput!) {
  createSample(input: $input) {
    id
  }
}
    `;
export const DevSubmitCompetitionSeriesForReviewDocument = gql`
    mutation DevSubmitCompetitionSeriesForReview($id: ID!) {
  submitCompetitionSeriesForReview(id: $id) {
    id
  }
}
    `;
export const DevApproveCompetitionSeriesDocument = gql`
    mutation DevApproveCompetitionSeries($id: ID!) {
  approveCompetitionSeries(id: $id) {
    id
  }
}
    `;
export const DevCreateCompetitionDocument = gql`
    mutation DevCreateCompetition($input: CreateCompetitionInput!) {
  createCompetition(input: $input) {
    id
    name
  }
}
    `;
export const DevSubmitCompetitionForReviewDocument = gql`
    mutation DevSubmitCompetitionForReview($id: ID!) {
  submitCompetitionForReview(id: $id) {
    id
  }
}
    `;
export const DevPlanCompetitionDocument = gql`
    mutation DevPlanCompetition($id: ID!) {
  planCompetition(id: $id) {
    id
  }
}
    `;
export const DevStartCompetitionDocument = gql`
    mutation DevStartCompetition($id: ID!) {
  startCompetition(id: $id) {
    id
  }
}
    `;
export const DevCreateCommissionDocument = gql`
    mutation DevCreateCommission($input: CreateCommissionInput!) {
  createCommission(input: $input) {
    id
    name
  }
}
    `;
export const DevAddCommissionPanelDocument = gql`
    mutation DevAddCommissionPanel($commissionId: ID!, $name: String!) {
  addCommissionPanel(commissionId: $commissionId, name: $name) {
    id
    name
  }
}
    `;
export const DevAddCommissionCandidatesDocument = gql`
    mutation DevAddCommissionCandidates($commissionId: ID!, $panelId: ID!, $candidates: [AddCommissionCandidateItemInput!]!) {
  addCommissionCandidates(
    commissionId: $commissionId
    panelId: $panelId
    candidates: $candidates
  ) {
    id
  }
}
    `;
export const DevCreateCommissionReplicaDocument = gql`
    mutation DevCreateCommissionReplica($input: CreateCommissionReplicaInput!) {
  createCommissionReplica(input: $input) {
    id
  }
}
    `;
export const DevSubmitCommissionForReviewDocument = gql`
    mutation DevSubmitCommissionForReview($id: ID!) {
  submitCommissionForReview(id: $id) {
    id
  }
}
    `;
export const DevApproveCommissionDocument = gql`
    mutation DevApproveCommission($id: ID!) {
  approveCommission(id: $id) {
    id
  }
}
    `;
export const DevPlanCommissionDocument = gql`
    mutation DevPlanCommission($id: ID!) {
  planCommission(id: $id) {
    id
  }
}
    `;
export const DevStartCommissionDocument = gql`
    mutation DevStartCommission($id: ID!) {
  startCommission(id: $id) {
    id
  }
}
    `;
export const DevAddCommissionReplicaMemberDocument = gql`
    mutation DevAddCommissionReplicaMember($id: ID!, $input: CommissionReplicaMemberInput!) {
  addCommissionReplicaMember(id: $id, input: $input) {
    id
    members {
      id
      auid
    }
  }
}
    `;
export const DevSubmitEvaluationDocument = gql`
    mutation DevSubmitEvaluation($input: SubmitEvaluationInput!) {
  submitEvaluation(input: $input) {
    id
  }
}
    `;
export const DevCreateBeverageTypeDocument = gql`
    mutation DevCreateBeverageType($input: CreateBeverageTypeInput!) {
  createBeverageType(input: $input) {
    id
  }
}
    `;
export const DevPublishBeverageTypeDocument = gql`
    mutation DevPublishBeverageType($id: ID!) {
  publishBeverageType(id: $id) {
    id
  }
}
    `;
export const DevSetCommissionTemplateEditionDocument = gql`
    mutation DevSetCommissionTemplateEdition($id: ID!, $beverageTypeId: ID!, $templateEditionId: ID!) {
  setCommissionTemplateEdition(
    id: $id
    beverageTypeId: $beverageTypeId
    templateEditionId: $templateEditionId
  ) {
    id
  }
}
    `;
export const DevGetEvaluationTemplateEditionsDocument = gql`
    query DevGetEvaluationTemplateEditions {
  evaluationTemplateEditions {
    items {
      id
      status
      template {
        name
        beverageType {
          id
        }
      }
      categories {
        id
      }
    }
  }
}
    `;
export const DevPlanCommissionReplicaDocument = gql`
    mutation DevPlanCommissionReplica($id: ID!) {
  planCommissionReplica(id: $id) {
    id
  }
}
    `;
export const DevStartCommissionReplicaDocument = gql`
    mutation DevStartCommissionReplica($id: ID!) {
  startCommissionReplica(id: $id) {
    id
  }
}
    `;
export const DevMarkCommissionReplicaMemberReadyDocument = gql`
    mutation DevMarkCommissionReplicaMemberReady($id: ID!, $memberId: ID!) {
  markCommissionReplicaMemberReady(id: $id, memberId: $memberId) {
    id
  }
}
    `;
export const DevSetCommissionReplicaCurrentCandidateDocument = gql`
    mutation DevSetCommissionReplicaCurrentCandidate($id: ID!, $currentCandidateId: ID!) {
  setCommissionReplicaCurrentCandidate(
    id: $id
    currentCandidateId: $currentCandidateId
  ) {
    id
  }
}
    `;
export const DevGetCompetitionsListDocument = gql`
    query DevGetCompetitionsList {
  competitions {
    items {
      id
      name
    }
  }
}
    `;
export const DevGetCommissionsByCompetitionDocument = gql`
    query DevGetCommissionsByCompetition($competitionId: ID!, $limit: Int) {
  commissionsByCompetition(competitionId: $competitionId, limit: $limit) {
    items {
      id
      name
    }
  }
}
    `;
export const DevGetCommissionReplicasByCommissionDocument = gql`
    query DevGetCommissionReplicasByCommission($commissionId: ID!) {
  commissionReplicasByCommission(commissionId: $commissionId) {
    id
    type
    members {
      id
      auid
      role
    }
  }
}
    `;
export const GetMyBeveragesDocument = gql`
    query GetMyBeverages($limit: Int, $cursor: ID, $offset: Int, $filter: BeverageFilterInput, $producer: [Int!]) {
  beverages(limit: $limit, cursor: $cursor, offset: $offset, filter: $filter) {
    items {
      id
      name
      status
      typeId
      attributes
      producers {
        id
        auid
        role
      }
      origin {
        latitude
        longitude
      }
    }
  }
  beverageCount(producer: $producer)
}
    `;
export const GetMyCompetitionsDocument = gql`
    query GetMyCompetitions($limit: Int, $cursor: ID, $offset: Int, $filter: CompetitionFilterInput) {
  competitions(limit: $limit, cursor: $cursor, offset: $offset, filter: $filter) {
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
    `;
export const GetDashboardCompetitionsDocument = gql`
    query GetDashboardCompetitions($limit: Int, $cursor: ID, $offset: Int) {
  competitions(limit: $limit, cursor: $cursor, offset: $offset) {
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
  competitionCount
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
    MarkReplicaMemberReady(variables: Types.MarkReplicaMemberReadyMutationVariables, options?: C): Promise<Types.MarkReplicaMemberReadyMutation> {
      return requester<Types.MarkReplicaMemberReadyMutation, Types.MarkReplicaMemberReadyMutationVariables>(MarkReplicaMemberReadyDocument, variables, options) as Promise<Types.MarkReplicaMemberReadyMutation>;
    },
    MarkReplicaMemberNotReady(variables: Types.MarkReplicaMemberNotReadyMutationVariables, options?: C): Promise<Types.MarkReplicaMemberNotReadyMutation> {
      return requester<Types.MarkReplicaMemberNotReadyMutation, Types.MarkReplicaMemberNotReadyMutationVariables>(MarkReplicaMemberNotReadyDocument, variables, options) as Promise<Types.MarkReplicaMemberNotReadyMutation>;
    },
    StartCommissionReplica(variables: Types.StartCommissionReplicaMutationVariables, options?: C): Promise<Types.StartCommissionReplicaMutation> {
      return requester<Types.StartCommissionReplicaMutation, Types.StartCommissionReplicaMutationVariables>(StartCommissionReplicaDocument, variables, options) as Promise<Types.StartCommissionReplicaMutation>;
    },
    GetReplicaCandidates(variables: Types.GetReplicaCandidatesQueryVariables, options?: C): Promise<Types.GetReplicaCandidatesQuery> {
      return requester<Types.GetReplicaCandidatesQuery, Types.GetReplicaCandidatesQueryVariables>(GetReplicaCandidatesDocument, variables, options) as Promise<Types.GetReplicaCandidatesQuery>;
    },
    GetReplicaCandidate(variables: Types.GetReplicaCandidateQueryVariables, options?: C): Promise<Types.GetReplicaCandidateQuery> {
      return requester<Types.GetReplicaCandidateQuery, Types.GetReplicaCandidateQueryVariables>(GetReplicaCandidateDocument, variables, options) as Promise<Types.GetReplicaCandidateQuery>;
    },
    CreateEvaluationTemplate(variables: Types.CreateEvaluationTemplateMutationVariables, options?: C): Promise<Types.CreateEvaluationTemplateMutation> {
      return requester<Types.CreateEvaluationTemplateMutation, Types.CreateEvaluationTemplateMutationVariables>(CreateEvaluationTemplateDocument, variables, options) as Promise<Types.CreateEvaluationTemplateMutation>;
    },
    CreateEvaluationTemplateEdition(variables: Types.CreateEvaluationTemplateEditionMutationVariables, options?: C): Promise<Types.CreateEvaluationTemplateEditionMutation> {
      return requester<Types.CreateEvaluationTemplateEditionMutation, Types.CreateEvaluationTemplateEditionMutationVariables>(CreateEvaluationTemplateEditionDocument, variables, options) as Promise<Types.CreateEvaluationTemplateEditionMutation>;
    },
    ActivateEvaluationTemplateEdition(variables: Types.ActivateEvaluationTemplateEditionMutationVariables, options?: C): Promise<Types.ActivateEvaluationTemplateEditionMutation> {
      return requester<Types.ActivateEvaluationTemplateEditionMutation, Types.ActivateEvaluationTemplateEditionMutationVariables>(ActivateEvaluationTemplateEditionDocument, variables, options) as Promise<Types.ActivateEvaluationTemplateEditionMutation>;
    },
    SetCommissionTemplateEdition(variables: Types.SetCommissionTemplateEditionMutationVariables, options?: C): Promise<Types.SetCommissionTemplateEditionMutation> {
      return requester<Types.SetCommissionTemplateEditionMutation, Types.SetCommissionTemplateEditionMutationVariables>(SetCommissionTemplateEditionDocument, variables, options) as Promise<Types.SetCommissionTemplateEditionMutation>;
    },
    SubmitEvaluation(variables: Types.SubmitEvaluationMutationVariables, options?: C): Promise<Types.SubmitEvaluationMutation> {
      return requester<Types.SubmitEvaluationMutation, Types.SubmitEvaluationMutationVariables>(SubmitEvaluationDocument, variables, options) as Promise<Types.SubmitEvaluationMutation>;
    },
    MarkCommissionReplicaCandidateAsEvaluated(variables: Types.MarkCommissionReplicaCandidateAsEvaluatedMutationVariables, options?: C): Promise<Types.MarkCommissionReplicaCandidateAsEvaluatedMutation> {
      return requester<Types.MarkCommissionReplicaCandidateAsEvaluatedMutation, Types.MarkCommissionReplicaCandidateAsEvaluatedMutationVariables>(MarkCommissionReplicaCandidateAsEvaluatedDocument, variables, options) as Promise<Types.MarkCommissionReplicaCandidateAsEvaluatedMutation>;
    },
    GetMyEvaluationForCandidate(variables: Types.GetMyEvaluationForCandidateQueryVariables, options?: C): Promise<Types.GetMyEvaluationForCandidateQuery> {
      return requester<Types.GetMyEvaluationForCandidateQuery, Types.GetMyEvaluationForCandidateQueryVariables>(GetMyEvaluationForCandidateDocument, variables, options) as Promise<Types.GetMyEvaluationForCandidateQuery>;
    },
    GetEvaluationsForCandidate(variables: Types.GetEvaluationsForCandidateQueryVariables, options?: C): Promise<Types.GetEvaluationsForCandidateQuery> {
      return requester<Types.GetEvaluationsForCandidateQuery, Types.GetEvaluationsForCandidateQueryVariables>(GetEvaluationsForCandidateDocument, variables, options) as Promise<Types.GetEvaluationsForCandidateQuery>;
    },
    GetCompetitionPage(variables: Types.GetCompetitionPageQueryVariables, options?: C): Promise<Types.GetCompetitionPageQuery> {
      return requester<Types.GetCompetitionPageQuery, Types.GetCompetitionPageQueryVariables>(GetCompetitionPageDocument, variables, options) as Promise<Types.GetCompetitionPageQuery>;
    },
    StartCompetition(variables: Types.StartCompetitionMutationVariables, options?: C): Promise<Types.StartCompetitionMutation> {
      return requester<Types.StartCompetitionMutation, Types.StartCompetitionMutationVariables>(StartCompetitionDocument, variables, options) as Promise<Types.StartCompetitionMutation>;
    },
    DevApproveCompetition(variables: Types.DevApproveCompetitionMutationVariables, options?: C): Promise<Types.DevApproveCompetitionMutation> {
      return requester<Types.DevApproveCompetitionMutation, Types.DevApproveCompetitionMutationVariables>(DevApproveCompetitionDocument, variables, options) as Promise<Types.DevApproveCompetitionMutation>;
    },
    DevCreateCompetitionSeries(variables: Types.DevCreateCompetitionSeriesMutationVariables, options?: C): Promise<Types.DevCreateCompetitionSeriesMutation> {
      return requester<Types.DevCreateCompetitionSeriesMutation, Types.DevCreateCompetitionSeriesMutationVariables>(DevCreateCompetitionSeriesDocument, variables, options) as Promise<Types.DevCreateCompetitionSeriesMutation>;
    },
    DevGetBeverageTypes(variables?: Types.DevGetBeverageTypesQueryVariables, options?: C): Promise<Types.DevGetBeverageTypesQuery> {
      return requester<Types.DevGetBeverageTypesQuery, Types.DevGetBeverageTypesQueryVariables>(DevGetBeverageTypesDocument, variables, options) as Promise<Types.DevGetBeverageTypesQuery>;
    },
    DevCreateBeverage(variables: Types.DevCreateBeverageMutationVariables, options?: C): Promise<Types.DevCreateBeverageMutation> {
      return requester<Types.DevCreateBeverageMutation, Types.DevCreateBeverageMutationVariables>(DevCreateBeverageDocument, variables, options) as Promise<Types.DevCreateBeverageMutation>;
    },
    DevCreateBatch(variables: Types.DevCreateBatchMutationVariables, options?: C): Promise<Types.DevCreateBatchMutation> {
      return requester<Types.DevCreateBatchMutation, Types.DevCreateBatchMutationVariables>(DevCreateBatchDocument, variables, options) as Promise<Types.DevCreateBatchMutation>;
    },
    DevCreateSample(variables: Types.DevCreateSampleMutationVariables, options?: C): Promise<Types.DevCreateSampleMutation> {
      return requester<Types.DevCreateSampleMutation, Types.DevCreateSampleMutationVariables>(DevCreateSampleDocument, variables, options) as Promise<Types.DevCreateSampleMutation>;
    },
    DevSubmitCompetitionSeriesForReview(variables: Types.DevSubmitCompetitionSeriesForReviewMutationVariables, options?: C): Promise<Types.DevSubmitCompetitionSeriesForReviewMutation> {
      return requester<Types.DevSubmitCompetitionSeriesForReviewMutation, Types.DevSubmitCompetitionSeriesForReviewMutationVariables>(DevSubmitCompetitionSeriesForReviewDocument, variables, options) as Promise<Types.DevSubmitCompetitionSeriesForReviewMutation>;
    },
    DevApproveCompetitionSeries(variables: Types.DevApproveCompetitionSeriesMutationVariables, options?: C): Promise<Types.DevApproveCompetitionSeriesMutation> {
      return requester<Types.DevApproveCompetitionSeriesMutation, Types.DevApproveCompetitionSeriesMutationVariables>(DevApproveCompetitionSeriesDocument, variables, options) as Promise<Types.DevApproveCompetitionSeriesMutation>;
    },
    DevCreateCompetition(variables: Types.DevCreateCompetitionMutationVariables, options?: C): Promise<Types.DevCreateCompetitionMutation> {
      return requester<Types.DevCreateCompetitionMutation, Types.DevCreateCompetitionMutationVariables>(DevCreateCompetitionDocument, variables, options) as Promise<Types.DevCreateCompetitionMutation>;
    },
    DevSubmitCompetitionForReview(variables: Types.DevSubmitCompetitionForReviewMutationVariables, options?: C): Promise<Types.DevSubmitCompetitionForReviewMutation> {
      return requester<Types.DevSubmitCompetitionForReviewMutation, Types.DevSubmitCompetitionForReviewMutationVariables>(DevSubmitCompetitionForReviewDocument, variables, options) as Promise<Types.DevSubmitCompetitionForReviewMutation>;
    },
    DevPlanCompetition(variables: Types.DevPlanCompetitionMutationVariables, options?: C): Promise<Types.DevPlanCompetitionMutation> {
      return requester<Types.DevPlanCompetitionMutation, Types.DevPlanCompetitionMutationVariables>(DevPlanCompetitionDocument, variables, options) as Promise<Types.DevPlanCompetitionMutation>;
    },
    DevStartCompetition(variables: Types.DevStartCompetitionMutationVariables, options?: C): Promise<Types.DevStartCompetitionMutation> {
      return requester<Types.DevStartCompetitionMutation, Types.DevStartCompetitionMutationVariables>(DevStartCompetitionDocument, variables, options) as Promise<Types.DevStartCompetitionMutation>;
    },
    DevCreateCommission(variables: Types.DevCreateCommissionMutationVariables, options?: C): Promise<Types.DevCreateCommissionMutation> {
      return requester<Types.DevCreateCommissionMutation, Types.DevCreateCommissionMutationVariables>(DevCreateCommissionDocument, variables, options) as Promise<Types.DevCreateCommissionMutation>;
    },
    DevAddCommissionPanel(variables: Types.DevAddCommissionPanelMutationVariables, options?: C): Promise<Types.DevAddCommissionPanelMutation> {
      return requester<Types.DevAddCommissionPanelMutation, Types.DevAddCommissionPanelMutationVariables>(DevAddCommissionPanelDocument, variables, options) as Promise<Types.DevAddCommissionPanelMutation>;
    },
    DevAddCommissionCandidates(variables: Types.DevAddCommissionCandidatesMutationVariables, options?: C): Promise<Types.DevAddCommissionCandidatesMutation> {
      return requester<Types.DevAddCommissionCandidatesMutation, Types.DevAddCommissionCandidatesMutationVariables>(DevAddCommissionCandidatesDocument, variables, options) as Promise<Types.DevAddCommissionCandidatesMutation>;
    },
    DevCreateCommissionReplica(variables: Types.DevCreateCommissionReplicaMutationVariables, options?: C): Promise<Types.DevCreateCommissionReplicaMutation> {
      return requester<Types.DevCreateCommissionReplicaMutation, Types.DevCreateCommissionReplicaMutationVariables>(DevCreateCommissionReplicaDocument, variables, options) as Promise<Types.DevCreateCommissionReplicaMutation>;
    },
    DevSubmitCommissionForReview(variables: Types.DevSubmitCommissionForReviewMutationVariables, options?: C): Promise<Types.DevSubmitCommissionForReviewMutation> {
      return requester<Types.DevSubmitCommissionForReviewMutation, Types.DevSubmitCommissionForReviewMutationVariables>(DevSubmitCommissionForReviewDocument, variables, options) as Promise<Types.DevSubmitCommissionForReviewMutation>;
    },
    DevApproveCommission(variables: Types.DevApproveCommissionMutationVariables, options?: C): Promise<Types.DevApproveCommissionMutation> {
      return requester<Types.DevApproveCommissionMutation, Types.DevApproveCommissionMutationVariables>(DevApproveCommissionDocument, variables, options) as Promise<Types.DevApproveCommissionMutation>;
    },
    DevPlanCommission(variables: Types.DevPlanCommissionMutationVariables, options?: C): Promise<Types.DevPlanCommissionMutation> {
      return requester<Types.DevPlanCommissionMutation, Types.DevPlanCommissionMutationVariables>(DevPlanCommissionDocument, variables, options) as Promise<Types.DevPlanCommissionMutation>;
    },
    DevStartCommission(variables: Types.DevStartCommissionMutationVariables, options?: C): Promise<Types.DevStartCommissionMutation> {
      return requester<Types.DevStartCommissionMutation, Types.DevStartCommissionMutationVariables>(DevStartCommissionDocument, variables, options) as Promise<Types.DevStartCommissionMutation>;
    },
    DevAddCommissionReplicaMember(variables: Types.DevAddCommissionReplicaMemberMutationVariables, options?: C): Promise<Types.DevAddCommissionReplicaMemberMutation> {
      return requester<Types.DevAddCommissionReplicaMemberMutation, Types.DevAddCommissionReplicaMemberMutationVariables>(DevAddCommissionReplicaMemberDocument, variables, options) as Promise<Types.DevAddCommissionReplicaMemberMutation>;
    },
    DevSubmitEvaluation(variables: Types.DevSubmitEvaluationMutationVariables, options?: C): Promise<Types.DevSubmitEvaluationMutation> {
      return requester<Types.DevSubmitEvaluationMutation, Types.DevSubmitEvaluationMutationVariables>(DevSubmitEvaluationDocument, variables, options) as Promise<Types.DevSubmitEvaluationMutation>;
    },
    DevCreateBeverageType(variables: Types.DevCreateBeverageTypeMutationVariables, options?: C): Promise<Types.DevCreateBeverageTypeMutation> {
      return requester<Types.DevCreateBeverageTypeMutation, Types.DevCreateBeverageTypeMutationVariables>(DevCreateBeverageTypeDocument, variables, options) as Promise<Types.DevCreateBeverageTypeMutation>;
    },
    DevPublishBeverageType(variables: Types.DevPublishBeverageTypeMutationVariables, options?: C): Promise<Types.DevPublishBeverageTypeMutation> {
      return requester<Types.DevPublishBeverageTypeMutation, Types.DevPublishBeverageTypeMutationVariables>(DevPublishBeverageTypeDocument, variables, options) as Promise<Types.DevPublishBeverageTypeMutation>;
    },
    DevSetCommissionTemplateEdition(variables: Types.DevSetCommissionTemplateEditionMutationVariables, options?: C): Promise<Types.DevSetCommissionTemplateEditionMutation> {
      return requester<Types.DevSetCommissionTemplateEditionMutation, Types.DevSetCommissionTemplateEditionMutationVariables>(DevSetCommissionTemplateEditionDocument, variables, options) as Promise<Types.DevSetCommissionTemplateEditionMutation>;
    },
    DevGetEvaluationTemplateEditions(variables?: Types.DevGetEvaluationTemplateEditionsQueryVariables, options?: C): Promise<Types.DevGetEvaluationTemplateEditionsQuery> {
      return requester<Types.DevGetEvaluationTemplateEditionsQuery, Types.DevGetEvaluationTemplateEditionsQueryVariables>(DevGetEvaluationTemplateEditionsDocument, variables, options) as Promise<Types.DevGetEvaluationTemplateEditionsQuery>;
    },
    DevPlanCommissionReplica(variables: Types.DevPlanCommissionReplicaMutationVariables, options?: C): Promise<Types.DevPlanCommissionReplicaMutation> {
      return requester<Types.DevPlanCommissionReplicaMutation, Types.DevPlanCommissionReplicaMutationVariables>(DevPlanCommissionReplicaDocument, variables, options) as Promise<Types.DevPlanCommissionReplicaMutation>;
    },
    DevStartCommissionReplica(variables: Types.DevStartCommissionReplicaMutationVariables, options?: C): Promise<Types.DevStartCommissionReplicaMutation> {
      return requester<Types.DevStartCommissionReplicaMutation, Types.DevStartCommissionReplicaMutationVariables>(DevStartCommissionReplicaDocument, variables, options) as Promise<Types.DevStartCommissionReplicaMutation>;
    },
    DevMarkCommissionReplicaMemberReady(variables: Types.DevMarkCommissionReplicaMemberReadyMutationVariables, options?: C): Promise<Types.DevMarkCommissionReplicaMemberReadyMutation> {
      return requester<Types.DevMarkCommissionReplicaMemberReadyMutation, Types.DevMarkCommissionReplicaMemberReadyMutationVariables>(DevMarkCommissionReplicaMemberReadyDocument, variables, options) as Promise<Types.DevMarkCommissionReplicaMemberReadyMutation>;
    },
    DevSetCommissionReplicaCurrentCandidate(variables: Types.DevSetCommissionReplicaCurrentCandidateMutationVariables, options?: C): Promise<Types.DevSetCommissionReplicaCurrentCandidateMutation> {
      return requester<Types.DevSetCommissionReplicaCurrentCandidateMutation, Types.DevSetCommissionReplicaCurrentCandidateMutationVariables>(DevSetCommissionReplicaCurrentCandidateDocument, variables, options) as Promise<Types.DevSetCommissionReplicaCurrentCandidateMutation>;
    },
    DevGetCompetitionsList(variables?: Types.DevGetCompetitionsListQueryVariables, options?: C): Promise<Types.DevGetCompetitionsListQuery> {
      return requester<Types.DevGetCompetitionsListQuery, Types.DevGetCompetitionsListQueryVariables>(DevGetCompetitionsListDocument, variables, options) as Promise<Types.DevGetCompetitionsListQuery>;
    },
    DevGetCommissionsByCompetition(variables: Types.DevGetCommissionsByCompetitionQueryVariables, options?: C): Promise<Types.DevGetCommissionsByCompetitionQuery> {
      return requester<Types.DevGetCommissionsByCompetitionQuery, Types.DevGetCommissionsByCompetitionQueryVariables>(DevGetCommissionsByCompetitionDocument, variables, options) as Promise<Types.DevGetCommissionsByCompetitionQuery>;
    },
    DevGetCommissionReplicasByCommission(variables: Types.DevGetCommissionReplicasByCommissionQueryVariables, options?: C): Promise<Types.DevGetCommissionReplicasByCommissionQuery> {
      return requester<Types.DevGetCommissionReplicasByCommissionQuery, Types.DevGetCommissionReplicasByCommissionQueryVariables>(DevGetCommissionReplicasByCommissionDocument, variables, options) as Promise<Types.DevGetCommissionReplicasByCommissionQuery>;
    },
    GetMyBeverages(variables?: Types.GetMyBeveragesQueryVariables, options?: C): Promise<Types.GetMyBeveragesQuery> {
      return requester<Types.GetMyBeveragesQuery, Types.GetMyBeveragesQueryVariables>(GetMyBeveragesDocument, variables, options) as Promise<Types.GetMyBeveragesQuery>;
    },
    GetMyCompetitions(variables?: Types.GetMyCompetitionsQueryVariables, options?: C): Promise<Types.GetMyCompetitionsQuery> {
      return requester<Types.GetMyCompetitionsQuery, Types.GetMyCompetitionsQueryVariables>(GetMyCompetitionsDocument, variables, options) as Promise<Types.GetMyCompetitionsQuery>;
    },
    GetDashboardCompetitions(variables?: Types.GetDashboardCompetitionsQueryVariables, options?: C): Promise<Types.GetDashboardCompetitionsQuery> {
      return requester<Types.GetDashboardCompetitionsQuery, Types.GetDashboardCompetitionsQueryVariables>(GetDashboardCompetitionsDocument, variables, options) as Promise<Types.GetDashboardCompetitionsQuery>;
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;