const fs = require('fs');
let schema;
try {
  schema = JSON.parse(fs.readFileSync('scratch/schema.json', 'utf8'));
} catch (e) {
  schema = JSON.parse(fs.readFileSync('scratch/full-schema.json', 'utf8'));
}
const types = schema.data ? schema.data.__schema.types : schema.types;
const commType = types.find(t => t.name === 'Commission');
console.log('Commission fields:');
commType.fields.forEach(f => {
  console.log(`- ${f.name}: ${f.type.name || f.type.ofType?.name || f.type.ofType?.ofType?.name || f.type.kind}`);
});

const candType = types.find(t => t.name === 'CommissionCandidate');
console.log('CommissionCandidate fields:');
candType.fields.forEach(f => {
  console.log(`- ${f.name}: ${f.type.name || f.type.ofType?.name || f.type.ofType?.ofType?.name || f.type.kind}`);
});
