const ENDPOINT = 'https://winelore-dev.thewinelore.com/graphql';

async function testEndpoint() {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { __typename }`
      })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Data:', JSON.stringify(data));
  } catch (err) {
    console.error('Error:', err);
  }
}

testEndpoint();
