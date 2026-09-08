const fs = require('fs');
let schema;
try {
  schema = JSON.parse(fs.readFileSync('scratch/schema.json', 'utf8'));
} catch (e) {
  schema = JSON.parse(fs.readFileSync('scratch/full-schema.json', 'utf8'));
}
const types = schema.data ? schema.data.__schema.types : schema.types;
const repType = types.find(t => t.name === 'CommissionReplica');
console.log('CommissionReplica fields:');
repType.fields.forEach(f => {
  console.log(`- ${f.name}: ${f.type.name || f.type.ofType?.name || f.type.ofType?.ofType?.name || f.type.kind}`);
});

const rcType = types.find(t => t.name === 'CommissionReplicaCandidate');
console.log('CommissionReplicaCandidate fields:');
rcType.fields.forEach(f => {
  console.log(`- ${f.name}: ${f.type.name || f.type.ofType?.name || f.type.ofType?.ofType?.name || f.type.kind}`);
});

const memberType = types.find(t => t.name === 'CommissionReplicaMember');
console.log('CommissionReplicaMember fields:');
memberType.fields.forEach(f => {
  console.log(`- ${f.name}: ${f.type.name || f.type.ofType?.name || f.type.ofType?.ofType?.name || f.type.kind}`);
});
