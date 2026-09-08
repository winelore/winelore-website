const fs = require('fs');
let schema;
try {
  schema = JSON.parse(fs.readFileSync('scratch/schema.json', 'utf8'));
} catch (e) {
  schema = JSON.parse(fs.readFileSync('scratch/full-schema.json', 'utf8'));
}
const types = schema.data ? schema.data.__schema.types : schema.types;

['PaginatedBeverages', 'PaginatedWineBatches', 'PaginatedWineSamples'].forEach(tName => {
  const t = types.find(x => x.name === tName);
  if (t) {
    console.log(t.name, t.fields.map(f => f.name + ': ' + (f.type.name || f.type.ofType?.name || f.type.ofType?.ofType?.name)));
  }
});
