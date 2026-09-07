// test hierarchy

// Let's test GraphQL query directly
async function test() {
  const endpoint = 'https://winelore-dev.thewinelore.com/graphql';
  
  const query = `
    query TestHierarchy {
      beverages(limit: 10) {
        items {
          id
          name
          status
        }
      }
    }
  `;
  
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const json = await res.json();
    console.log('Beverages result:', JSON.stringify(json, null, 2));

    if (json.data?.beverages?.items?.length > 0) {
      const firstBevId = json.data.beverages.items[0].id;
      console.log('Fetching batches for beverage', firstBevId);

      const batchQuery = `
        query GetBatches($beverageId: ID!) {
          wineBatches(beverageId: $beverageId, limit: 10) {
            items {
              id
              lotNumber
              vintage
              volumeMl
              alcoholByVolume
            }
          }
        }
      `;
      const batchRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: batchQuery, variables: { beverageId: firstBevId } })
      });
      const batchJson = await batchRes.json();
      console.log('Batches result:', JSON.stringify(batchJson, null, 2));

      if (batchJson.data?.wineBatches?.items?.length > 0) {
        const firstBatchId = batchJson.data.wineBatches.items[0].id;
        console.log('Fetching samples for batch', firstBatchId);

        const sampleQuery = `
          query GetSamples($batchId: ID!) {
            wineSamples(batchId: $batchId, limit: 10) {
              items {
                id
                volumeMl
              }
            }
          }
        `;
        const sampleRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: sampleQuery, variables: { batchId: firstBatchId } })
        });
        const sampleJson = await sampleRes.json();
        console.log('Samples result:', JSON.stringify(sampleJson, null, 2));
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
