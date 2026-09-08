const endpoint = 'https://winelore-dev.thewinelore.com/graphql';

async function introspectOne(name) {
  const query = `
    query IntrospectOne($name: String!) {
      __type(name: $name) {
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
              ofType {
                name
                kind
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { name } })
  });
  const data = await res.json();
  console.log(`=== ${name} ===`);
  console.log(JSON.stringify(data.data?.__type, null, 2));
}

async function main() {
  await introspectOne("AddCommissionCandidateInput");
  await introspectOne("AddCommissionCandidateItemInput");
  await introspectOne("CommissionReplicaMemberInput");
}

main();
