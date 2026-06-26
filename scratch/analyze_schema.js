const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('scratch/schema.json', 'utf8'));

const types = schema.data.__schema.types;

console.log("=== ALL TYPES CONTAINING 'Comment' OR 'Evaluation' OR 'Wine' ===");
types.forEach(t => {
  if (t.name && (t.name.toLowerCase().includes('comment') || t.name.toLowerCase().includes('evaluation') || t.name.toLowerCase().includes('wine'))) {
    console.log(`- ${t.name} (${t.kind})`);
    if (t.fields) {
      console.log("  Fields:");
      t.fields.forEach(f => {
        console.log(`    - ${f.name}`);
      });
    }
  }
});

console.log("\n=== QUERY TYPE ===");
const queryType = types.find(t => t.name === 'Query');
if (queryType && queryType.fields) {
  queryType.fields.forEach(f => {
    console.log(`- ${f.name}`);
  });
}

console.log("\n=== MUTATION TYPE ===");
const mutationType = types.find(t => t.name === 'Mutation');
if (mutationType && mutationType.fields) {
  mutationType.fields.forEach(f => {
    console.log(`- ${f.name}`);
  });
}
