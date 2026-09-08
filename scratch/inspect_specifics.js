const fs = require('fs');
let schema;
try {
  schema = JSON.parse(fs.readFileSync('scratch/schema.json', 'utf8'));
} catch (e) {
  schema = JSON.parse(fs.readFileSync('scratch/full-schema.json', 'utf8'));
}
const types = schema.data ? schema.data.__schema.types : schema.types;

const findType = (name) => types.find(t => t.name === name);

console.log('CommissionReplicaMemberInput:', JSON.stringify(findType('CommissionReplicaMemberInput'), null, 2));
console.log('AddCommissionCandidateInput:', JSON.stringify(findType('AddCommissionCandidateInput'), null, 2));
console.log('AddCommissionCandidateItemInput:', JSON.stringify(findType('AddCommissionCandidateItemInput'), null, 2));

const mutationType = types.find(x => x.name === 'Mutation');
const targetMutations = ['addCommissionCandidate', 'addCommissionCandidates', 'removeCommissionCandidate', 'addCommissionReplicaMember', 'removeCommissionReplicaMember', 'changeCommissionCandidateCode', 'reorderCommissionCandidates'];
targetMutations.forEach(name => {
  const f = mutationType.fields.find(x => x.name === name);
  console.log(`Mutation ${name}:`, JSON.stringify(f, null, 2));
});
