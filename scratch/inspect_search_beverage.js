const fs = require('fs');
let schema;
try {
  schema = JSON.parse(fs.readFileSync('scratch/schema.json', 'utf8'));
} catch (e) {
  schema = JSON.parse(fs.readFileSync('scratch/full-schema.json', 'utf8'));
}
const types = schema.data ? schema.data.__schema.types : schema.types;
const queryType = types.find(t => t.name === 'Query');

console.log("=== QUERY FIELDS ===");
queryType.fields.forEach(f => {
  const name = f.name;
  if (name.toLowerCase().includes('beverage') || 
      name.toLowerCase().includes('batch') || 
      name.toLowerCase().includes('sample') || 
      name.toLowerCase().includes('search') ||
      name.toLowerCase().includes('wine') ||
      name.toLowerCase().includes('candidate') ||
      name.toLowerCase().includes('panel')) {
    console.log(`Query: ${f.name}(${(f.args || []).map(a => a.name + ': ' + (a.type.name || a.type.kind)).join(', ')}) -> ${f.type.name || f.type.kind}`);
  }
});

const mutationType = types.find(t => t.name === 'Mutation');
console.log("\n=== MUTATION FIELDS ===");
mutationType.fields.forEach(f => {
  const name = f.name;
  if (name.toLowerCase().includes('beverage') || 
      name.toLowerCase().includes('batch') || 
      name.toLowerCase().includes('sample') || 
      name.toLowerCase().includes('search') ||
      name.toLowerCase().includes('candidate') ||
      name.toLowerCase().includes('panel')) {
    console.log(`Mutation: ${f.name}(${(f.args || []).map(a => a.name + ': ' + (a.type.name || a.type.kind)).join(', ')}) -> ${f.type.name || f.type.kind}`);
  }
});
