const endpoint = 'https://winelore-dev.thewinelore.com/graphql';

async function testSearchHit() {
  const searchQ = `
    query SearchBeverages($query: String!) {
      search(query: $query, types: [BEVERAGE]) {
        items {
          id
          name
        }
      }
    }
  `;

  const sRes = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: searchQ, variables: { query: 'Wine' } })
  });
  const sData = await sRes.json();
  console.log('Search hit result:', JSON.stringify(sData, null, 2));
}

testSearchHit();
