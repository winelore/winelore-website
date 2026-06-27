export const GET_COMMISSION_RESULTS = `
  query GetCommissionResults($id: ID!) {
    commission(id: $id) {
      id
      name
      status
      competition {
        voiceCommentsEnabled
        propertyCommentsEnabled
      }
      policyEdition {
        id
        scriptCode
        calculationScope
      }
      candidates {
        id
        anonymizedCode
        beverageType
        sample {
          id
          batch {
            beverage {
              id
              name
              producers {
                id
                auid
                role
              }
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
        outcomes {
          beverageId
          scores
        }
        replicaCandidates {
          id
          status
          candidate {
            id
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
