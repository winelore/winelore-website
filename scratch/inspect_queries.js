const fs = require('fs');
let schema;
try {
  schema = JSON.parse(fs.readFileSync('scratch/schema.json', 'utf8'));
} catch (e) {
  schema = JSON.parse(fs.readFileSync('scratch/full-schema.json', 'utf8'));
}
const types = schema.data ? schema.data.__schema.types : schema.types;
const queryType = types.find(x => x.name === 'Query');

['beverages', 'beverage', 'wineBatches', 'wineBatchesByBeverage', 'wineSamples', 'wineSamplesByBatch'].forEach(qName => {
  const q = queryType.fields.find(f => f.name === qName);
  if (q) {
    console.log(`Query ${qName}:`, q.args.map(a => `${a.name}: ${a.type.name || a.type.ofType?.name || a.type.ofType?.ofType?.name}`).join(', '), '->', q.type.name || q.type.ofType?.name || q.type.ofType?.ofType?.name);
  }
});
