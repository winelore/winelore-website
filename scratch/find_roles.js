const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('scratch/schema.json', 'utf8'));
const types = schema.data ? schema.data.__schema.types : schema.types;
const roleEnum = types.find(t => t.name === 'CommissionReplicaMemberRole');
console.log('Role enum:', roleEnum);
