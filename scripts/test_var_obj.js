const ENDPOINT = 'https://winelore-dev.thewinelore.com/graphql';

const CREATE_BEVERAGE_MUTATION = `
  mutation CreateBeverage($input: CreateBeverageInput!) {
    createBeverage(input: $input) {
      id
      name
      attributes
    }
  }
`;

async function testVariableObject() {
  const input = {
    name: "Test Var Object Attr " + Math.random(),
    typeId: "11111111-1111-4111-8111-111111111101",
    producers: [{ auid: [2], role: "MAKER" }],
    attributes: { color: "біле" }
  };

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ACTOR': '2'
    },
    body: JSON.stringify({
      query: CREATE_BEVERAGE_MUTATION,
      variables: { input }
    })
  });

  const data = await res.json();
  console.log('Result for JSON object in variable:', JSON.stringify(data, null, 2));
}

testVariableObject();
