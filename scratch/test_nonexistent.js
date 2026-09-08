const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testNonExistent() {
  const AXUS_GRAPHQL_ENDPOINT = 'https://axusid.thewinelore.com/graphql';
  const oQuery = `
    query OwnerByUsername($username: String!) {
      ownerByUsername(username: $username)
    }
  `;
  try {
    const oRes = await fetch(AXUS_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: oQuery, variables: { username: "nonexistentuser9999" } })
    });
    const oData = await oRes.json();
    console.log(`Owner for non-existent:`, JSON.stringify(oData, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}

testNonExistent();
