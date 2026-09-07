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

const candidates = [
  "{}",
  "{ }",
  "[]",
  "\"\"",
  "color=біле",
  "{color=біле}",
  "{color=\"біле\"}",
  "{\"color\":\"біле\"}",
  "{\"color\":\"white\"}",
  "{color: \"біле\"}",
  "{\"color\": \"біле\"}"
];

async function run() {
  for (const c of candidates) {
    const input = {
      name: "Attr Test " + Math.floor(Math.random() * 10000),
      typeId: "11111111-1111-4111-8111-111111111101",
      producers: [{ auid: [2], role: "MAKER" }],
      attributes: c
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
      console.log(`✅ SUCCESS for input '${c}': output attributes = ${JSON.stringify(data.data.createBeverage.attributes)}`);
    } else {
      console.log(`❌ ERROR for input '${c}': ${data.errors[0].message}`);
    }
  }
}

run();
