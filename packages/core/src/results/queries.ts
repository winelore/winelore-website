/**
 * Result queries, sent as raw strings.
 *
 * Kept out of the generated SDK deliberately: both the web app and the Expo app
 * send these, and the deep nesting here is easier to read and adjust as a
 * string than as a generated document.
 */
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
            attributes
            beverage {
              id
              name
              attributes
              producers {
                id
                auid
                producerId
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
      }
      replicas {
        id
        name
        type
        status
        members {
          id
          auid
          role
        }
        outcomes {
          beverageId
          scores
        }
        replicaPanels {
          id
          panel { id }
          replicaCandidates {
            id
            status
            candidate { id }
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
