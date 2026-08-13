const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('scratch/live_schema.json', 'utf8'));

function findType(name) {
  return schema.types.find(t => t.name === name);
}

console.log('AddCommissionCandidateInput:', JSON.stringify(findType('AddCommissionCandidateInput'), null, 2));
console.log('AddCommissionCandidateItemInput:', JSON.stringify(findType('AddCommissionCandidateItemInput'), null, 2));
console.log('addCommissionCandidate mutation:', JSON.stringify(findType('Mutation')?.fields?.find(f => f.name === 'addCommissionCandidate'), null, 2));
console.log('addCommissionCandidates mutation:', JSON.stringify(findType('Mutation')?.fields?.find(f => f.name === 'addCommissionCandidates'), null, 2));
console.log('addCommissionReplicaMember mutation:', JSON.stringify(findType('Mutation')?.fields?.find(f => f.name === 'addCommissionReplicaMember'), null, 2));
console.log('addCommissionPanel mutation:', JSON.stringify(findType('Mutation')?.fields?.find(f => f.name === 'addCommissionPanel'), null, 2));
console.log('renameCommissionPanel mutation:', JSON.stringify(findType('Mutation')?.fields?.find(f => f.name === 'renameCommissionPanel'), null, 2));
console.log('removeCommissionPanel mutation:', JSON.stringify(findType('Mutation')?.fields?.find(f => f.name === 'removeCommissionPanel'), null, 2));
