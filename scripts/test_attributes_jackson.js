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

const tests = [
  { label: 'null (omitted)', val: undefined },
  { label: 'empty string ""', val: "" },
  { label: 'raw JSON string', val: '{"color":"біле"}' },
  { label: 'escaped JSON string', val: '{\\"color\\":\\"біле\\"}' },
  { label: 'url encoded JSON', val: '%7B%22color%22%3A%22%D0%B1%D1%96%D0%BB%D0%B5%22%7D' },
  { label: 'base64 JSON', val: Buffer.from('{"color":"біле"}').toString('base64') },
  { label: 'key value pair', val: 'color: біле' },
  { label: 'query string format', val: 'color=біле' }
];

async function runTests() {
  for (const t of tests) {
    const input = {
      name: `Test Wine Attr [${t.label}]`,
      typeId: "11111111-1111-4111-8111-111111111101",
      producers: [{ auid: [2], role: "MAKER" }]
    };
    if (t.val !== undefined) {
      input.attributes = t.val;
    }

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
      console.log(`✅ SUCCESS [${t.label}]:`, data.data.createBeverage.attributes);
    } else {
      console.log(`❌ FAILED [${t.label}]:`, data.errors[0].message);
    }
  }
}

runTests();
