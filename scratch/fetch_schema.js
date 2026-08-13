const fs = require('fs');

async function getFields(typeName) {
  const url = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'https://winelore-dev.thewinelore.com/graphql';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        query {
          __type(name: "${typeName}") {
            fields {
              name
              description
              args {
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
        }
      `
    })
  });
  const data = await res.json();
  return data.data?.__type?.fields || [];
}

async function main() {
  const q = await getFields('Query');
  const m = await getFields('Mutation');
  console.log('Queries:', q.map(x => x.name));
  console.log('Mutations:', m.map(x => x.name));
  fs.writeFileSync('scratch/live-schema-fields.json', JSON.stringify({ q, m }, null, 2));
}

main().catch(console.error);
