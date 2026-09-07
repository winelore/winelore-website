const fs = require('fs');
let schema;
try {
  schema = JSON.parse(fs.readFileSync('scratch/schema.json', 'utf8'));
} catch (e) {
  schema = JSON.parse(fs.readFileSync('scratch/full-schema.json', 'utf8'));
}
const types = schema.data ? schema.data.__schema.types : schema.types;
const mutationType = types.find(x => x.name === 'Mutation');

const memberMutations = mutationType.fields.filter(f => 
  f.name.toLowerCase().includes('member') || 
  f.name.toLowerCase().includes('panel') || 
  f.name.toLowerCase().includes('candidate') ||
  f.name.toLowerCase().includes('replica')
);

console.log('Relevant mutations:');
memberMutations.forEach(m => {
  console.log(`- ${m.name}(${m.args.map(a => `${a.name}: ${a.type.name || a.type.ofType?.name || a.type.ofType?.ofType?.name || a.type.kind}`).join(', ')})`);
});
