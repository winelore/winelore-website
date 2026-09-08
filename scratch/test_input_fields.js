const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('scratch/live_schema.json', 'utf8'));

function printInput(name) {
  const t = schema.types.find(x => x.name === name);
  console.log(name, t.inputFields);
}

printInput('AddCommissionCandidateInput');
printInput('AddCommissionCandidateItemInput');
printInput('CommissionReplicaMemberInput');
