export const GET_COMMISSION_RESULTS = `
  query GetCommissionResults($id: ID!) {
    commission(id: $id) {
      id
      name
      status
      voiceCommentsEnabled
      propertyCommentsEnabled
      competition {
        holders
      }
      outcomePolicyEdition {
        id
        scriptCode
        calculationScope
        outputProperties {
          code
          name
          isResult
        }
      }
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
            attributes
            beverage {
              id
              name
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
