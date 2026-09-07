const fs = require('fs');

async function inspectType(typeName) {
  const url = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'https://winelore-dev.thewinelore.com/graphql';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        query {
          __type(name: "${typeName}") {
            name
            kind
            description
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
              args {
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
      `
    })
  });
  const data = await res.json();
  return data.data?.__type;
}

async function main() {
  const targetTypes = [
    'Query',
    'Mutation',
    'Beverage',
    'Batch',
    'Sample',
    'CommissionPanel',
    'CommissionReplicaMember',
    'CommissionCandidate',
    'AddCommissionCandidateItemInput',
    'CommissionReplicaMemberInput'
  ];
  
  const results = {};
  for (const t of targetTypes) {
    results[t] = await inspectType(t);
  }
  fs.writeFileSync('scratch/details.json', JSON.stringify(results, null, 2));
  console.log('Saved scratch/details.json');
}

main().catch(console.error);
