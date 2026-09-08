const endpoint = 'https://axusid.thewinelore.com/graphql';

async function testAuid(auid) {
  const q = `
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
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, variables: { auid: String(auid) } })
  });
  const data = await res.json();
  if (data.data?.usernames?.defaultUsername) {
    console.log(`AUID ${auid}:`, data.data);
    const uName = data.data.usernames.defaultUsername;
    // Now test OwnerByUsername with this username!
    const oQ = `
      query OwnerByUsername($username: String!) {
        ownerByUsername(username: $username)
      }
    `;
    const oRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: oQ, variables: { username: uName } })
    });
    const oData = await oRes.json();
    console.log(`OwnerByUsername("${uName}"):`, oData);
    return true;
  }
  return false;
}

async function main() {
  for (let i = 1; i <= 30; i++) {
    const found = await testAuid(i);
    if (found) break;
  }
}

main();
