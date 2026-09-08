const ENDPOINT = 'https://winelore-dev.thewinelore.com/graphql';

async function testInlineAttributes(attrStr, label) {
  const query = `
    mutation {
      createBeverage(input: {
        name: "Test Inline Attr ${label}",
        typeId: "11111111-1111-4111-8111-111111111101",
        producers: [{ auid: [2], role: MAKER }],
        attributes: ${JSON.stringify(attrStr)}
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
  if (data.data && data.data.createBeverage) {
    console.log(`✅ SUCCESS [${label}]:`, data.data.createBeverage.attributes);
  } else {
    console.log(`❌ ERROR [${label}]:`, data.errors[0].message);
  }
}

async function run() {
  await testInlineAttributes('{"color":"біле"}', 'JSON String');
  await testInlineAttributes('{color=біле}', 'Map String');
  await testInlineAttributes('color=біле', 'Simple String');
}

run();
