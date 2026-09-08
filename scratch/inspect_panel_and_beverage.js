const fs = require('fs');
let schema;
try {
  schema = JSON.parse(fs.readFileSync('scratch/schema.json', 'utf8'));
} catch (e) {
  schema = JSON.parse(fs.readFileSync('scratch/full-schema.json', 'utf8'));
}
const types = schema.data ? schema.data.__schema.types : schema.types;

const queryType = types.find(x => x.name === 'Query');
const mutationType = types.find(x => x.name === 'Mutation');

console.log('--- Queries with beverage / batch / sample / panel / candidate ---');
queryType.fields.filter(f => {
  const n = f.name.toLowerCase();
  return n.includes('beverage') || n.includes('batch') || n.includes('sample') || n.includes('panel') || n.includes('candidate');
}).forEach(f => console.log('Query:', f.name, 'Args:', f.args.map(a => a.name + ':' + (a.type.name || a.type.ofType?.name)).join(', ')));

console.log('\n--- Mutations with panel / candidate / replica / member ---');
mutationType.fields.filter(f => {
  const n = f.name.toLowerCase();
  return n.includes('panel') || n.includes('candidate') || n.includes('replica') || n.includes('member');
}).forEach(f => console.log('Mutation:', f.name, 'Args:', f.args.map(a => a.name + ':' + (a.type.name || a.type.ofType?.name)).join(', ')));

console.log('\n--- Types: Panel, CommissionPanel, CommissionCandidate, Sample, Batch, Beverage ---');
['CommissionPanel', 'Panel', 'CommissionCandidate', 'CommissionReplica', 'CommissionReplicaCandidate', 'CommissionReplicaMember', 'Sample', 'Batch', 'Beverage'].forEach(tName => {
  const t = types.find(x => x.name === tName);
  if (t) {
    console.log(`\nType ${t.name}:`, (t.fields || []).map(f => f.name + ': ' + (f.type.name || f.type.ofType?.name || f.type.ofType?.ofType?.name)).join(', '));
  } else {
    console.log(`\nType ${tName} NOT FOUND`);
  }
});
