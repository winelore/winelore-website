/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import * as Types from './graphql';

import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
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

export type GetCommissionQueryVariables = Exact<{
  id: string | number;
}>;


export type GetCommissionQuery = { commission: { id: string, name: string, status: Types.CommissionStatus, startedAt: string | null, endedAt: string | null, createdAt: string, wineJumperMiniGameEnabled: boolean, voiceCommentsEnabled: boolean, propertyCommentsEnabled: boolean, beverageOriginDuringEvaluationEnabled: boolean, plannedDates: { start: string | null, end: string | null } | null, panels: Array<{ id: string, name: string }>, candidates: Array<{ id: string, panelId: string }>, competition: { id: string, name: string, holders: Array<Array<number>> }, replicas: Array<{ id: string, name: string | null, type: Types.CommissionReplicaType, status: Types.CommissionReplicaStatus, currentCandidateId: string | null, members: Array<{ id: string, auid: Array<number>, role: Types.CommissionReplicaMemberRole, isReady: boolean }>, replicaCandidates: Array<{ id: string, status: Types.CommissionReplicaCandidateStatus, candidate: { id: string, anonymizedCode: string | null, panelId: string } }> }> } | null };

export type GetCommissionTemplatesQueryVariables = Exact<{
  id: string | number;
}>;


export type GetCommissionTemplatesQuery = { commission: { id: string, templateEditions: Array<{ id: string, beverageType: { id: string, code: string, name: string }, templateEdition: { id: string, version: number, status: Types.EvaluationTemplateEditionStatus, categories: Array<{ id: string, name: string, properties: Array<
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

export type GetMyBeveragesQueryVariables = Exact<{
  limit?: number | null | undefined;
  filter?: Types.BeverageFilterInput | null | undefined;
}>;


export type GetMyBeveragesQuery = { beverages: { items: Array<{ id: string, name: string, status: Types.BeverageStatus, typeId: string, attributes: string, producers: Array<{ id: string, auid: Array<number>, role: Types.ProducerRole }>, origin: { latitude: number, longitude: number } | null }> } };

export type GetMyCompetitionsQueryVariables = Exact<{
  limit?: number | null | undefined;
  filter?: Types.CompetitionFilterInput | null | undefined;
}>;


export type GetMyCompetitionsQuery = { competitions: { items: Array<{ id: string, name: string, status: Types.CompetitionStatus, startedAt: string | null, endedAt: string | null, holders: Array<Array<number>>, plannedDates: { start: string | null, end: string | null } | null, series: { id: string, name: string } }> } };

export type GetDashboardCompetitionsQueryVariables = Exact<{
  limit?: number | null | undefined;
  cursor?: string | number | null | undefined;
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
export const GetMyBeveragesDocument = gql`
    query GetMyBeverages($limit: Int, $filter: BeverageFilterInput) {
  beverages(limit: $limit, filter: $filter) {
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
}
    `;
export const GetMyCompetitionsDocument = gql`
    query GetMyCompetitions($limit: Int, $filter: CompetitionFilterInput) {
  competitions(limit: $limit, filter: $filter) {
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
    query GetDashboardCompetitions($limit: Int, $cursor: ID) {
  competitions(limit: $limit, cursor: $cursor) {
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