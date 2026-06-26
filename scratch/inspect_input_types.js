const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('scratch/schema.json', 'utf8'));
const types = schema.data.__schema.types;

const mutationType = types.find(t => t.name === 'Mutation');

function dumpMutation(name) {
  const mut = mutationType.fields.find(f => f.name === name);
  console.log(`=== DUMP MUTATION ${name} ===`);
  console.log(JSON.stringify(mut, null, 2));
}

dumpMutation('markCommissionReplicaMemberReady');
dumpMutation('markCommissionReplicaMemberNotReady');
