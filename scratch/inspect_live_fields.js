const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('scratch/live-schema-fields.json', 'utf8'));

console.log("=== QUERY FIELDS IN LIVE SCHEMA ===");
(schema.q || []).forEach(f => {
  console.log(`- ${f.name}(${(f.args || []).map(a => a.name).join(', ')})`);
});

console.log("\n=== MUTATION FIELDS IN LIVE SCHEMA ===");
(schema.m || []).forEach(f => {
  console.log(`- ${f.name}(${(f.args || []).map(a => a.name).join(', ')})`);
});
