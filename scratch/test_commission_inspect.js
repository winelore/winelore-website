const https = require('https');

const query = `
query GetCommissionDetails($id: ID!) {
  commission(id: $id) {
    id
    name
    status
    candidates {
      id
      anonymizedCode
      panelId
      sample {
        id
        volumeMl
        batch {
          id
          lotNumber
          beverage {
            id
            name
          }
        }
      }
    }
    panels {
      id
      name
      candidates {
        id
      }
    }
    replicas {
      id
      name
      status
      members {
        id
        auid
        role
        isReady
      }
      replicaCandidates {
        id
        status
        candidate {
          id
        }
      }
    }
  }
}
`;

const postData = JSON.stringify({
  query,
  variables: { id: "52f58a56-6d76-44d5-b4ab-842784a6c3e6" }
});

const req = https.request('https://winelore-dev.thewinelore.com/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log("STATUS:", res.statusCode);
    console.log("RESPONSE:", JSON.stringify(JSON.parse(body), null, 2));
  });
});

req.on('error', (e) => console.error(e));
req.write(postData);
req.end();
