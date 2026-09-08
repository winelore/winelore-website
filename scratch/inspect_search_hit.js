const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('./scratch/live_schema.json', 'utf8'));

const types = schema.types || schema.data?.__schema?.types || schema.__schema?.types;
console.log('Types count:', types ? types.length : 0);

if (types) {
  const searchHit = types.find(t => t.name === 'SearchHit');
  console.log('SearchHit:', searchHit?.fields?.map(f => f.name));

  const bevFilter = types.find(t => t.name === 'BeverageFilterInput');
  console.log('BeverageFilterInput:', bevFilter?.inputFields?.map(f => f.name));
}
