import { gql } from "@/src/gql"

export const GET_COMMISSION_RESULTS = gql(`
  query GetCommissionResults($id: ID!) {
    commission(id: $id) {
      id
      name
      status
      candidates {
        id
        anonymizedCode
        beverageType
        sample {
          batch {
            beverage {
              id
              name
            }
          }
        }
      }
      replicas {
        id
        name
        type
        status
        replicaCandidates {
          id
          status
          candidate {
            id
          }
          evaluations {
            id
            isComplete
            evaluatorAuid
            scores {
              code
              value
            }
          }
        }
      }
    }
  }
`)

export const GET_BEVERAGE_AWARDS = gql(`
  query GetBeverageAwards($beverageId: ID!) {
    beverageAwards(beverageId: $beverageId) {
      id
      commissionId
      award {
        id
        name
        code
        badgeUrl
      }
    }
  }
`)