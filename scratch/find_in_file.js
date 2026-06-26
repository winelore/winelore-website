const fs = require('fs');
const content = fs.readFileSync('app/commission/[id]/CommissionClientView.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('activeTab')) {
    console.log(`${index + 1}: ${line}`);
  }
});
