const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('scratch/live_schema.json', 'utf8'));
const types = schema.types;

function getTypeName(t) {
  if (!t) return 'null';
  if (t.name) return t.name;
  if (t.ofType) {
    if (t.kind === 'NON_NULL') return `${getTypeName(t.ofType)}!`;
    if (t.kind === 'LIST') return `[${getTypeName(t.ofType)}]`;
    return getTypeName(t.ofType);
  }
  return t.kind;
}

const mutationType = types.find(t => t.name === 'Mutation');

console.log('=== COMMISSIONS MUTATIONS ===');
const interestingMutations = [
  'addCommissionReplicaMember',
  'removeCommissionReplicaMember',
  'addCommissionCandidate',
  'addCommissionCandidates',
  'removeCommissionCandidate',
  'changeCommissionCandidateCode',
  'reorderCommissionCandidates',
  'addCommissionPanel',
  'renameCommissionPanel',
  'removeCommissionPanel',
  'reorderCommissionPanels',
  'setCommissionReplicaCurrentCandidate'
];

mutationType.fields.filter(f => interestingMutations.includes(f.name)).forEach(f => {
  const args = f.args.map(a => `${a.name}: ${getTypeName(a.type)}`).join(', ');
  console.log(`mutation: ${f.name}(${args}) -> ${getTypeName(f.type)}`);
});

const interestingInputs = [
  'CommissionReplicaMemberInput',
  'AddCommissionCandidateInput',
  'AddCommissionCandidateItemInput',
  'CommissionReplicaMemberRole'
];

interestingInputs.forEach(iName => {
  const t = types.find(x => x.name === iName);
  if (t) {
    console.log(`\nInput/Enum ${t.name} (${t.kind}):`);
    if (t.inputFields) {
      t.inputFields.forEach(f => console.log(`  ${f.name}: ${getTypeName(f.type)}`));
    }
    if (t.enumValues) {
      t.enumValues.forEach(e => console.log(`  ${e.name}`));
    }
  }
});
