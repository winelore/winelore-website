const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('scratch/live_schema.json', 'utf8'));

const mutationType = schema.types.find(t => t.name === 'Mutation');

function formatType(t) {
  if (!t) return 'null';
  if (t.name) return t.name;
  if (t.ofType) return `${t.kind}(${formatType(t.ofType)})`;
  return t.kind;
}

console.log('--- ALL MUTATIONS ---');
mutationType.fields.forEach(m => {
  const args = m.args.map(a => `${a.name}: ${formatType(a.type)}`).join(', ');
  console.log(`${m.name}(${args}) -> ${formatType(m.type)}`);
});

console.log('\n--- INPUT OBJECT TYPES ---');
schema.types.filter(t => t.kind === 'INPUT_OBJECT').forEach(t => {
  console.log(`\nInput ${t.name}:`);
  (t.inputFields || []).forEach(f => {
    console.log(`  ${f.name}: ${formatType(f.type)}`);
  });
});
