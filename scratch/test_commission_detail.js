const endpoint = 'https://winelore-dev.thewinelore.com/graphql';

async function testCommissionQuery() {
  const detailQ = `
    query GetCommDetail($id: ID!) {
      commission(id: $id) {
        id
        name
        status
        panels {
          id
          name
          candidates {
            id
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
        replicas {
          id
          name
          type
          status
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
    body: JSON.stringify({ query: detailQ, variables: { id: "7842136d-8d1b-4031-a156-571a7a255c55" } })
  });
  const dData = await dRes.json();
  console.log('Detail:', JSON.stringify(dData, null, 2));
}

testCommissionQuery();
