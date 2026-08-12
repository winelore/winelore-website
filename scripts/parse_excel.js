const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const excelPath = path.join(__dirname, '..', '5 відбір вин амбасад.xlsx');
const workbook = XLSX.readFile(excelPath);

const BEVERAGE_TYPE_ID = "11111111-1111-4111-8111-111111111101";
const DEFAULT_PRODUCERS = [
  {
    auid: [2],
    role: "MAKER"
  }
];

function cleanWineName(rawName) {
  let cleaned = rawName.replace(/^вино\s+/i, '').trim();
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
}

function detectColor(fullName, categoryName) {
  const text = `${fullName} ${categoryName}`.toLowerCase();
  if (text.includes('біл')) return 'WHITE';
  if (text.includes('рожев')) return 'ROSE';
  if (text.includes('червон')) return 'RED';
  return null;
}

const outputData = {
  competitionTitle: "V ювілейний Всеукраїнський відбір офіційних вин амбасадорів 2026",
  sourceFile: "5 відбір вин амбасад.xlsx",
  parsedAt: new Date().toISOString(),
  defaultBeverageTypeId: BEVERAGE_TYPE_ID,
  defaultProducers: DEFAULT_PRODUCERS,
  sheets: []
};

let totalWinesCount = 0;
let colorsDetectedCount = 0;

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const sheetObj = {
    date: sheetName,
    categories: []
  };

  let currentCategory = null;

  rows.forEach((row, rowIndex) => {
    if (!row) return;

    const col0 = row[0];
    const col1 = row[1];

    if ((col0 === null || col0 === undefined) && typeof col1 === 'string') {
      const text = col1.trim();
      if (text.includes('Всеукраїнський відбір') || text.includes('V ювілейний')) {
        return;
      }
      
      const cleanCatName = text.replace(/:$/, '').trim();
      currentCategory = {
        categoryName: cleanCatName,
        wines: []
      };
      sheetObj.categories.push(currentCategory);
    } else if (typeof col0 === 'number' && typeof col1 === 'string') {
      const rawText = col1.trim();
      const cleanedName = cleanWineName(rawText);
      const catName = currentCategory ? currentCategory.categoryName : "";
      
      // Extract vintage year for reference in json
      const yearMatch = rawText.match(/урожа[юя]\s*(\d{4})/i) || rawText.match(/урожай\s*(\d{4})/i);
      const vintageYear = yearMatch ? parseInt(yearMatch[1], 10) : null;

      // Detect color as ROSE / WHITE / RED
      const color = detectColor(rawText, catName);
      if (color) colorsDetectedCount++;

      // Construct ONLY color map in attributes (as requested: "{\"color\":\"WHITE\"}")
      const attributesObj = {};
      if (color) {
        attributesObj.color = color;
      }

      const attributesJsonString = Object.keys(attributesObj).length > 0
        ? JSON.stringify(attributesObj)
        : null;

      // Construct GraphQL CreateBeverageInput payload
      const createBeverageInput = {
        name: cleanedName,
        typeId: BEVERAGE_TYPE_ID,
        producers: DEFAULT_PRODUCERS,
        ...(attributesJsonString ? { attributes: attributesJsonString } : {})
      };

      const wineObj = {
        itemNumber: col0,
        fullName: cleanedName,
        originalFullName: rawText,
        color: color,
        vintageYear: vintageYear,
        rawCategory: catName,
        createBeverageInput: createBeverageInput
      };

      if (!currentCategory) {
        currentCategory = {
          categoryName: "Без категорії",
          wines: []
        };
        sheetObj.categories.push(currentCategory);
      }

      currentCategory.wines.push(wineObj);
      totalWinesCount++;
    }
  });

  outputData.sheets.push(sheetObj);
});

outputData.totalWinesCount = totalWinesCount;

const jsonOutputPath = path.join(__dirname, '..', '5_відбір_вин_амбасад.json');
fs.writeFileSync(jsonOutputPath, JSON.stringify(outputData, null, 2), 'utf-8');

console.log(`✅ Парсинг успішно оновлено! Колір змінено на WHITE / ROSE / RED`);
console.log(`📊 Всього вин: ${totalWinesCount}`);
console.log(`🎨 Виявлено колір для ${colorsDetectedCount} з ${totalWinesCount} вин`);
console.log(`📁 Файл оновлено: ${jsonOutputPath}`);

// Print sample names and attributes
console.log('\n--- Приклад вин з оновленими кольорами (WHITE / ROSE / RED) ---');
outputData.sheets[0].categories[0].wines.slice(0, 5).forEach(w => {
  console.log(`  - #${w.itemNumber}: "${w.fullName}" | color=${w.color} | attributes=${w.createBeverageInput.attributes}`);
});
