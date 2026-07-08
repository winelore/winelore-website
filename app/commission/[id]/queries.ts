import { gql } from '@/src/gql';

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
      startedAt
      endedAt
      createdAt
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
        beverageType
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
`);

export const GET_CANDIDATE_COUNT = gql(`
  query GetCommissionCandidateCount($commissionId: ID!) {
    commissionCandidateCount(commissionId: $commissionId)
  }
`);

export const MARK_MEMBER_READY = gql(`
  mutation MarkReplicaMemberReady($replicaId: ID!, $memberId: ID!) {
    markCommissionReplicaMemberReady(id: $replicaId, memberId: $memberId) {
      id
      members {
        id
        isReady
      }
    }
  }
`);

export const MARK_MEMBER_NOT_READY = gql(`
  mutation MarkReplicaMemberNotReady($replicaId: ID!, $memberId: ID!) {
    markCommissionReplicaMemberNotReady(id: $replicaId, memberId: $memberId) {
      id
      members {
        id
        isReady
      }
    }
  }
`);

export const START_COMMISSION = gql(`
  mutation StartCommissionReplica($id: ID!) {
    startCommissionReplica(id: $id) {
      id
      status
    }
  }
`);

export const COMPLETE_COMMISSION = gql(`
  mutation CompleteCommissionReplica($id: ID!) {
    completeCommissionReplica(id: $id) {
      id
      status
    }
  }
`);

export const GET_REPLICA_CANDIDATES = gql(`
  query GetReplicaCandidates($replicaId: ID!) {
    commissionReplica(id: $replicaId) {
      id
      status
      replicaCandidates {
        id
        status
        candidate {
          id
          anonymizedCode
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
                ... on Wine {
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
            vintage
            beverage {
              id
              name
              status
              ... on Wine {
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
`);

export const CREATE_EVALUATION_TEMPLATE = gql(`
  mutation CreateEvaluationTemplate($input: CreateEvaluationTemplateInput!) {
    createEvaluationTemplate(input: $input) {
      id
      name
    }
  }
`);

export const CREATE_EVALUATION_TEMPLATE_EDITION = gql(`
  mutation CreateEvaluationTemplateEdition($input: CreateEvaluationTemplateEditionInput!) {
    createEvaluationTemplateEdition(input: $input) {
      id
      version
    }
  }
`);

export const ACTIVATE_EVALUATION_TEMPLATE_EDITION = gql(`
  mutation ActivateEvaluationTemplateEdition($id: ID!) {
    activateEvaluationTemplateEdition(id: $id) {
      id
      status
    }
  }
`);

export const SET_COMMISSION_TEMPLATE_EDITION = gql(`
  mutation SetCommissionTemplateEdition($id: ID!, $beverageType: BeverageType!, $templateEditionId: ID!) {
    setCommissionTemplateEdition(id: $id, beverageType: $beverageType, templateEditionId: $templateEditionId) {
      id
    }
  }
`);

export const SUBMIT_EVALUATION = gql(`
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
`);

export const MARK_CANDIDATE_EVALUATED = gql(`
  mutation MarkCommissionReplicaCandidateAsEvaluated($id: ID!) {
    markCommissionReplicaCandidateAsEvaluated(id: $id) {
      id
      status
    }
  }
`);