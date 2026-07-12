'use server';

import { cookies } from 'next/headers';
import { sdk } from '@/lib/apiClient';

export type CommissionConfig = {
  expertsCount: number;
  winesCount: number;
  evaluatedWinesCount?: number;
  type: 'NOT_STARTED' | 'IN_PROGRESS' | 'FINISHED';
  name: string;
};

export type SeederFormData = {
  competitionName: string;
  seriesName: string;
  commissions: CommissionConfig[];
};

function generateAuid() {
  return Math.floor(Math.random() * 10000) + 1;
}

const isValidUuid = (id?: string | null) => 
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id || '');

export async function seedCompetitionScenarioAction(data: SeederFormData) {
  const logs: string[] = [];
  const log = (msg: string) => logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);

  try {
    log('🚀 Початок генерації сценарію Data Seeder (New State Machine)...');
    
    // Отримуємо заголовки авторизації для створення об'єктів
    const cookieStore = await cookies();
    const auid = cookieStore.get("auid")?.value;

    if (!auid) {
        log(`⚠️ Увага: Кука 'auid' повністю відсутня. Організатор не авторизований.`);
        throw new Error("Авторизація відсутня: будь ласка, увійдіть в акаунт!");
    }
    const auidInt = parseInt(auid, 10);
    const headers = { "actor": auid, "x-actor": auid };
    
    log(`🔑 Авторизовано! Актор ID: ${auidInt}`);
    console.log(`🔑 [SEEDER SUCCESS] Актор ID: ${auidInt}`);
    
    const uniqueSuffix = `#${Math.floor(Math.random() * 9000) + 1000}`;
    const finalSeriesName = `${data.seriesName || 'Test Series'} ${uniqueSuffix}`;
    const finalCompetitionName = `${data.competitionName} ${uniqueSuffix}`;
    
    // Fetch default beverage type for candidates
    let beverageTypeId = '';
    try {
      const bevTypesRes = await sdk.DevGetBeverageTypes();
      log(`📋 Дамп типів напоїв з бази: ${JSON.stringify(bevTypesRes.beverageTypes?.items)}`);
      
      const existingWine = bevTypesRes.beverageTypes?.items?.find(i => i.code === "WINE");

      if (existingWine) {
          beverageTypeId = existingWine.id;
          log(`📦 Використовуємо офіційний BeverageTypeId з бази: ${beverageTypeId}`);
      } else {
          beverageTypeId = "11111111-1111-4111-8111-111111111101"; // Фолбек обов'язково має бути у форматі UUID!
          log(`⚠️ База типів порожня. Використовуємо дефолтний UUID напою: ${beverageTypeId}`);
      }
      console.log(`📦 [SEEDER SUCCESS] BeverageTypeId: ${beverageTypeId}`);
    } catch (e) {
      log(`⚠️ Помилка отримання або створення BeverageTypes: ${e instanceof Error ? e.message : 'Unknown Error'}`);
      throw new Error("Не вдалося ініціалізувати типи напоїв на бекенді.");
    }
    
    // 0. Створення серії змагань
    const seriesRes = await sdk.DevCreateCompetitionSeries({
      input: {
        name: finalSeriesName,
        countriesType: 'GLOBAL',
        countriesCodes: [],
        owners: [[generateAuid()]]
      }
    });
    const seriesId = seriesRes.createCompetitionSeries.id;
    log(`🎉 Серія змагань успішно створена! ID: ${seriesId}`);
    console.log(`🎉 [SEEDER SUCCESS] Series ID: ${seriesId}`);

    // Переведення серії за статусами
    await sdk.DevSubmitCompetitionSeriesForReview({ id: seriesId });
    log(`⏳ Серія змагань на рев'ю (IN_REVIEW)`);

    await sdk.DevApproveCompetitionSeries({ id: seriesId });
    log(`✅ Серія змагань підтверджена (APPROVED)`);

    // 1. Створення змагання
    const now = new Date();
    const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // -1 день (у минулому)
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 днів
    
    console.log("SENDING DATES TO BACKEND:", JSON.stringify({
      start: startDate.toISOString(),
      end: endDate.toISOString()
    }));

    const compRes = await sdk.DevCreateCompetition({
      input: {
        name: finalCompetitionName,
        seriesId: seriesId,
        holders: [[generateAuid()]],
        plannedDates: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }
    });
    const competitionId = compRes.createCompetition.id;
    log(`🏆 Конкурс успішно створено! ID: ${competitionId}`);
    console.log(`🏆 [SEEDER SUCCESS] Competition ID: ${competitionId}`);

    // 1.1 Перехід змагання по State Machine
    await sdk.DevSubmitCompetitionForReview({ id: competitionId });
    log(`⏳ Змагання на рев'ю (IN_REVIEW)`);
    
    await sdk.DevApproveCompetition({ id: competitionId });
    log(`✅ Змагання підтверджено (APPROVED)`);
    
    await sdk.DevPlanCompetition({ id: competitionId });
    log(`📅 Змагання заплановано (PLANNED)`);
    
    await sdk.DevStartCompetition({ id: competitionId });
    log(`✅ Конкурс успішно схвалено та переведено в статус РОЗПОЧАТО!`);
    console.log(`✅ [SEEDER SUCCESS] Competition approved and started`);

    const resultCommissions: any[] = [];

    // Отримуємо існуючий шаблон оцінювання для прив'язки
    let activeTemplateEditionId = '';
    let evaluationProperties: string[] = [];
    try {
      const evalTemplatesRes = await sdk.DevGetEvaluationTemplateEditions();
      const firstActive = evalTemplatesRes.evaluationTemplateEditions?.items?.find((i: any) => i.status === 'PUBLISHED' || i.status === 'ACTIVE');
      activeTemplateEditionId = firstActive?.id || evalTemplatesRes.evaluationTemplateEditions?.items?.[0]?.id || '';
      
      if (activeTemplateEditionId) {
         log(`📄 Знайдено шаблон оцінювання: ${activeTemplateEditionId}`);
         
         const query = `
           query GetTemplate($id: ID!) {
             evaluationTemplateEdition(id: $id) {
               categories {
                 properties {
                   __typename
                   code
                   isResult
                 }
               }
             }
           }
         `;
         const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://switchback.proxy.rlwy.net:43233/graphql';
         const tplRes = await fetch(GRAPHQL_ENDPOINT, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json', ...headers },
           body: JSON.stringify({ query, variables: { id: activeTemplateEditionId } })
         });
         const tplData = await tplRes.json();
         const categories = tplData?.data?.evaluationTemplateEdition?.categories || [];
         categories.forEach((cat: any) => {
           cat.properties.forEach((prop: any) => {
             // SmartProperty values are calculated by backend, everything else must be submitted!
             if (prop.__typename !== "SmartProperty") {
               evaluationProperties.push(prop.code);
             }
           });
         });
         log(`📄 Отримано властивостей для оцінки: ${evaluationProperties.length}`);
      } else {
         log(`⚠️ Шаблони оцінювання не знайдені в базі! Можливі помилки валідації.`);
      }
    } catch (e: any) {
      log(`⚠️ Помилка отримання шаблонів: ${e.message}`);
    }

    // Helper for creating commission and seeding data
    const seedCommission = async (
      name: string, 
      config: CommissionConfig, 
      type: 'NOT_STARTED' | 'IN_PROGRESS' | 'FINISHED'
    ) => {
      // 2. Створення комісії
      const commRes = await sdk.DevCreateCommission({
        input: {
          competitionId,
          name
        }
      });
      const commissionId = commRes.createCommission.id;
      log(`🏆 Конкурс успішно створено! ID: ${commissionId}`);

      log(`👥 Комісію успішно створено! ID: ${commissionId}`);
      console.log(`👥 [SEEDER SUCCESS] Commission ID: ${commissionId}`);

      if (activeTemplateEditionId) {
        await sdk.DevSetCommissionTemplateEdition({
          id: commissionId,
          beverageTypeId: beverageTypeId,
          templateEditionId: activeTemplateEditionId
        });
        log(`🔗 Шаблон оцінювання (${activeTemplateEditionId}) успішно прив'язано до комісії для типу напою ${beverageTypeId}`);
        console.log(`🔗 [SEEDER SUCCESS] Template linked`);
      }

      // Властивості для оцінювання вже завантажені глобально (evaluationProperties)

      // 3. Створення панелі
      const panelRes = await sdk.DevAddCommissionPanel({
        commissionId,
        name: "Панель 1"
      });
      const panelId = panelRes.addCommissionPanel.id;
      log(`   Дефолтну панель створено (ID: ${panelId})`);

      // 4. Додавання вин (Кандидатів) у панель
      const candidates = [];
      for (let i = 0; i < config.winesCount; i++) {
        // Створення реального напою, партії та зразка
        console.log("📝 [PAYLOAD DUMP] DevCreateBeverage input:", JSON.stringify({
            name: `Test Wine ${uniqueSuffix} - Comm${config.name.replace(/\s+/g, '')}-${i}`,
            typeId: beverageTypeId,
            producers: [{ auid: auidInt, role: "MAKER" }]
        }));
        
        const bevRes = await sdk.DevCreateBeverage({
          input: {
            name: `Test Wine ${uniqueSuffix} - Comm${config.name.replace(/\s+/g, '')}-${i}`,
            typeId: beverageTypeId,
            producers: [{ auid: auidInt, role: "MAKER" }]
          }
        }, { headers });
        const beverageId = bevRes.createBeverage.id;
        log(`🍷 [Вино ${i+1}] Створено Beverage! ID: ${beverageId}`);
        console.log(`🍷 [SEEDER SUCCESS] Beverage ID: ${beverageId}`);

        const batchRes = await sdk.DevCreateBatch({
          input: {
            beverageId
          }
        }, { headers });
        const batchId = batchRes.createBatch.id;
        log(`📦 [Вино ${i+1}] Створено Batch! ID: ${batchId}`);
        console.log(`📦 [SEEDER SUCCESS] Batch ID: ${batchId}`);

        const sampleRes = await sdk.DevCreateSample({
          input: {
            batchId
          }
        }, { headers });
        const sampleId = sampleRes.createSample.id;
        log(`🧪 [Вино ${i+1}] Створено Sample! ID: ${sampleId}`);
        console.log(`🧪 [SEEDER SUCCESS] Sample ID: ${sampleId}`);

        candidates.push({
          sampleId,
          anonymizedCode: `WINE-${Math.floor(Math.random() * 1000)}`
        });
      }
      
      await sdk.DevAddCommissionCandidates({
        commissionId,
        panelId,
        candidates
      });
      log(`   Додано ${config.winesCount} зразків вин у панель`);

      // 5. Створення репліки та експертів
      const replicaRes = await sdk.DevCreateCommissionReplica({
        input: {
          commissionId,
          name: 'Main Table',
          type: 'STANDARD',
          chaoticCurrentCandidateChangesEnabled: false,
          members: []
        }
      });
      const replicaId = replicaRes.createCommissionReplica.id;
      log(`   Репліку створено (ID: ${replicaId})`);

      const headAuid = auidInt;
      const headRes = await sdk.DevAddCommissionReplicaMember({
        id: replicaId,
        input: { auid: [headAuid], role: 'HEAD' }
      });
      const headMemberUuid = headRes.addCommissionReplicaMember.members.find(m => m.auid?.includes(headAuid))?.id;
      log(`   Голову "${config.headName}" додано (AUID: ${headAuid}, UUID: ${headMemberUuid})`);

      const experts = [];
      for (let i = 0; i < config.expertsCount; i++) {
        const expertAuid = generateAuid();
        const expertRes = await sdk.DevAddCommissionReplicaMember({
          id: replicaId,
          input: { auid: [expertAuid], role: 'EXPERT' }
        });
        const expertUuid = expertRes.addCommissionReplicaMember.members.find(m => m.auid?.includes(expertAuid))?.id;
        experts.push({ name: `Експерт #${expertAuid}`, auid: expertAuid, uuid: expertUuid });
      }
      log(`   Додано ${config.expertsCount} експертів`);

      // 6. Життєвий цикл комісії (Перехід за State Machine)
      await sdk.DevSubmitCommissionForReview({ id: commissionId });
      log(`⏳ Комісія на рев'ю (IN_REVIEW)`);

      await sdk.DevApproveCommission({ id: commissionId });
      log(`✅ Комісія підтверджена (APPROVED)`);

      await sdk.DevPlanCommission({ id: commissionId });
      log(`📅 Комісія запланована (PLANNED)`);
      
      await sdk.DevStartCommission({ id: commissionId });
      log(`▶️ Комісія активована (STARTED)`);

      // Життєвий цикл репліки
      await sdk.DevPlanCommissionReplica({ id: replicaId });
      log(`📅 Репліка запланована (PLANNED)`);

      // Голова та експерти підтверджують готовність
      if (headMemberUuid) {
        await sdk.DevMarkCommissionReplicaMemberReady({ id: replicaId, memberId: headMemberUuid });
      }
      for (const expert of experts) {
        if (expert.uuid) {
          await sdk.DevMarkCommissionReplicaMemberReady({ id: replicaId, memberId: expert.uuid });
        }
      }
      log(`🤝 Усі члени комісії готові!`);

      await sdk.DevStartCommissionReplica({ id: replicaId });
      log(`▶️ Репліка активована (STARTED)`);

      const commissionData = await sdk.GetCommission({ id: commissionId });
      const activeReplica = commissionData.commission?.replicas.find(r => r.id === replicaId);
      const replicaCandidates = activeReplica?.replicaCandidates || [];
      log(`   Отримано ${replicaCandidates.length} Replica Candidate IDs`);

      // 7. Імітація оцінювання
      let evalCount = 0;
      if (type === 'IN_PROGRESS') {
        evalCount = config.evaluatedWinesCount || 0;
      } else if (type === 'FINISHED') {
        evalCount = config.winesCount;
      }

      if (evalCount > 0) {
        log(`   Імітуємо оцінювання для ${evalCount} вин...`);
        const winesToEvaluate = replicaCandidates.slice(0, evalCount);
        
        for (const wine of winesToEvaluate) {
          log(`   ➡️ Встановлення кандидата ${wine.id} як поточного...`);
          try {
            await sdk.DevSetCommissionReplicaCurrentCandidate({
              id: replicaId,
              currentCandidateId: wine.id
            }, { headers: { 'X-ACTOR': headAuid.toString() } });
          } catch (e: any) {
            log(`   ⚠️ Не вдалося встановити кандидата: ${e.message}`);
          }

          const allMembersToEvaluate = [{ auid: headAuid, isHead: true }, ...experts];
          for (const expert of allMembersToEvaluate) {
            const randomScore = Math.floor(Math.random() * 51) + 50;
            try {
              const scores = evaluationProperties.length > 0 
                ? evaluationProperties.map(code => {
                    const max100 = code === 'typicity' || code === 'total_score';
                    const score = max100 
                        ? Math.floor(Math.random() * 51) + 50  // 50-100
                        : Math.floor(Math.random() * 5) + 5;   // 5-9 for 10-point scales
                    return { code, value: score.toString() };
                  })
                : [{ code: 'QUALITY', value: (Math.floor(Math.random() * 51) + 50).toString() }];

              const evalRes = await sdk.SubmitEvaluation({
                input: {
                  candidateId: wine.id,
                  scores,
                  comments: [{ text: 'Automated evaluation comment from seeder', sortOrder: 1 }]
                }
              }, { headers: { 'actor': expert.auid.toString(), 'x-actor': expert.auid.toString() } });
              log(`   [DEBUG] Evaluation for ${wine.id} by ${expert.auid} submitted. isComplete: ${evalRes.submitEvaluation.isComplete}`);
            } catch (e: any) {
              log(`   ⚠️ Помилка оцінювання для вина ${wine.id} експертом ${expert.auid}: ${e.message}`);
            }
          }
          try {
            await sdk.MarkCommissionReplicaCandidateAsEvaluated(
              { id: wine.id },
              { headers: { 'X-ACTOR': headAuid.toString() } }
            );
          } catch (e: any) {
            log(`   ⚠️ Не вдалося завершити оцінювання кандидата ${wine.id}: ${e.message}`);
          }
        }
        log(`   ✅ Оцінювання завершено`);
      }

      if (evalCount < replicaCandidates.length) {
        const nextWine = replicaCandidates[evalCount];
        log(`   ➡️ Встановлення кандидата ${nextWine.id} як поточного (наступного для оцінювання)...`);
        try {
          await sdk.DevSetCommissionReplicaCurrentCandidate({
            id: replicaId,
            currentCandidateId: nextWine.id
          }, { headers: { 'X-ACTOR': headAuid.toString() } });
        } catch (e: any) {
          log(`   ⚠️ Не вдалося встановити наступного кандидата: ${e.message}`);
        }
      }

      resultCommissions.push({
        id: commissionId,
        name,
        replicaId,
        head: { name: config.headName, auid: headAuid },
        experts,
        type
      });
    };

    for (const config of data.commissions) {
      await seedCommission(config.name, config, config.type);
    }

    log('🎉 Генерація сценарію успішно завершена!');
    
    return { 
      success: true, 
      logs, 
      competitionId, 
      commissions: resultCommissions 
    };
  } catch (e: any) {
    const errorMessage = e?.message || JSON.stringify(e);
    log(`❌ Критична помилка генератора: ${errorMessage}`);
    
    // НАШ РЯТІВНИЙ КРОК: виводимо повний об'єкт помилки у консоль сервера
    console.error("================ GENERATOR ERROR DUMP ================");
    // Виводимо весь об'єкт помилки з усіма потрохами, включаючи extensions від сервера Kotlin
    console.error(JSON.stringify(e, null, 2));
    console.error("======================================================");
    
    // Возвращаем объект СЮДА, вместо throw! Тогда Next.js покажет текст на экране.
    return { success: false, logs, error: e?.message || "Internal Error" };
  }
}

export async function getCompetitionsListAction() {
  try {
    const res = await sdk.DevGetCompetitionsList();
    const competitions = res.competitions.items || [];
    
    // Fetch commissions for each competition
    const enhancedCompetitions = await Promise.all(competitions.map(async (comp) => {
      const commissionsRes = await sdk.DevGetCommissionsByCompetition({ competitionId: comp.id, limit: 100 });
      const commissions = commissionsRes.commissionsByCompetition?.items || [];
      
      const enhancedCommissions = await Promise.all(commissions.map(async (comm) => {
        const replicasRes = await sdk.DevGetCommissionReplicasByCommission({ commissionId: comm.id });
        const replicas = replicasRes.commissionReplicasByCommission || [];
        return {
          ...comm,
          replicas
        };
      }));
      
      return {
        ...comp,
        commissions: enhancedCommissions
      };
    }));

    return { success: true, data: enhancedCompetitions };
  } catch (error: any) {
    console.error('Failed to get competitions list:', error);
    return { success: false, error: error.message };
  }
}
