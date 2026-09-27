const https = require('https');

const query = JSON.stringify({
  query: `
    query GetCommission($id: ID!) {
      commission(id: $id) {
        id
        name
        status
        competition {
          holders
        }
        panels {
          id
          name
          candidates {
            id
            anonymizedCode
          }
        }
        replicas {
          id
          name
          type
          status
          currentPanelId
          members {
            id
            auid
            role
            isReady
          }
          replicaPanels {
            id
            status
            currentCandidateId
            panel { id name }
            replicaCandidates {
              id
              status
              candidate {
                id
                anonymizedCode
              }
            }
          }
        }
      }
    }
  `,
  variables: { id: 'f1470314-67c4-4ef6-9f66-f2a1efcf0c9e' }
});

const req = https.request('https://winelore-dev.thewinelore.com/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(query),
    'X-ACTOR': '1'
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log(JSON.stringify(JSON.parse(body), null, 2));
  });
});

req.write(query);
req.end();
