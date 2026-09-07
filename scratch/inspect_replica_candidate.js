const fs = require('fs');
let schema;
try {
  schema = JSON.parse(fs.readFileSync('scratch/schema.json', 'utf8'));
} catch (e) {
  schema = JSON.parse(fs.readFileSync('scratch/full-schema.json', 'utf8'));
}
const types = schema.data ? schema.data.__schema.types : schema.types;
const t = types.find(x => x.name === 'CommissionReplicaCandidate');
console.log('CommissionReplicaCandidate:', JSON.stringify(t, null, 2));

const c = types.find(x => x.name === 'CommissionCandidate');
console.log('CommissionCandidate:', JSON.stringify(c, null, 2));

const p = types.find(x => x.name === 'CommissionPanel');
console.log('CommissionPanel:', JSON.stringify(p, null, 2));
