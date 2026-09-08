const fs = require('fs');
let schema;
try {
  schema = JSON.parse(fs.readFileSync('scratch/schema.json', 'utf8'));
} catch (e) {
  schema = JSON.parse(fs.readFileSync('scratch/full-schema.json', 'utf8'));
}
const types = schema.data ? schema.data.__schema.types : schema.types;
const s = types.find(x => x.name === 'SearchableAggregateType');
console.log('SearchableAggregateType:', JSON.stringify(s, null, 2));

const resType = types.find(x => x.name === 'SearchResult');
console.log('SearchResult:', JSON.stringify(resType, null, 2));
