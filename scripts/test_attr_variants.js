const ENDPOINT = 'https://winelore-dev.thewinelore.com/graphql';

const CREATE_BEVERAGE_MUTATION = `
  mutation CreateBeverage($input: CreateBeverageInput!) {
    createBeverage(input: $input) {
      id
      attributes
    }
  }
`;

const testValues = [
  "color=біле",
  "{color=біле}",
  "color=white",
  "{color=white}",
  "{\"color\":\"white\"}",
  "{\"color\":\"біле\"}",
  "color:біле",
  "color",
  "white"
];

async function testAll() {
  for (const val of testValues) {
    const input = {
      name: `Test Wine Attr (${val})`,
      typeId: "11111111-1111-4111-8111-111111111101",
      producers: [{ auid: [2], role: "MAKER" }],
      attributes: val
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
    if (data.data && data.data.createBeverage) {
      console.log(`✅ SUCCESS for [${val}]:`, data.data.createBeverage.attributes);
    } else {
      console.log(`❌ FAILED for [${val}]:`, data.errors[0].message);
    }
  }
}

testAll();
