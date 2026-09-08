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

async function testFormat(attrValue, label) {
  const input = {
    name: `Test Wine - Format Test (${label})`,
    typeId: "11111111-1111-4111-8111-111111111101",
    producers: [{ auid: [2], role: "MAKER" }],
    attributes: attrValue
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
  console.log(`Label [${label}]:`, JSON.stringify(data));
}

async function runTests() {
  await testFormat("{color=біле, vintage=2025}", "Kotlin Map format");
  await testFormat('{"color":"біле","vintage":"2025"}', "JSON format");
}

runTests();
