const endpoint = 'https://winelore-dev.thewinelore.com/graphql';

async function testFullCommissionDetail() {
  const commListQ = `
    query GetCommissions {
      commissions(limit: 5) {
        items {
          id
          name
        }
      }
    }
  `;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: commListQ })
  });
  const data = await res.json();
  const id = data.data?.commissions?.items?.[0]?.id;
  console.log('Testing with commission id:', id);

  const query = `
    query GetCommissionDetail($id: ID!) {
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
          candidates {
            id
            anonymizedCode
            panelId
            sample {
              id
              volumeMl
              batch {
                id
                lotNumber
                volumeMl
                beverage {
                  id
                  name
                }
              }
            }
          }
        }
        candidates {
          id
          panelId
          anonymizedCode
          sample {
            id
            volumeMl
            batch {
              id
              lotNumber
              volumeMl
              beverage {
                id
                name
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

  const dRes = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { id } })
  });
  const dData = await dRes.json();
  console.log('Commission Detail Result:', JSON.stringify(dData, null, 2));
}

testFullCommissionDetail();
