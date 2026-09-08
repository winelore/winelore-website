const ENDPOINT = 'https://winelore-dev.thewinelore.com/graphql';

const CREATE_BEVERAGE = `
  mutation CreateBeverage($input: CreateBeverageInput!) {
    createBeverage(input: $input) {
      id
      name
    }
  }
`;

const CREATE_BATCH = `
  mutation CreateBatch($input: CreateBatchInput!) {
    createBatch(input: $input) {
      id
      attributes
    }
  }
`;

const CREATE_SAMPLE = `
  mutation CreateSample($input: CreateSampleInput!) {
    createSample(input: $input) {
      id
      attributes
    }
  }
`;

async function testFullFlow() {
  const bevInput = {
    name: "Test Full Flow Wine " + Date.now(),
    typeId: "11111111-1111-4111-8111-111111111101",
    producers: [{ auid: [2], role: "MAKER" }]
  };

  const bevRes = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-ACTOR': '2' },
    body: JSON.stringify({ query: CREATE_BEVERAGE, variables: { input: bevInput } })
  });
  const bevData = await bevRes.json();
  console.log('Beverage created:', bevData.data.createBeverage);

  const beverageId = bevData.data.createBeverage.id;

  const batchRes = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-ACTOR': '2' },
    body: JSON.stringify({
      query: CREATE_BATCH,
      variables: {
        input: {
          beverageId
        }
      }
    })
  });
  const batchData = await batchRes.json();
  console.log('Batch created:', batchData);

  const sampleRes = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-ACTOR': '2' },
    body: JSON.stringify({
      query: CREATE_SAMPLE,
      variables: {
        input: {
          batchId: batchData.data.createBatch.id
        }
      }
    })
  });
  const sampleData = await sampleRes.json();
  console.log('Sample created:', sampleData);
}

testFullFlow();
