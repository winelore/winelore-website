const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const excelPath = path.join(__dirname, '..', '5 відбір вин амбасад.xlsx');
const workbook = XLSX.readFile(excelPath);

workbook.SheetNames.forEach(sheetName => {
  console.log(`\n=================== SHEET: ${sheetName} ===================`);
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  rows.forEach((row, idx) => {
    if (row && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')) {
      console.log(`Row ${idx + 1}:`, JSON.stringify(row));
    }
  });
});
