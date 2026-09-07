const fs = require('fs');
let schema;
try {
  schema = JSON.parse(fs.readFileSync('scratch/schema.json', 'utf8'));
} catch (e) {
  schema = JSON.parse(fs.readFileSync('scratch/full-schema.json', 'utf8'));
}
const types = schema.data ? schema.data.__schema.types : schema.types;
const f = types.find(x => x.name === 'BeverageFilterInput');
console.log('BeverageFilterInput:', JSON.stringify(f, null, 2));
