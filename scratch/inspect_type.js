const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('scratch/schema.json', 'utf8'));
const types = schema.data.__schema.types;

function printType(name) {
  const t = types.find(x => x.name === name);
  if (!t) {
    console.log(`Type ${name} not found`);
    return;
  }
  console.log(`=== TYPE: ${t.name} (${t.kind}) ===`);
  if (t.fields) {
    t.fields.forEach(f => {
      let ftype = f.type.name || f.type.kind;
      if (f.type.ofType) {
        ftype += ` of ${f.type.ofType.name || f.type.ofType.kind}`;
        if (f.type.ofType.ofType) {
          ftype += ` of ${f.type.ofType.ofType.name || f.type.ofType.ofType.kind}`;
        }
      }
      console.log(`  - ${f.name}: ${ftype}`);
    });
  }
}

printType('Commission');
printType('CommissionReplica');
printType('CommissionReplicaMember'); // if it exists
printType('CommissionReplicaCandidate');
printType('Evaluation');
