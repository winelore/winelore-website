async function introspect() {
  const endpoint = 'https://winelore-dev.thewinelore.com/graphql';
  const query = `
    query IntrospectionQuery {
      __schema {
        types {
          name
          kind
          fields {
            name
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
    }
  `;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const json = await res.json();
  const fs = require('fs');
  fs.writeFileSync('scratch/live_schema.json', JSON.stringify(json.data.__schema, null, 2));
  console.log('Saved live schema. Total types:', json.data.__schema.types.length);

  const queryType = json.data.__schema.types.find(t => t.name === 'Query');
  const mutationType = json.data.__schema.types.find(t => t.name === 'Mutation');

  console.log('Query fields related to batch/sample/beverage:');
  queryType.fields.filter(f => /batch|sample|beverage|cand/i.test(f.name)).forEach(f => {
    console.log(' - Query:', f.name, f.args.map(a => a.name).join(', '));
  });

  console.log('Mutation fields related to batch/sample/beverage/replica/member/cand:');
  mutationType.fields.filter(f => /batch|sample|beverage|replica|member|cand/i.test(f.name)).forEach(f => {
    console.log(' - Mutation:', f.name, f.args.map(a => a.name).join(', '));
  });
}

introspect().catch(console.error);
