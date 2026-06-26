export const GET_COMMISSION_RESULTS = `
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
        members {
          id
        }
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
`

export const GET_BEVERAGE_AWARDS = `
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
`