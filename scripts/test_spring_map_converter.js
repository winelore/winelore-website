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

const formats = [
  { name: 'JSON string', val: JSON.stringify({ color: "біле" }) },
  { name: 'Simple key=val', val: 'color=біле' },
  { name: 'Simple key:val', val: 'color:біле' },
  { name: 'Properties format', val: 'color=біле\n' },
  { name: 'Map toString without spaces', val: '{color=біле}' },
  { name: 'Map toString with spaces', val: '{ color = біле }' },
  { name: 'Quoted map toString', val: '{"color"="біле"}' },
  { name: 'Single quoted JSON', val: "{'color':'біле'}" },
  { name: 'Comma separated', val: 'color=біле,other=val' },
  { name: 'Array format', val: '[color=біле]' }
];

async function run() {
  for (const f of formats) {
    const input = {
      name: "Test Map Converter " + Math.random(),
      typeId: "11111111-1111-4111-8111-111111111101",
      producers: [{ auid: [2], role: "MAKER" }],
      attributes: f.val
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
      console.log(`✅ SUCCESS [${f.name}]: input='${f.val}' -> returned attributes=${JSON.stringify(data.data.createBeverage.attributes)}`);
    } else {
      console.log(`❌ FAIL [${f.name}]: input='${f.val}' -> error: ${data.errors[0].message}`);
    }
  }
}

run();
