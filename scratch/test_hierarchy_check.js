const endpoint = 'https://winelore-dev.thewinelore.com/graphql';

async function testHierarchy() {
  const bevQ = `
    query GetBeverages {
      beverages(limit: 5) {
        items {
          id
          name
        }
      }
    }
  `;
  const bRes = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: bevQ })
  });
  const bData = await bRes.json();
  console.log('Beverages:', JSON.stringify(bData, null, 2));

  if (bData.data?.beverages?.items?.length > 0) {
    const bevId = bData.data.beverages.items[0].id;
    const batchQ = `
      query GetBatches($beverageId: ID!) {
        batches(beverageId: $beverageId, limit: 5) {
          items {
            id
            lotNumber
            volumeMl
          }
        }
      }
    `;
    const btRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: batchQ, variables: { beverageId: bevId } })
    });
    const btData = await btRes.json();
    console.log('Batches for bev', bevId, ':', JSON.stringify(btData, null, 2));

    if (btData.data?.batches?.items?.length > 0) {
      const batchId = btData.data.batches.items[0].id;
      const sampleQ = `
        query GetSamples($batchId: ID!) {
          samples(batchId: $batchId, limit: 5) {
            items {
              id
              volumeMl
            }
          }
        }
      `;
      const sRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sampleQ, variables: { batchId } })
      });
      const sData = await sRes.json();
      console.log('Samples for batch', batchId, ':', JSON.stringify(sData, null, 2));
    }
  }
}

testHierarchy();
