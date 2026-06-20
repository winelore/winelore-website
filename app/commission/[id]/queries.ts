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
      members {
        id
        auid
        role
        isReady
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

export const START_COMMISSION = gql(`
  mutation StartCommission($id: ID!) {
    startCommission(id: $id) {
      id
      status
      startedAt
    }
  }
`);

export const COMPLETE_COMMISSION = gql(`
  mutation CompleteCommission($id: ID!) {
    completeCommission(id: $id) {
      id
      status
      endedAt
    }
  }
`);

export const GET_COMMISSION_CANDIDATES = gql(`
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
`);