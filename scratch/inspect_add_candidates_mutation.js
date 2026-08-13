const fs = require('fs');
let schema;
try {
  schema = JSON.parse(fs.readFileSync('scratch/schema.json', 'utf8'));
} catch (e) {
  schema = JSON.parse(fs.readFileSync('scratch/full-schema.json', 'utf8'));
}
const types = schema.data ? schema.data.__schema.types : schema.types;
const addCommissionCandidates = types.find(t => t.name === 'Mutation')?.fields?.find(f => f.name === 'addCommissionCandidates');
console.log('candidates arg:', JSON.stringify(addCommissionCandidates.args.find(a => a.name === 'candidates'), null, 2));
