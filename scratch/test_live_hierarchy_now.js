const endpoint = 'https://winelore-dev.thewinelore.com/graphql';

async function testHierarchy() {
  const q = `
    query TestH {
      beverages(limit: 5) {
        items {
          id
          name
          status
        }
      }
    }
  `;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q })
  });
  const data = await res.json();
  console.log('Beverages:', JSON.stringify(data, null, 2));

  if (data.data?.beverages?.items?.length > 0) {
    const bevId = data.data.beverages.items[0].id;
    const batchQ = `
      query TestBatches($beverageId: ID) {
        batches(beverageId: $beverageId, limit: 5) {
          items {
            id
            lotNumber
            volumeMl
          }
        }
      }
    `;
    const batchRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: batchQ, variables: { beverageId: bevId } })
    });
    const batchData = await batchRes.json();
    console.log('Batches for bev', bevId, ':', JSON.stringify(batchData, null, 2));

    if (batchData.data?.batches?.items?.length > 0) {
      const batchId = batchData.data.batches.items[0].id;
      const sampleQ = `
        query TestSamples($batchId: ID) {
          samples(batchId: $batchId, limit: 5) {
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
        body: JSON.stringify({ query: sampleQ, variables: { batchId } })
      });
      const sampleData = await sampleRes.json();
      console.log('Samples for batch', batchId, ':', JSON.stringify(sampleData, null, 2));
    }
  }
}

testHierarchy();
