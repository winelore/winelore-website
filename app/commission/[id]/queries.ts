import { gql } from '@winelore/core/gql';

export const GET_COMMISSION = gql(`
  query GetCommission($id: ID!) {
    commission(id: $id) {
      id
      name
      status
      plannedDates {
        start
        end
      }
      evaluationVisibleAttributes {
          beverage
          batch
          sample
      }
      startedAt
      endedAt
      createdAt
      wineJumperMiniGameEnabled
      voiceCommentsEnabled
      propertyCommentsEnabled
      beverageOriginDuringEvaluationEnabled
      partialCandidateEvaluationEnabled
      discussionPolicy
      panels {
        id
        name
        candidates {
          id
          anonymizedCode
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
              lotNumber
              attributes
              beverage {
                id
                name
                status
                attributes
                producers {
                  auid
                  producerId
                }
              }
            }
          }
        }
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
        currentPanelId
        chaoticCurrentPanelChangesEnabled
        members {
          id
          auid
          role
          isReady
        }
        replicaPanels {
          id
          status
          currentCandidateId
          chaoticCurrentCandidateChangesEnabled
          panel {
            id
            name
          }
          replicaCandidates {
            id
            status
            candidate {
              id
              anonymizedCode
              beverageType {
                id
                code
                name
              }
            }
          }
        }
      }
    }
  }
`);

export const GET_COMMISSION_TEMPLATES = gql(`
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
                    operator
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
                        operator
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
                        operator
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
`);

export const GET_COMMISSION_FOR_AWARD = gql(`
  query GetCommissionForAward($id: ID!) {
    commission(id: $id) {
      id
      name
      competition {
        id
        name
        status
        plannedDates {
          start
          end
        }
        startedAt
        endedAt
        series {
          id
          name
        }
      }
    }
  }
`);

export const SET_COMMISSION_TEMPLATE_EDITION = gql(`
  mutation SetCommissionTemplateEdition($id: ID!, $templateEditionId: ID!, $beverageTypeId: ID!) {
    setCommissionTemplateEdition(id: $id, templateEditionId: $templateEditionId, beverageTypeId: $beverageTypeId) {
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
        }
      }
    }
  }
`);

export const REMOVE_COMMISSION_TEMPLATE_EDITION = gql(`
  mutation RemoveCommissionTemplateEdition($id: ID!, $beverageTypeId: ID!) {
    removeCommissionTemplateEdition(id: $id, beverageTypeId: $beverageTypeId) {
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
        }
      }
    }
  }
`);

export const SUBMIT_EVALUATION = gql(`
  mutation SubmitEvaluation($input: SubmitEvaluationInput!) {
    submitEvaluation(input: $input) {
      id
      status
    }
  }
`);

export const SUBMIT_EVALUATION_WITH_AUTOCONFIRMATION = gql(`
  mutation SubmitEvaluationWithAutoConfirmation($input: SubmitEvaluationInput!) {
    submitEvaluation(input: $input) {
      id
      status
    }
  }
`);

export const START_COMMISSION_REPLICA = gql(`
  mutation StartCommissionReplica($id: ID!) {
    startCommissionReplica(id: $id) {
      id
      status
    }
  }
`);

export const SET_COMMISSION_REPLICA_PANEL_CURRENT_CANDIDATE = gql(`
  mutation SetCommissionReplicaPanelCurrentCandidate($id: ID!, $panelId: ID!, $candidateId: ID!) {
    setCommissionReplicaPanelCurrentCandidate(id: $id, panelId: $panelId, candidateId: $candidateId) {
      id
      currentCandidateId
    }
  }
`);

export const SET_COMMISSION_REPLICA_PANEL_CHAOTIC_CURRENT_CANDIDATE_CHANGES_ENABLED = gql(`
  mutation SetCommissionReplicaPanelChaoticCurrentCandidateChangesEnabled($id: ID!, $panelId: ID!, $enabled: Boolean!) {
    setCommissionReplicaPanelChaoticCurrentCandidateChangesEnabled(id: $id, panelId: $panelId, enabled: $enabled) {
      id
      chaoticCurrentCandidateChangesEnabled
    }
  }
`);

export const SET_COMMISSION_REPLICA_CURRENT_PANEL = gql(`
  mutation SetCommissionReplicaCurrentPanel($id: ID!, $panelId: ID!) {
    setCommissionReplicaCurrentPanel(id: $id, panelId: $panelId) {
      id
      currentPanelId
    }
  }
`);

export const SET_COMMISSION_REPLICA_CHAOTIC_CURRENT_PANEL_CHANGES_ENABLED = gql(`
  mutation SetCommissionReplicaChaoticCurrentPanelChangesEnabled($id: ID!, $enabled: Boolean!) {
    setCommissionReplicaChaoticCurrentPanelChangesEnabled(id: $id, enabled: $enabled) {
      id
      chaoticCurrentPanelChangesEnabled
    }
  }
`);

export const SET_COMMISSION_EVALUATION_VISIBLE_ATTRIBUTES = gql(`
  mutation SetCommissionEvaluationVisibleAttributes($id: ID!, $input: EvaluationVisibleAttributesInput!) {
    setCommissionEvaluationVisibleAttributes(id: $id, input: $input) {
      id
      evaluationVisibleAttributes {
        beverage
        batch
        sample
      }
    }
  }
`);

export const SET_COMMISSION_WINE_JUMPER_MINI_GAME_ENABLED = gql(`
  mutation SetCommissionWineJumperMiniGameEnabled($id: ID!, $enabled: Boolean!) {
    setCommissionWineJumperMiniGameEnabled(id: $id, enabled: $enabled) {
      id
      wineJumperMiniGameEnabled
    }
  }
`);

export const SET_COMMISSION_VOICE_COMMENTS_ENABLED = gql(`
  mutation SetCommissionVoiceCommentsEnabled($id: ID!, $enabled: Boolean!) {
    setCommissionVoiceCommentsEnabled(id: $id, enabled: $enabled) {
      id
      voiceCommentsEnabled
    }
  }
`);

export const SET_COMMISSION_PROPERTY_COMMENTS_ENABLED = gql(`
  mutation SetCommissionPropertyCommentsEnabled($id: ID!, $enabled: Boolean!) {
    setCommissionPropertyCommentsEnabled(id: $id, enabled: $enabled) {
      id
      propertyCommentsEnabled
    }
  }
`);

export const SET_COMMISSION_BEVERAGE_ORIGIN_DURING_EVALUATION_ENABLED = gql(`
  mutation SetCommissionBeverageOriginDuringEvaluationEnabled($id: ID!, $enabled: Boolean!) {
    setCommissionBeverageOriginDuringEvaluationEnabled(id: $id, enabled: $enabled) {
      id
      beverageOriginDuringEvaluationEnabled
    }
  }
`);

export const SET_COMMISSION_PARTIAL_CANDIDATE_EVALUATION_ENABLED = gql(`
  mutation SetCommissionPartialCandidateEvaluationEnabled($id: ID!, $enabled: Boolean!) {
    setCommissionPartialCandidateEvaluationEnabled(id: $id, enabled: $enabled) {
      id
      partialCandidateEvaluationEnabled
    }
  }
`);

export const DEV_START_COMMISSION = gql(`
  mutation DevStartCommission($id: ID!) {
    startCommission(id: $id) {
      id
      status
    }
  }
`);

export const DEV_START_COMPETITION = gql(`
  mutation DevStartCompetition($id: ID!) {
    startCompetition(id: $id) {
      id
      status
    }
  }
`);

export const DEV_PLAN_COMPETITION = gql(`
  mutation DevPlanCompetition($id: ID!) {
    planCompetition(id: $id) {
      id
      status
    }
  }
`);

export const DEV_PLAN_COMMISSION = gql(`
  mutation DevPlanCommission($id: ID!) {
    planCommission(id: $id) {
      id
      status
    }
  }
`);

export const DEV_PLAN_COMMISSION_REPLICA = gql(`
  mutation DevPlanCommissionReplica($id: ID!) {
    planCommissionReplica(id: $id) {
      id
      status
    }
  }
`);

export const DEV_APPROVE_COMPETITION = gql(`
  mutation DevApproveCompetition($id: ID!) {
    approveCompetition(id: $id) {
      id
    }
  }
`);

export const DEV_APPROVE_COMMISSION = gql(`
  mutation DevApproveCommission($id: ID!) {
    approveCommission(id: $id) {
      id
    }
  }
`);

export const DEV_SUBMIT_COMPETITION_SERIES_FOR_REVIEW = gql(`
  mutation DevSubmitCompetitionSeriesForReview($id: ID!) {
    submitCompetitionSeriesForReview(id: $id) {
      id
      status
    }
  }
`);

export const DEV_SUBMIT_COMPETITION_FOR_REVIEW = gql(`
  mutation DevSubmitCompetitionForReview($id: ID!) {
    submitCompetitionForReview(id: $id) {
      id
      status
    }
  }
`);

export const DEV_SUBMIT_COMMISSION_FOR_REVIEW = gql(`
  mutation DevSubmitCommissionForReview($id: ID!) {
    submitCommissionForReview(id: $id) {
      id
      status
    }
  }
`);

export const DEV_APPROVE_COMPETITION_SERIES = gql(`
  mutation DevApproveCompetitionSeries($id: ID!) {
    approveCompetitionSeries(id: $id) {
      id
      status
    }
  }
`);

export const GET_REPLICA_CANDIDATES = gql(`
  query GetReplicaCandidates($replicaId: ID!) {
    commissionReplica(id: $replicaId) {
      id
      replicaPanels {
        id
        status
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
              batch {
                id
                beverage {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`);

export const GET_REPLICA_CANDIDATE = gql(`
  query GetReplicaCandidate($id: ID!) {
    commissionReplicaCandidate(id: $id) {
      id
      status
      replica {
        id
        name
        status
      }
      candidate {
        id
        anonymizedCode
        panelId
        sample {
          id
          batch {
            id
            attributes
            beverage {
              id
              name
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
`);

export const CONFIRM_EVALUATION = gql(`
  mutation ConfirmEvaluation($id: ID!) {
    confirmEvaluation(id: $id) {
      id
      status
    }
  }
`);

export const GET_EVALUATIONS_FOR_CANDIDATE = gql(`
  query GetEvaluationsForCandidate($replicaCandidateId: ID!) {
    evaluationsByReplicaCandidate(replicaCandidateId: $replicaCandidateId) {
      items {
        id
        status
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
`);

export const SET_COMMISSION_DISCUSSION_POLICY = gql(`
  mutation SetCommissionDiscussionPolicy($id: ID!, $policy: DiscussionPolicy!) {
    setCommissionDiscussionPolicy(id: $id, policy: $policy) {
      id
      discussionPolicy
    }
  }
`);