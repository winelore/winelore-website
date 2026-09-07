const endpoint = 'https://winelore-dev.thewinelore.com/graphql';

async function introspectMutation(name) {
  const query = `
    query IntrospectMut {
      __type(name: "Mutation") {
        fields {
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
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  const f = data.data?.__type?.fields?.find(x => x.name === name);
  console.log(`=== Mutation ${name} ===`, JSON.stringify(f, null, 2));
}

async function introspectObjectType(name) {
  const query = `
    query IntrospectObj($name: String!) {
      __type(name: $name) {
        name
        kind
        fields {
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

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { name } })
  });
  const data = await res.json();
  console.log(`=== Object ${name} ===`, JSON.stringify(data.data?.__type, null, 2));
}

async function main() {
  await introspectMutation("addCommissionReplicaMember");
  await introspectMutation("removeCommissionReplicaMember");
  await introspectMutation("addCommissionCandidate");
  await introspectMutation("removeCommissionCandidate");
  await introspectMutation("addCommissionPanel");
  await introspectMutation("renameCommissionPanel");
  await introspectMutation("removeCommissionPanel");
  await introspectObjectType("CommissionReplicaMember");
  await introspectObjectType("CommissionCandidate");
  await introspectObjectType("CommissionPanel");
}

main();
