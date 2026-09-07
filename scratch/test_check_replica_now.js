const https = require('https');

function rawGraphQL(query, variables = {}, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query, variables });
    const req = https.request('https://winelore-dev.thewinelore.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.errors && json.errors.length > 0) {
            reject(new Error(json.errors[0].message));
          } else {
            resolve(json.data);
          }
        } catch (e) {
          reject(new Error(`Parse error (${res.statusCode}): ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  const replicaId = "a3992876-42ae-47a8-a4e3-0cb773037d04";

  const query = `
    query GetReplicaCandidates($id: ID!) {
      commissionReplica(id: $id) {
        id
        status
        replicaCandidates {
          id
          status
          candidate {
            id
            anonymizedCode
            sample {
              id
              batch {
                id
                beverage {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await rawGraphQL(query, { id: replicaId });
  console.log("Replica candidates result:", JSON.stringify(data, null, 2));
}

run().catch(console.error);
