const fs = require('fs');
const path = require('path');

// -----------------------------------------------------------------------------
// Configuration & Environment Variables
// -----------------------------------------------------------------------------
const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'https://winelore-dev.thewinelore.com/graphql';
const ACTOR_AUID = process.env.ACTOR_AUID || '2';
const RUN_TAG = process.env.RUN_TAG || `comp_import_${Date.now()}`;
const CUSTOM_COMPETITION_NAME = process.env.COMPETITION_NAME || null;
const CUSTOM_SERIES_NAME = process.env.SERIES_NAME || "Всеукраїнський відбір вин-амбасадорів";
const EXISTING_SERIES_ID = process.env.SERIES_ID || null;

const BEVERAGE_TYPE_ID = "11111111-1111-4111-8111-111111111101";

// Paths
const EXCEL_FILE_PATH = path.join(__dirname, '..', '5 відбір вин амбасад.xlsx');
const PARSED_JSON_PATH = path.join(__dirname, '..', '5_відбір_вин_амбасад.json');
const RESULT_OUTPUT_PATH = path.join(__dirname, '..', '5_відбір_вин_амбасад_competition_imported_result.json');

// -----------------------------------------------------------------------------
// Helper: GraphQL Client
// -----------------------------------------------------------------------------
async function postGraphQL(query, variables = {}) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ACTOR': String(ACTOR_AUID)
    },
    body: JSON.stringify({ query, variables })
  });

  const responseText = await response.text();
  let result;
  try {
    result = JSON.parse(responseText);
  } catch (err) {
    throw new Error(`Invalid JSON response from server (${response.status}): ${responseText.slice(0, 300)}`);
  }

  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}: ${result.message || response.statusText}`);
  }

  if (result.errors && result.errors.length > 0) {
    throw new Error(`GraphQL Error: ${result.errors.map(e => e.message).join(' | ')}`);
  }

  return result.data;
}

// -----------------------------------------------------------------------------
// Helper: Parsing Excel if JSON does not exist
// -----------------------------------------------------------------------------
function parseExcelData() {
  if (fs.existsSync(PARSED_JSON_PATH)) {
    console.log(`📁 Завантаження розпарсених даних з: ${PARSED_JSON_PATH}`);
    const rawData = fs.readFileSync(PARSED_JSON_PATH, 'utf-8');
    return JSON.parse(rawData);
  }

  console.log(`📊 Завантаження та парсинг файлу Excel: ${EXCEL_FILE_PATH}`);
  const XLSX = require('xlsx');
  const workbook = XLSX.readFile(EXCEL_FILE_PATH);

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
    sheets: []
  };

  let totalWinesCount = 0;

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const sheetObj = {
      date: sheetName,
      categories: []
    };

    let currentCategory = null;

    rows.forEach(row => {
      if (!row) return;
      const col0 = row[0];
      const col1 = row[1];

      if ((col0 === null || col0 === undefined) && typeof col1 === 'string') {
        const text = col1.trim();
        if (text.includes('Всеукраїнський відбір') || text.includes('V ювілейний')) return;

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
        const color = detectColor(rawText, catName);

        const wineObj = {
          itemNumber: col0,
          fullName: cleanedName,
          originalFullName: rawText,
          color: color,
          rawCategory: catName
        };

        if (!currentCategory) {
          currentCategory = { categoryName: "Без категорії", wines: [] };
          sheetObj.categories.push(currentCategory);
        }

        currentCategory.wines.push(wineObj);
        totalWinesCount++;
      }
    });

    outputData.sheets.push(sheetObj);
  });

  outputData.totalWinesCount = totalWinesCount;
  return outputData;
}

// -----------------------------------------------------------------------------
// Main Script Logic
// -----------------------------------------------------------------------------
async function run() {
  console.log(`=======================================================`);
  console.log(`🍷 WINELORE: Створення конкурсу та імпорт вин з Excel 🏆`);
  console.log(`=======================================================`);
  console.log(`🌐 GraphQL Endpoint : ${GRAPHQL_ENDPOINT}`);
  console.log(`👤 Actor AUID       : ${ACTOR_AUID}`);
  console.log(`🏷️ Run Tag          : ${RUN_TAG}\n`);

  // 1. Отримання даних вин з Excel / JSON
  const dataset = parseExcelData();
  const baseTitle = dataset.competitionTitle || "V ювілейний Всеукраїнський відбір офіційних вин амбасадорів 2026";
  const competitionTitle = CUSTOM_COMPETITION_NAME || `${baseTitle} (${RUN_TAG})`;
  console.log(`📋 Назва конкурсу : "${competitionTitle}"`);
  console.log(`🍷 Всього вин у файлі: ${dataset.totalWinesCount}\n`);

  // 2. Створення / Отримання серії змагань (CompetitionSeries)
  let seriesId = EXISTING_SERIES_ID;
  if (!seriesId) {
    console.log(`1️⃣  Перевірка/Створення серії змагань: "${CUSTOM_SERIES_NAME}"...`);
    
    // Спробуємо знайти існуючу серію з такою назвою
    try {
      const seriesListRes = await postGraphQL(`
        query GetSeriesList {
          competitionSeriesList(limit: 100) {
            items {
              id
              name
            }
          }
        }
      `);
      const existingSeries = seriesListRes?.competitionSeriesList?.items?.find(s => s.name === CUSTOM_SERIES_NAME);
      if (existingSeries) {
        seriesId = existingSeries.id;
        console.log(`   ℹ️ Знайдено існуючу серію змагань: "${existingSeries.name}" (ID: ${seriesId})`);
      }
    } catch (e) {
      console.log(`   ⚠️ Не вдалося отримати список серій: ${e.message}`);
    }

    if (!seriesId) {
      const createSeriesMutation = `
        mutation CreateSeries($input: CreateCompetitionSeriesInput!) {
          createCompetitionSeries(input: $input) {
            id
            name
          }
        }
      `;
      try {
        const seriesRes = await postGraphQL(createSeriesMutation, {
          input: {
            name: CUSTOM_SERIES_NAME,
            countriesType: 'GLOBAL',
            countriesCodes: [],
            owners: [[parseInt(ACTOR_AUID, 10)]]
          }
        });
        seriesId = seriesRes.createCompetitionSeries.id;
        console.log(`   ✅ Серію успішно створено! ID: ${seriesId}`);

        // Переведення серії у статус APPROVED
        try {
          await postGraphQL(`mutation SubmitSeries($id: ID!) { submitCompetitionSeriesForReview(id: $id) { id } }`, { id: seriesId });
          await postGraphQL(`mutation ApproveSeries($id: ID!) { approveCompetitionSeries(id: $id) { id } }`, { id: seriesId });
          console.log(`   ✅ Серію переведено в статус APPROVED`);
        } catch (e) {
          console.log(`   ⚠️ Перехід стану серії: ${e.message}`);
        }
      } catch (e) {
        if (e.message.includes('already exists')) {
          console.log(`   ℹ️ Серія вже існує. Отримуємо ID...`);
          const seriesListRes = await postGraphQL(`
            query GetSeriesList {
              competitionSeriesList(limit: 100) {
                items { id name }
              }
            }
          `);
          const found = seriesListRes?.competitionSeriesList?.items?.[0];
          if (found) seriesId = found.id;
        } else {
          throw e;
        }
      }
    }
  } else {
    console.log(`1️⃣  Використовуємо вказану серію змагань ID: ${seriesId}`);
  }

  // 3. Створення конкурсу (Competition)
  console.log(`\n2️⃣  Створення конкурсу: "${competitionTitle}"...`);
  const now = new Date();
  const startDate = new Date(now.getTime());
  const endDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const createCompetitionMutation = `
    mutation CreateCompetition($input: CreateCompetitionInput!) {
      createCompetition(input: $input) {
        id
        name
      }
    }
  `;

  const compRes = await postGraphQL(createCompetitionMutation, {
    input: {
      name: competitionTitle,
      seriesId: seriesId,
      holders: [[parseInt(ACTOR_AUID, 10)]],
      plannedDates: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    }
  });

  const competitionId = compRes.createCompetition.id;
  console.log(`   ✅ Конкурс успішно створено! ID: ${competitionId}`);

  // Переведення конкурсу по State Machine у статус STARTED
  try {
    await postGraphQL(`mutation SubmitComp($id: ID!) { submitCompetitionForReview(id: $id) { id } }`, { id: competitionId });
    await postGraphQL(`mutation ApproveComp($id: ID!) { approveCompetition(id: $id) { id } }`, { id: competitionId });
    await postGraphQL(`mutation PlanComp($id: ID!) { planCompetition(id: $id) { id } }`, { id: competitionId });
    await postGraphQL(`mutation StartComp($id: ID!) { startCompetition(id: $id) { id } }`, { id: competitionId });
    console.log(`   ✅ Статус конкурсу переведено в РОЗПОЧАТО (STARTED)`);
  } catch (e) {
    console.log(`   ⚠️ Перехід стану конкурсу: ${e.message}`);
  }

  // 4. Створення вин, батчів, зразків та прив'язка до комісій та панелей
  console.log(`\n3️⃣  Імпорт вин та розбудова структури комісій і панелей...`);

  const CREATE_BEVERAGE_MUTATION = `
    mutation CreateBeverage($input: CreateBeverageInput!) {
      createBeverage(input: $input) { id name }
    }
  `;

  const CREATE_BATCH_MUTATION = `
    mutation CreateBatch($input: CreateBatchInput!) {
      createBatch(input: $input) { id }
    }
  `;

  const CREATE_SAMPLE_MUTATION = `
    mutation CreateSample($input: CreateSampleInput!) {
      createSample(input: $input) { id }
    }
  `;

  const CREATE_COMMISSION_MUTATION = `
    mutation CreateCommission($input: CreateCommissionInput!) {
      createCommission(input: $input) { id name }
    }
  `;

  const ADD_PANEL_MUTATION = `
    mutation AddCommissionPanel($commissionId: ID!, $name: String!) {
      addCommissionPanel(commissionId: $commissionId, name: $name) { id name }
    }
  `;

  const ADD_CANDIDATES_MUTATION = `
    mutation AddCommissionCandidates($panelId: ID!, $candidates: [AddCommissionCandidateItemInput!]!) {
      addCommissionCandidates(panelId: $panelId, candidates: $candidates) { id }
    }
  `;

  const results = {
    competitionId,
    competitionTitle,
    seriesId,
    targetEndpoint: GRAPHQL_ENDPOINT,
    actorAuid: ACTOR_AUID,
    runTag: RUN_TAG,
    importedAt: new Date().toISOString(),
    totalWines: dataset.totalWinesCount,
    successCount: 0,
    failCount: 0,
    commissions: []
  };

  let globalWineCounter = 0;

  for (const sheet of dataset.sheets) {
    console.log(`\n📅 Обробка аркуша / дня: "${sheet.date}"`);

    // 4.1 Створення Комісії для аркуша/дня
    const commissionName = `Комісія - ${sheet.date}`;
    const commRes = await postGraphQL(CREATE_COMMISSION_MUTATION, {
      input: {
        competitionId: competitionId,
        name: commissionName
      }
    });
    const commissionId = commRes.createCommission.id;
    console.log(`   👥 Створено комісію: "${commissionName}" (ID: ${commissionId})`);

    const commissionReport = {
      commissionId,
      commissionName,
      sheetDate: sheet.date,
      panels: []
    };

    for (const category of sheet.categories) {
      if (!category.wines || category.wines.length === 0) continue;

      console.log(`      🍷 Категорія (Панель): "${category.categoryName}" (${category.wines.length} вин)`);

      // 4.2 Створення Панелі для категорії
      const panelRes = await postGraphQL(ADD_PANEL_MUTATION, {
        commissionId: commissionId,
        name: category.categoryName
      });
      const panelId = panelRes.addCommissionPanel.id;

      const panelCandidates = [];
      const panelReport = {
        panelId,
        categoryName: category.categoryName,
        wines: []
      };

      for (const wine of category.wines) {
        globalWineCounter++;
        const uniqueWineName = `${wine.fullName} (${RUN_TAG}, №${wine.itemNumber}, ${sheet.date})`;

        try {
          // 1) Create Beverage
          const bevRes = await postGraphQL(CREATE_BEVERAGE_MUTATION, {
            input: {
              name: uniqueWineName,
              typeId: BEVERAGE_TYPE_ID,
              producers: [{ auid: [parseInt(ACTOR_AUID, 10)], role: "MAKER" }]
            }
          });
          const beverageId = bevRes.createBeverage.id;

          // 2) Create Batch
          const batchRes = await postGraphQL(CREATE_BATCH_MUTATION, {
            input: {
              beverageId: beverageId,
              lotNumber: wine.itemNumber ? `LOT-${wine.itemNumber}` : null
            }
          });
          const batchId = batchRes.createBatch.id;

          // 3) Create Sample
          const sampleRes = await postGraphQL(CREATE_SAMPLE_MUTATION, {
            input: {
              batchId: batchId,
              volumeMl: 750
            }
          });
          const sampleId = sampleRes.createSample.id;

          // Prepare candidate item for panel
          const anonymizedCode = `SAMPLE-${wine.itemNumber}`;
          panelCandidates.push({
            sampleId: sampleId,
            anonymizedCode: anonymizedCode
          });

          results.successCount++;
          panelReport.wines.push({
            itemNumber: wine.itemNumber,
            fullName: wine.fullName,
            uniqueWineName,
            beverageId,
            batchId,
            sampleId,
            anonymizedCode,
            status: "SUCCESS"
          });

          console.log(`        [${globalWineCounter}/${dataset.totalWinesCount}] ✅ #${wine.itemNumber} "${wine.fullName}" -> Sample: ${sampleId}`);

        } catch (err) {
          results.failCount++;
          panelReport.wines.push({
            itemNumber: wine.itemNumber,
            fullName: wine.fullName,
            error: err.message,
            status: "FAILED"
          });
          console.error(`        [${globalWineCounter}/${dataset.totalWinesCount}] ❌ Помилка для #${wine.itemNumber}: ${err.message}`);
        }
      }

      // 4.3 Прив'язка всіх кандидатів-зразків до Панелі
      if (panelCandidates.length > 0) {
        try {
          await postGraphQL(ADD_CANDIDATES_MUTATION, {
            panelId: panelId,
            candidates: panelCandidates
          });
          console.log(`        🔗 Додано ${panelCandidates.length} зразків у панель "${category.categoryName}"`);
        } catch (err) {
          console.error(`        ❌ Помилка додавання зразків до панелі: ${err.message}`);
        }
      }

      commissionReport.panels.push(panelReport);
    }

    results.commissions.push(commissionReport);
  }

  // 5. Збереження результату у файл
  fs.writeFileSync(RESULT_OUTPUT_PATH, JSON.stringify(results, null, 2), 'utf-8');

  console.log(`\n=======================================================`);
  console.log(`🎉 КОНКУРС УСПІШНО СТВОРЕНО ТА ІМПОРТОВАНО!`);
  console.log(`=======================================================`);
  console.log(`🏆 Competition ID : ${competitionId}`);
  console.log(`🎉 Series ID      : ${seriesId}`);
  console.log(`✅ Успішно вин    : ${results.successCount} / ${dataset.totalWinesCount}`);
  console.log(`❌ Помилок       : ${results.failCount}`);
  console.log(`📁 Звіт збережено : ${RESULT_OUTPUT_PATH}`);
  console.log(`=======================================================\n`);
}

run().catch(err => {
  console.error(`❌ Фатальна помилка виконання скрипта:`, err);
  process.exit(1);
});
