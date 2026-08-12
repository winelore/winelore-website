const fs = require('fs');
let schema;
try {
  schema = JSON.parse(fs.readFileSync('scratch/schema.json', 'utf8'));
} catch (e) {
  schema = JSON.parse(fs.readFileSync('scratch/full-schema.json', 'utf8'));
}
const types = schema.data ? schema.data.__schema.types : schema.types;
const mutationType = types.find(x => x.name === 'Mutation');

const candMutations = mutationType.fields.filter(f => f.name.toLowerCase().includes('candidate'));
console.log('Candidate mutations:');
candMutations.forEach(m => console.log(JSON.stringify(m, null, 2)));
