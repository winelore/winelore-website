const ENDPOINT = 'https://winelore-dev.thewinelore.com/graphql';

async function testObjectAttributes() {
  const query = `
    mutation {
      createBeverage(input: {
        name: "Test Object Attr",
        typeId: "11111111-1111-4111-8111-111111111101",
        producers: [{ auid: [2], role: MAKER }],
        attributes: { color: "біле" }
      }) {
        id
        name
        attributes
      }
    }
  `;

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ACTOR': '2'
    },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  console.log('Result:', JSON.stringify(data, null, 2));
}

testObjectAttributes();
