import { cookies } from 'next/headers';
import { sdk } from '@/lib/apiClient';
import { getGraphQLEndpoint } from '@/lib/graphqlEndpoint';

export type ReplicaConfig = {
  name: string;
  expertsCount: number;
};

export type PanelConfig = {
  name: string;
  winesCount: number;
};

export type CommissionConfig = {
  name: string;
  type: 'NOT_STARTED' | 'IN_PROGRESS' | 'FINISHED';
  panels: PanelConfig[];
  replicas: ReplicaConfig[];
  evaluatedWinesCount?: number;
};

export type SeederFormData = {
  competitionName: string;
  seriesName: string;
  commissions: CommissionConfig[];
};

function generateAuid() {
  return Math.floor(Math.random() * 10000) + 1;
}

function cleanString(str?: string | null, fallback = ''): string {
  if (!str) return fallback;
  const cleaned = str.trim().replace(/\s+/g, ' ');
  return cleaned || fallback;
}

const isValidUuid = (id?: string | null) => 
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id || '');

export async function seedCompetitionScenarioAction(data: SeederFormData, log: (msg: string) => void) {
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
    
    const uniqueSuffix = `${Math.floor(Math.random() * 9000) + 1000}`;
    const baseSeriesName = cleanString(data.seriesName, 'Test Series');
    const baseCompetitionName = cleanString(data.competitionName, 'Test Competition');
    const finalSeriesName = cleanString(`${baseSeriesName} ${uniqueSuffix}`);
    const finalCompetitionName = cleanString(`${baseCompetitionName} ${uniqueSuffix}`);
    
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
        owners: [[auidInt]]
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
        holders: [[auidInt]],
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
    let evaluationProperties: { code: string, min: number, max: number }[] = [];
    try {
      const evalTemplatesRes = await sdk.DevGetEvaluationTemplateEditions();
      const items = evalTemplatesRes.evaluationTemplateEditions?.items || [];
      
      log(`🔎 Знайдено ${items.length} шаблонів у базі. Аналізуємо...`);
      items.forEach((item: any, index: number) => {
        const catCount = item.categories?.length || 0;
        const bevId = item.template?.beverageType?.id;
        const name = item.template?.name || "Unknown";
        log(`   [${index + 1}] ID: ${item.id} | Назва: "${name}" | Статус: ${item.status} | Категорій: ${catCount} | BevType: ${bevId}`);
      });

      // Шукаємо активний шаблон для нашого типу напою (WINE)
      let selectedTemplate = items.find((i: any) => 
        (i.status === 'PUBLISHED' || i.status === 'ACTIVE') && 
        i.template?.beverageType?.id === beverageTypeId &&
        i.categories && i.categories.length > 0
      ) || items.find((i: any) => 
        (i.status === 'PUBLISHED' || i.status === 'ACTIVE') && 
        i.template?.beverageType?.id === beverageTypeId
      );

      // Якщо для цього типу напою немає шаблону, беремо будь-який активний і синхронізуємо beverageTypeId
      if (!selectedTemplate) {
        selectedTemplate = items.find((i: any) => 
          (i.status === 'PUBLISHED' || i.status === 'ACTIVE') && 
          i.template?.beverageType?.id &&
          i.categories && i.categories.length > 0
        ) || items.find((i: any) => 
          (i.status === 'PUBLISHED' || i.status === 'ACTIVE') && i.template?.beverageType?.id
        ) || items[0];

        if (selectedTemplate?.template?.beverageType?.id) {
          beverageTypeId = selectedTemplate.template.beverageType.id;
          log(`ℹ️ Для вибраного шаблону оновлено тип напою: ${beverageTypeId}`);
        }
      }

      activeTemplateEditionId = selectedTemplate?.id || '';
      
      if (activeTemplateEditionId) {
         const selectedName = selectedTemplate?.template?.name || "Unknown";
         log(`📄 Вибрано шаблон оцінювання: "${selectedName}" (ID: ${activeTemplateEditionId})`);
         
         const query = `
           query GetTemplate($id: ID!) {
             evaluationTemplateEdition(id: $id) {
               categories {
                 properties {
                   __typename
                   code
                   isResult
                   ... on DoubleProperty {
                     doubleMin: minLimit
                     doubleMax: maxLimit
                   }
                   ... on IntProperty {
                     intMin: minLimit
                     intMax: maxLimit
                   }
                 }
               }
             }
           }
         `;
         const tplRes = await fetch(getGraphQLEndpoint(), {
           method: 'POST',
           headers: { 'Content-Type': 'application/json', ...headers },
           body: JSON.stringify({ query, variables: { id: activeTemplateEditionId } })
         });
         const tplData = await tplRes.json();
         const categories = tplData?.data?.evaluationTemplateEdition?.categories || [];
          categories.forEach((cat: any) => {
            cat.properties?.forEach((prop: any) => {
              // SmartProperty values are calculated by backend, everything else must be submitted!
              if (prop.__typename !== "SmartProperty") {
                let min = 0;
                let max = 100;
                if (prop.__typename === "DoubleProperty") {
                  min = prop.doubleMin ?? 0;
                  max = prop.doubleMax ?? 100;
                } else if (prop.__typename === "IntProperty") {
                  min = prop.intMin ?? 0;
                  max = prop.intMax ?? 100;
                }
                evaluationProperties.push({ code: prop.code, min, max });
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
      type: 'NOT_STARTED' | 'IN_PROGRESS' | 'FINISHED',
      cIdx: number
    ) => {
      // 2. Створення комісії
      const commCleanName = cleanString(name, 'Комісія');
      const commRes = await sdk.DevCreateCommission({
        input: {
          competitionId,
          name: commCleanName,
          partialCandidateEvaluationEnabled: true,
          propertyCommentsEnabled: true,
          voiceCommentsEnabled: true
        }
      });
      const commissionId = commRes.createCommission.id;
      log(`👥 Комісію "${commCleanName}" успішно створено! ID: ${commissionId}`);
      console.log(`👥 [SEEDER SUCCESS] Commission ID: ${commissionId}`);

      if (activeTemplateEditionId) {
        await sdk.DevSetCommissionTemplateEdition({
          id: commissionId,
          beverageTypeId: beverageTypeId,
          templateEditionId: activeTemplateEditionId
        });
        log(`🔗 Шаблон оцінювання (${activeTemplateEditionId}) успішно прив'язано до комісії`);
        console.log(`🔗 [SEEDER SUCCESS] Template linked`);
      }

      // 3. Створення панелей та вин
      let globalCandidateIndex = 0;
      for (let pIdx = 0; pIdx < config.panels.length; pIdx++) {
        const panelConfig = config.panels[pIdx];
        const cleanPanelName = cleanString(panelConfig.name, `Панель ${pIdx + 1}`);
        const panelRes = await sdk.DevAddCommissionPanel({
          commissionId,
          name: cleanPanelName
        });
        const panelId = panelRes.addCommissionPanel.id;
        log(`   Панель "${cleanPanelName}" створено (ID: ${panelId})`);

        const candidates = [];
        for (let i = 0; i < panelConfig.winesCount; i++) {
          const wineIndex = globalCandidateIndex++;
          const bevName = cleanString(`Test Wine ${uniqueSuffix}-C${cIdx + 1}-P${pIdx + 1}-W${i + 1}-${Math.floor(Math.random() * 9000) + 1000}`);
          const bevRes = await sdk.DevCreateBeverage({
            input: {
              name: bevName,
              typeId: beverageTypeId,
              producers: [{ auid: [auidInt], role: "MAKER" }]
            }
          }, { headers });
          const beverageId = bevRes.createBeverage.id;

          const batchRes = await sdk.DevCreateBatch({
            input: { beverageId }
          }, { headers });
          const batchId = batchRes.createBatch.id;

          const sampleRes = await sdk.DevCreateSample({
            input: { batchId }
          }, { headers });
          const sampleId = sampleRes.createSample.id;

          candidates.push({
            sampleId,
            anonymizedCode: `WINE-${Math.floor(Math.random() * 1000)}`
          });
        }
        
        await sdk.DevAddCommissionCandidates({
          panelId,
          candidates
        });
        log(`   Додано ${panelConfig.winesCount} зразків вин у панель "${cleanPanelName}"`);
      }

      // 4. Життєвий цикл комісії (Перехід за State Machine)
      await sdk.DevSubmitCommissionForReview({ id: commissionId });
      log(`⏳ Комісія на рев'ю (IN_REVIEW)`);

      await sdk.DevApproveCommission({ id: commissionId });
      log(`✅ Комісія підтверджена (APPROVED)`);

      await sdk.DevPlanCommission({ id: commissionId });
      log(`📅 Комісія запланована (PLANNED)`);
      
      await sdk.DevStartCommission({ id: commissionId });
      log(`▶️ Комісія активована (STARTED)`);

      const totalWinesCount = config.panels.reduce((sum: number, p: PanelConfig) => sum + p.winesCount, 0);
      let evalCount = 0;
      if (type === 'IN_PROGRESS') {
        evalCount = Math.min(config.evaluatedWinesCount || 0, totalWinesCount);
      } else if (type === 'FINISHED') {
        evalCount = totalWinesCount;
      }

      const commissionReplicasOutput = [];
      const createdReplicas = [];

      // 5. Створення реплік та експертів
      for (let rIdx = 0; rIdx < config.replicas.length; rIdx++) {
        const replicaConfig = config.replicas[rIdx];
        const cleanReplicaName = cleanString(replicaConfig.name, `Репліка ${rIdx + 1}`);
        const replicaRes = await sdk.DevCreateCommissionReplica({
          input: {
            commissionId,
            name: cleanReplicaName,
            type: 'STANDARD',
            chaoticCurrentPanelChangesEnabled: true,
            members: []
          }
        });
        const replicaId = replicaRes.createCommissionReplica.id;
        log(`   Репліку "${cleanReplicaName}" створено (ID: ${replicaId})`);

        // Генеруємо нового голову для репліки!
        const headAuid = generateAuid();
        const headRes = await sdk.DevAddCommissionReplicaMember({
          id: replicaId,
          input: { auid: [headAuid], role: 'HEAD' }
        });
        const headMemberUuid = headRes.addCommissionReplicaMember.members.find(m => m.auid?.includes(headAuid))?.id;
        log(`   Голову згенеровано (AUID: ${headAuid}, UUID: ${headMemberUuid})`);

        const experts = [];
        for (let i = 0; i < replicaConfig.expertsCount; i++) {
          const expertAuid = generateAuid();
          const expertRes = await sdk.DevAddCommissionReplicaMember({
            id: replicaId,
            input: { auid: [expertAuid], role: 'EXPERT' }
          });
          const expertUuid = expertRes.addCommissionReplicaMember.members.find(m => m.auid?.includes(expertAuid))?.id;
          experts.push({ name: `Експерт #${expertAuid}`, auid: expertAuid, uuid: expertUuid });
        }
        log(`   Додано ${replicaConfig.expertsCount} експертів`);

        // Життєвий цикл репліки: планування
        await sdk.DevPlanCommissionReplica({ id: replicaId });
        log(`📅 Репліка "${cleanReplicaName}" запланована (PLANNED)`);

        // Голова та експерти підтверджують готовність
        if (headMemberUuid) {
          await sdk.DevMarkCommissionReplicaMemberReady({ id: replicaId, memberId: headMemberUuid });
        }
        for (const expert of experts) {
          if (expert.uuid) {
            await sdk.DevMarkCommissionReplicaMemberReady({ id: replicaId, memberId: expert.uuid });
          }
        }
        log(`🤝 Усі члени репліки "${cleanReplicaName}" готові!`);

        // Якщо комісія NOT_STARTED, репліка залишається у статусі PLANNED
        if (type === 'NOT_STARTED') {
          log(`⏸️ Репліка "${cleanReplicaName}" готова до старту (статус PLANNED)`);
        } else {
          await sdk.DevStartCommissionReplica(
            { id: replicaId },
            { headers: { 'actor': headAuid.toString(), 'x-actor': headAuid.toString() } }
          );
          log(`▶️ Репліка "${cleanReplicaName}" активована (STARTED)`);
        }

        createdReplicas.push({ replicaId, replicaName: cleanReplicaName, headAuid, experts });
        
        commissionReplicasOutput.push({
          replicaId,
          replicaName: cleanReplicaName,
          head: { auid: headAuid },
          experts
        });
      }

      // 6. Імітація оцінювання та життєвого циклу дегустації (для IN_PROGRESS та FINISHED)
      if (type !== 'NOT_STARTED') {
        for (const rep of createdReplicas) {
          const commissionData = await sdk.GetCommission({ id: commissionId });
          const activeReplica = commissionData.commission?.replicas.find(r => r.id === rep.replicaId);
          const replicaPanels = activeReplica?.replicaPanels || [];

          log(`   Імітуємо процес для "${rep.replicaName}" (Оцінити: ${evalCount}/${totalWinesCount} вин)...`);
          let evaluatedSoFar = 0;
          let nextCandidateSet = false;

          for (let pIdx = 0; pIdx < replicaPanels.length; pIdx++) {
            const panel = replicaPanels[pIdx];
            const candidates = panel.replicaCandidates || [];
            if (candidates.length === 0) continue;

            let panelEvaluatedCount = 0;

            for (let cIdx = 0; cIdx < candidates.length; cIdx++) {
              const wine = candidates[cIdx];

              if (evaluatedSoFar < evalCount) {
                // Встановлюємо поточну панель та зразок
                try {
                  await sdk.DevSetCommissionReplicaCurrentPanel({
                    id: rep.replicaId,
                    currentPanelId: panel.id,
                  }, { headers: { 'X-ACTOR': rep.headAuid.toString() } });
                  await sdk.DevSetCommissionReplicaPanelCurrentCandidate({
                    id: rep.replicaId,
                    panelId: panel.id,
                    currentCandidateId: wine.id
                  }, { headers: { 'X-ACTOR': rep.headAuid.toString() } });
                } catch (e: any) {
                  log(`   ⚠️ Не вдалося встановити кандидата: ${e.message}`);
                }

                // Усі експерти (включно з головою) подають оцінки
                const allMembersToEvaluate = [{ auid: rep.headAuid }, ...rep.experts];
                for (const member of allMembersToEvaluate) {
                  try {
                    const scores = evaluationProperties.length > 0 
                      ? evaluationProperties.map(prop => {
                          const range = prop.max - prop.min;
                          const minAllowed = prop.min + Math.floor(range / 2);
                          const score = Math.floor(Math.random() * (prop.max - minAllowed + 1)) + minAllowed;
                          return { code: prop.code, value: score.toString() };
                        })
                      : [
                          { code: "example", value: (Math.floor(Math.random() * 3) + 3).toString() }
                        ];

                    await sdk.SubmitEvaluation({
                      input: {
                        candidateId: wine.id,
                        scores,
                        comments: [{ text: 'Тестова оцінка від генератора змагань', sortOrder: 1 }]
                      }
                    }, { headers: { 'actor': member.auid.toString(), 'x-actor': member.auid.toString() } });
                  } catch (e: any) {
                    log(`   ⚠️ Помилка оцінювання для вина ${wine.id} експертом ${member.auid}: ${e.message}`);
                  }
                }

                // Підтверджуємо завершення оцінювання кандидата
                try {
                  await sdk.MarkCommissionReplicaCandidateAsEvaluated(
                    { id: wine.id },
                    { headers: { 'X-ACTOR': rep.headAuid.toString() } }
                  );
                } catch (e: any) {
                  log(`   ⚠️ Не вдалося завершити оцінювання кандидата ${wine.id}: ${e.message}`);
                }

                evaluatedSoFar++;
                panelEvaluatedCount++;
              } else if (!nextCandidateSet) {
                // Встановлюємо перший неоцінений зразок як активний для дегустації
                try {
                  await sdk.DevSetCommissionReplicaCurrentPanel({
                    id: rep.replicaId,
                    currentPanelId: panel.id,
                  }, { headers: { 'X-ACTOR': rep.headAuid.toString() } });
                  await sdk.DevSetCommissionReplicaPanelCurrentCandidate({
                    id: rep.replicaId,
                    panelId: panel.id,
                    currentCandidateId: wine.id
                  }, { headers: { 'X-ACTOR': rep.headAuid.toString() } });
                  nextCandidateSet = true;
                  log(`   🎯 Встановлено активний зразок для дегустації: ${cIdx + 1}-е вино у панелі ${pIdx + 1}`);
                } catch (e: any) {
                  log(`   ⚠️ Не вдалося встановити наступного кандидата: ${e.message}`);
                }
              }
            }

            // Якщо всі кандидати в панелі оцінені, завершуємо панель!
            if (panelEvaluatedCount === candidates.length) {
              try {
                await sdk.DevCompleteCommissionReplicaPanel({
                  id: rep.replicaId,
                  panelId: panel.id
                }, { headers: { 'X-ACTOR': rep.headAuid.toString() } });
                log(`   🏁 Панель "${panel.id}" успішно завершено!`);
              } catch (e: any) {
                log(`   ⚠️ Не вдалося завершити панель ${panel.id}: ${e.message}`);
              }
            }
          }

          if (type === 'FINISHED') {
            log(`   🎉 Репліку "${rep.replicaName}" повністю завершено (статус COMPLETED)`);
          } else {
            log(`   ✅ Оцінювання ${evaluatedSoFar} вин у "${rep.replicaName}" завершено, дегустація активна`);
          }
        }
      } else {
        log(`   ⏸️ Комісія "${commCleanName}" створена, статус "Не розпочата"`);
      }

      resultCommissions.push({
        id: commissionId,
        name: commCleanName,
        replicas: commissionReplicasOutput,
        type
      });
    };

    for (let cIdx = 0; cIdx < data.commissions.length; cIdx++) {
      const config = data.commissions[cIdx];
      await seedCommission(config.name, config, config.type, cIdx);
    }

    log('🎉 Генерація сценарію успішно завершена!');
    
    return { 
      success: true, 
      competitionId, 
      commissions: resultCommissions 
    };
  } catch (e: any) {
    const errorMessage = e?.message || JSON.stringify(e);
    log(`❌ Критична помилка генератора: ${errorMessage}`);
    
    console.error("================ GENERATOR ERROR DUMP ================");
    console.error(JSON.stringify(e, null, 2));
    console.error("======================================================");
    
    return { success: false, error: e?.message || "Internal Error" };
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
