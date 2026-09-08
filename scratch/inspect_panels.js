const fs = require('fs');
let schema;
try {
  schema = JSON.parse(fs.readFileSync('scratch/schema.json', 'utf8'));
} catch (e) {
  schema = JSON.parse(fs.readFileSync('scratch/full-schema.json', 'utf8'));
}
const types = schema.data ? schema.data.__schema.types : schema.types;
const allFields = [];
types.forEach(t => {
  if (t.fields) {
    t.fields.forEach(f => {
      if (f.name.toLowerCase().includes('panel') || (f.type.name && f.type.name.toLowerCase().includes('panel'))) {
        allFields.push(`${t.name}.${f.name}: ${f.type.name || f.type.kind}`);
      }
    });
  }
});
console.log('Panel fields in types:', allFields);

const allInputs = types.filter(t => t.name.toLowerCase().includes('candidate') || t.name.toLowerCase().includes('member') || t.name.toLowerCase().includes('panel') || t.name.toLowerCase().includes('replica'));
console.log('Relevant types/inputs:');
allInputs.forEach(t => console.log(`- [${t.kind}] ${t.name}`));
