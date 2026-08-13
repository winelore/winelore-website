const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAxus() {
  const AXUS_GRAPHQL_ENDPOINT = 'https://axusid.thewinelore.com/graphql';

  // 1. Get user details for auid 1
  const uQuery = `
    query UserDetails($auid: ID!) {
      usernames(auid: $auid) {
        defaultUsername
      }
      defaultVariation(auid: $auid) {
        variationId
      }
      variations(auid: $auid) {
        id
        firstName
        lastName
      }
    }
  `;

  try {
    const uRes = await fetch(AXUS_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: uQuery, variables: { auid: '1' } })
    });
    const uData = await uRes.json();
    console.log('User 1 details:', JSON.stringify(uData, null, 2));

    const defaultUsername = uData?.data?.usernames?.defaultUsername;
    if (defaultUsername) {
      const oQuery = `
        query OwnerByUsername($username: String!) {
          ownerByUsername(username: $username)
        }
      `;
      const oRes = await fetch(AXUS_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: oQuery, variables: { username: defaultUsername } })
      });
      const oData = await oRes.json();
      console.log(`Owner for "${defaultUsername}":`, JSON.stringify(oData, null, 2));
    }
  } catch (e) {
    console.error('Axus test error:', e);
  }
}

testAxus();
