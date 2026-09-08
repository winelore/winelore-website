const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('scratch/live-schema-fields.json', 'utf8'));

function inspectField(list, name) {
  const f = list.find(x => x.name === name);
  console.log(`=== ${name} ===`);
  console.log(JSON.stringify(f, null, 2));
}

console.log("--- MUTATIONS ---");
['addCommissionPanel', 'renameCommissionPanel', 'removeCommissionPanel', 'addCommissionCandidate', 'addCommissionCandidates', 'removeCommissionCandidate', 'addCommissionReplicaMember', 'removeCommissionReplicaMember'].forEach(name => {
  inspectField(schema.m, name);
});

console.log("--- QUERIES ---");
['beverages', 'batches', 'samples', 'search'].forEach(name => {
  inspectField(schema.q, name);
});
