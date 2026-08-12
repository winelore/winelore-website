const fs = require('fs');
const path = require('path');

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || 'https://winelore-dev.thewinelore.com/graphql';
const ACTOR_AUID = process.env.ACTOR_AUID || '2';
const BEVERAGE_TYPE_ID = "11111111-1111-4111-8111-111111111101";
const RUN_TAG = process.env.RUN_TAG || 'v2';

const CREATE_BEVERAGE_MUTATION = `
  mutation CreateBeverage($input: CreateBeverageInput!) {
    createBeverage(input: $input) {
      id
      name
      typeId
    }
  }
`;

const CREATE_BATCH_MUTATION = `
  mutation CreateBatch($input: CreateBatchInput!) {
    createBatch(input: $input) {
      id
    }
  }
`;

const CREATE_SAMPLE_MUTATION = `
  mutation CreateSample($input: CreateSampleInput!) {
    createSample(input: $input) {
      id
    }
  }
`;

async function postGraphQL(query, variables = {}) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ACTOR': String(ACTOR_AUID)
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  if (result.errors && result.errors.length > 0) {
    throw new Error(`GraphQL Error: ${result.errors.map(e => e.message).join(' | ')}`);
  }

  return result.data;
}

async function importWines() {
  const jsonPath = path.join(__dirname, '..', '5_відбір_вин_амбасад.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Файл ${jsonPath} не знайдено! Спочатку запустіть node scripts/parse_excel.js`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const dataset = JSON.parse(rawData);

  console.log(`🚀 Початок імпорту оновлених вин (WHITE/ROSE/RED) на бекенд: ${GRAPHQL_ENDPOINT}`);
  console.log(`👤 Використовуємо X-ACTOR: ${ACTOR_AUID}`);
  console.log(`📊 Загалом вин у файлі: ${dataset.totalWinesCount}\n`);

  const importResults = {
    competitionTitle: dataset.competitionTitle,
    targetEndpoint: GRAPHQL_ENDPOINT,
    actorAuid: ACTOR_AUID,
    runTag: RUN_TAG,
    importedAt: new Date().toISOString(),
    totalWines: dataset.totalWinesCount,
    successCount: 0,
    failCount: 0,
    wines: []
  };

  let globalCounter = 0;

  for (const sheet of dataset.sheets) {
    console.log(`\n📅 Обробка дня / аркуша: ${sheet.date}`);

    for (const category of sheet.categories) {
      console.log(`   🍷 Категорія: "${category.categoryName}" (${category.wines.length} вин)`);

      for (const wine of category.wines) {
        globalCounter++;
        // Unique beverage name for this run tag
        const uniqueWineName = RUN_TAG 
          ? `${wine.fullName} (${RUN_TAG}, №${wine.itemNumber}, ${sheet.date})`
          : `${wine.fullName} (№${wine.itemNumber}, ${sheet.date})`;

        try {
          // 1. Створення Beverage
          const beverageInput = {
            name: uniqueWineName,
            typeId: BEVERAGE_TYPE_ID,
            producers: [
              {
                auid: [parseInt(ACTOR_AUID, 10)],
                role: "MAKER"
              }
            ]
          };

          const bevData = await postGraphQL(CREATE_BEVERAGE_MUTATION, { input: beverageInput });
          const beverageId = bevData.createBeverage.id;

          // 2. Створення Batch
          const batchData = await postGraphQL(CREATE_BATCH_MUTATION, {
            input: { beverageId }
          });
          const batchId = batchData.createBatch.id;

          // 3. Створення Sample
          const sampleData = await postGraphQL(CREATE_SAMPLE_MUTATION, {
            input: { batchId }
          });
          const sampleId = sampleData.createSample.id;

          console.log(`     [${globalCounter}/${dataset.totalWinesCount}] ✅ #${wine.itemNumber} "${uniqueWineName}" -> Beverage: ${beverageId} | Batch: ${batchId} | Sample: ${sampleId}`);

          importResults.successCount++;
          importResults.wines.push({
            sheetDate: sheet.date,
            categoryName: category.categoryName,
            itemNumber: wine.itemNumber,
            fullName: wine.fullName,
            uniqueWineName: uniqueWineName,
            color: wine.color,
            vintageYear: wine.vintageYear,
            beverageId,
            batchId,
            sampleId,
            status: 'SUCCESS'
          });

        } catch (error) {
          console.error(`     [${globalCounter}/${dataset.totalWinesCount}] ❌ Помилка для #${wine.itemNumber} "${uniqueWineName}":`, error.message);
          importResults.failCount++;
          importResults.wines.push({
            sheetDate: sheet.date,
            categoryName: category.categoryName,
            itemNumber: wine.itemNumber,
            fullName: wine.fullName,
            uniqueWineName: uniqueWineName,
            error: error.message,
            status: 'FAILED'
          });
        }
      }
    }
  }

  const resultFilePath = path.join(__dirname, '..', '5_відбір_вин_амбасад_imported_result.json');
  fs.writeFileSync(resultFilePath, JSON.stringify(importResults, null, 2), 'utf-8');

  console.log(`\n==================================================`);
  console.log(`🎉 ІМПОРТ ЗАВЕРШЕНО!`);
  console.log(`✅ Успішно створено: ${importResults.successCount} вин`);
  console.log(`❌ Помилок: ${importResults.failCount}`);
  console.log(`📁 Звіт з ID збережено у: ${resultFilePath}`);
  console.log(`==================================================\n`);
}

importWines();
