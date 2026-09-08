const ENDPOINT = 'https://winelore-dev.thewinelore.com/graphql';

const INTROSPECT_INPUT_TYPE = `
  query {
    __type(name: "CreateBeverageInput") {
      name
      kind
      inputFields {
        name
        type {
          name
          kind
          ofType {
            name
            kind
          }
        }
      }
    }
  }
`;

async function introspect() {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: INTROSPECT_INPUT_TYPE })
  });
  const data = await res.json();
  console.log('CreateBeverageInput Schema:', JSON.stringify(data, null, 2));
}

introspect();
