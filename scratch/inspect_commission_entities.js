const fs = require('fs');
let schema;
try {
  schema = JSON.parse(fs.readFileSync('scratch/schema.json', 'utf8'));
} catch (e) {
  schema = JSON.parse(fs.readFileSync('scratch/full-schema.json', 'utf8'));
}
const types = schema.data ? schema.data.__schema.types : schema.types;

function printType(name) {
  const t = types.find(x => x.name === name);
  if (!t) {
    console.log(`Type ${name} not found`);
    return;
  }
  console.log(`=== ${t.kind}: ${t.name} ===`);
  if (t.fields) {
    t.fields.forEach(f => {
      let ftype = f.type.name || f.type.kind;
      if (f.type.ofType) {
        ftype += ` of ${f.type.ofType.name || f.type.ofType.kind}`;
        if (f.type.ofType.ofType) {
          ftype += ` of ${f.type.ofType.ofType.name || f.type.ofType.ofType.kind}`;
        }
      }
      console.log(`  - ${f.name}: ${ftype}`);
    });
  }
  if (t.inputFields) {
    t.inputFields.forEach(f => {
      let ftype = f.type.name || f.type.kind;
      if (f.type.ofType) {
        ftype += ` of ${f.type.ofType.name || f.type.ofType.kind}`;
        if (f.type.ofType.ofType) {
          ftype += ` of ${f.type.ofType.ofType.name || f.type.ofType.ofType.kind}`;
        }
      }
      console.log(`  - ${f.name}: ${ftype}`);
    });
  }
  if (t.enumValues) {
    console.log(`  Values: ` + t.enumValues.map(e => e.name).join(', '));
  }
}

[
  'Commission',
  'CommissionPanel',
  'CommissionCandidate',
  'CommissionReplica',
  'CommissionReplicaMember',
  'CommissionReplicaCandidate',
  'CommissionReplicaMemberInput',
  'AddCommissionCandidateInput',
  'AddCommissionCandidateItemInput',
  'CommissionReplicaMemberRole',
  'Beverage',
  'Batch',
  'Sample'
].forEach(printType);
