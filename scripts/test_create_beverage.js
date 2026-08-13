const ENDPOINT = 'https://winelore-dev.thewinelore.com/graphql';

const CREATE_BEVERAGE_MUTATION = `
  mutation CreateBeverage($input: CreateBeverageInput!) {
    createBeverage(input: $input) {
      id
      name
      typeId
      attributes
    }
  }
`;

async function testCreateBeverage() {
  const input = {
    name: "Test Wine - Ambassad 2026 Import Test",
    typeId: "11111111-1111-4111-8111-111111111101",
    producers: [
      {
        auid: [2],
        role: "MAKER"
      }
    ]
  };

  try {
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
    console.log('HTTP Status:', res.status);
    const data = await res.json();
    console.log('GraphQL Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

testCreateBeverage();
