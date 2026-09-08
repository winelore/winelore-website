const ENDPOINT = 'https://winelore-dev.thewinelore.com/graphql';

const GET_BEVERAGES_QUERY = `
  query {
    beverages {
      items {
        id
        name
        attributes
      }
    }
  }
`;

async function fetchExistingBeverages() {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-ACTOR': '2' },
    body: JSON.stringify({ query: GET_BEVERAGES_QUERY })
  });
  const data = await res.json();
  console.log('Beverages count:', data?.data?.beverages?.items?.length);
  if (data?.data?.beverages?.items) {
    data.data.beverages.items.slice(0, 10).forEach(b => {
      console.log(`Beverage [${b.name}] attributes (raw):`, JSON.stringify(b.attributes));
    });
  }
}

fetchExistingBeverages();
