const fs = require('fs');
let schema;
try {
  schema = JSON.parse(fs.readFileSync('scratch/schema.json', 'utf8'));
} catch (e) {
  schema = JSON.parse(fs.readFileSync('scratch/full-schema.json', 'utf8'));
}
const types = schema.data ? schema.data.__schema.types : schema.types;

function printInputType(name) {
  const t = types.find(x => x.name === name);
  if (!t) {
    console.log(`Type ${name} not found`);
    return;
  }
  console.log(`=== ${t.kind}: ${t.name} ===`);
  (t.inputFields || t.fields || []).forEach(f => {
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

[
  'CommissionReplicaMemberInput',
  'AddCommissionCandidateInput',
  'CommissionCandidateInput',
  'SearchableAggregateType',
  'SearchResult',
  'SearchItemConnection',
  'SearchItem'
].forEach(printInputType);
