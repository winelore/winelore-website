const endpoint = 'https://axusid.thewinelore.com/graphql';

async function findUserByUsername(username) {
  const q = `
    query OwnerByUsername($username: String!) {
      ownerByUsername(username: $username)
    }
  `;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, variables: { username } })
    });
    const data = await res.json();
    if (data.data?.ownerByUsername) {
      const auid = data.data.ownerByUsername;
      console.log('Found auid:', auid);
      
      // Let's get user info
      const uQ = `
        query GetUser($auid: ID!) {
          user(auid: $auid) {
            identity {
              auid
              id
            }
            usernames {
              usernames
              defaultUsername
            }
          }
          variations(auid: $auid) {
            id
            firstName
            lastName
            icon
          }
        }
      `;
      const uRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: uQ, variables: { auid } })
      });
      const uData = await uRes.json();
      console.log('User data:', JSON.stringify(uData, null, 2));
      return { auid, data: uData.data };
    } else {
      console.log('Not found:', data.errors?.[0]?.message);
      return null;
    }
  } catch (err) {
    console.error('Error:', err);
    return null;
  }
}

async function test() {
  await findUserByUsername('test');
  await findUserByUsername('root');
}

test();
