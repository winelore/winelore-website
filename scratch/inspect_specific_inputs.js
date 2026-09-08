const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('scratch/live_schema.json', 'utf8'));

['AddCommissionCandidateInput', 'AddCommissionCandidateItemInput', 'CommissionReplicaMemberInput'].forEach(name => {
  const t = schema.types.find(x => x.name === name);
  console.log(name, t ? t.inputFields : 'not found');
});
