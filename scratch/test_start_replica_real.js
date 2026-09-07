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
  const commId = "52f58a56-6d76-44d5-b4ab-842784a6c3e6";
  const replicaId = "a3992876-42ae-47a8-a4e3-0cb773037d04";

  // Simulate start sequence:
  // 1. Submit & approve commission
  console.log("Submitting & approving commission...");
  try {
    await rawGraphQL(`mutation DevSubmitCommissionForReview($id: ID!) { submitCommissionForReview(id: $id) { id } }`, { id: commId });
  } catch (e) { console.log("submitCommission:", e.message); }

  try {
    await rawGraphQL(`mutation DevApproveCommission($id: ID!) { approveCommission(id: $id) { id } }`, { id: commId });
  } catch (e) { console.log("approveCommission:", e.message); }

  try {
    await rawGraphQL(`mutation DevPlanCommission($id: ID!) { planCommission(id: $id) { id } }`, { id: commId });
  } catch (e) { console.log("planCommission:", e.message); }

  try {
    await rawGraphQL(`mutation DevStartCommission($id: ID!) { startCommission(id: $id) { id } }`, { id: commId });
    console.log("Commission started successfully!");
  } catch (e) { console.log("startCommission:", e.message); }

  try {
    await rawGraphQL(`mutation DevPlanCommissionReplica($id: ID!) { planCommissionReplica(id: $id) { id } }`, { id: replicaId });
    console.log("Replica planned successfully!");
  } catch (e) { console.log("planCommissionReplica:", e.message); }

  try {
    const startRes = await rawGraphQL(`mutation StartCommissionReplica($id: ID!) { startCommissionReplica(id: $id) { id status } }`, { id: replicaId }, {
      'x-actor-auid': '2',
      'x-actor-role': 'HEAD'
    });
    console.log("StartCommissionReplica result:", startRes);
  } catch (e) { console.log("StartCommissionReplica error:", e.message); }
}

run().catch(console.error);
