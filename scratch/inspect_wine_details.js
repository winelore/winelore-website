const fs = require('fs');
let schema;
try {
  schema = JSON.parse(fs.readFileSync('scratch/schema.json', 'utf8'));
} catch (e) {
  schema = JSON.parse(fs.readFileSync('scratch/full-schema.json', 'utf8'));
}
const types = schema.data ? schema.data.__schema.types : schema.types;

const beverageFilter = types.find(x => x.name === 'BeverageFilterInput');
console.log('BeverageFilterInput fields:');
if (beverageFilter) {
  beverageFilter.inputFields.forEach(f => console.log('  ', f.name, ':', f.type.name || f.type.ofType?.name));
}

const wineType = types.find(x => x.name === 'Wine');
console.log('\nWine fields:');
if (wineType) {
  wineType.fields.forEach(f => console.log('  ', f.name, ':', f.type.name || f.type.ofType?.name || f.type.ofType?.ofType?.name));
}

const beverageInterface = types.find(x => x.name === 'Beverage');
console.log('\nBeverage fields:');
if (beverageInterface) {
  beverageInterface.fields.forEach(f => console.log('  ', f.name, ':', f.type.name || f.type.ofType?.name || f.type.ofType?.ofType?.name));
}

console.log('\nBeverage implementations:');
types.filter(t => t.interfaces && t.interfaces.some(i => i.name === 'Beverage')).forEach(t => console.log('  ', t.name));
