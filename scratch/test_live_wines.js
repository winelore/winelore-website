const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testQuery() {
  const GRAPHQL_ENDPOINT = 'https://winelore-dev.thewinelore.com/graphql';
  
  const query = `
    query TestHierarchy {
      wines(limit: 5) {
        items {
          id
          name
        }
      }
    }
  `;
  
  try {
    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    console.log('Query result:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

testQuery();
