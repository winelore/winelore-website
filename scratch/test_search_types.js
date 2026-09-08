const endpoint = 'https://winelore-dev.thewinelore.com/graphql';

async function testSearchAndFilter() {
  // Test search query
  const searchQ = `
    query SearchBeverages($query: String!) {
      search(query: $query, types: [BEVERAGE]) {
        items {
          ... on Beverage {
            id
            name
          }
        }
      }
    }
  `;

  try {
    const sRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: searchQ, variables: { query: 'wine' } })
    });
    const sData = await sRes.json();
    console.log('Search results:', JSON.stringify(sData, null, 2));
  } catch (e) {
    console.error('Search error:', e);
  }

  // Test beverages query
  const bevQ = `
    query GetBeverages {
      beverages(limit: 50) {
        items {
          id
          name
        }
      }
    }
  `;

  try {
    const bRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: bevQ })
    });
    const bData = await bRes.json();
    console.log('Beverages list count:', bData.data?.beverages?.items?.length);
  } catch (e) {
    console.error('Beverages error:', e);
  }
}

testSearchAndFilter();
