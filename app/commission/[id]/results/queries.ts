export const GET_COMMISSION_RESULTS = `
  query GetCommissionResults($id: ID!) {
    commission(id: $id) {
      id
      name
      status
      competition {
        holders
        voiceCommentsEnabled
        propertyCommentsEnabled
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
        beverageType
        sample {
          id
          volumeMl
          batch {
            id
            vintage
            beverage {
              id
              name
              producers {
                id
                auid
                role
              }
              ... on Wine {
                type
                origin {
                  latitude
                  longitude
                }
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
