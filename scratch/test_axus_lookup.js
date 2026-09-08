const endpoint = 'https://axusid.thewinelore.com/graphql';

async function testUserByAuid() {
  const detailQ = `
    query UserDetails($auid: [Int!]!) {
      userDetails(auid: $auid) {
        auid
        name
        username
        avatar
      }
    }
  `;
  for (let i = 1; i <= 20; i++) {
    const dRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: detailQ, variables: { auid: [i] } })
    });
    const dData = await dRes.json();
    if (dData.data?.userDetails?.length > 0) {
      console.log('Found user with auid', i, ':', dData.data.userDetails);
    }
  }
}

testUserByAuid();
