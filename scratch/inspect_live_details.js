const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('scratch/live_schema.json', 'utf8'));
const types = schema.types;

function unwrapType(t) {
  if (!t) return 'null';
  if (t.name) return t.name;
  if (t.ofType) return `${t.kind}(${unwrapType(t.ofType)})`;
  return t.kind || 'unknown';
}

['Batch', 'Sample', 'Beverage', 'Commission', 'CommissionPanel', 'CommissionCandidate', 'CommissionReplica', 'CommissionReplicaCandidate', 'CommissionReplicaMember', 'AddCommissionCandidateInput', 'AddCommissionCandidateItemInput', 'CreateCommissionReplicaInput', 'CommissionReplicaMemberInput'].forEach(tName => {
  const t = types.find(x => x.name === tName);
  if (t) {
    console.log(`\n=== Type ${t.name} (${t.kind}) ===`);
    if (t.fields) {
      t.fields.forEach(f => console.log(`  ${f.name}: ${unwrapType(f.type)}`));
    }
    if (t.inputFields) {
      t.inputFields.forEach(f => console.log(`  (input) ${f.name}: ${unwrapType(f.type)}`));
    }
  } else {
    console.log(`\n=== Type ${tName} NOT FOUND ===`);
  }
});
