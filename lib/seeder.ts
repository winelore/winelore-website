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
  templateEditionId?: string;
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
      log(`⚠️ Увага: Кука 'auid' повністю відсутня`);
      throw new Error("Авторизація відсутня: увійдіть під потрібним акаунтом перед генерацією");
    }
    const auidInt: number = parseInt(auid, 10);
    const headers = { "X-ACTOR": auidInt.toString() };
    
    log(`🔑 Авторизовано! Актор ID: ${auidInt}`);
    console.log(`🔑 [SEEDER SUCCESS] Актор ID: ${auidInt}`);
    
    const uniqueSuffix = `${Math.floor(Math.random() * 9000) + 1000}`;
    const baseSeriesName = cleanString(data.seriesName, 'Test Series');
    const baseCompetitionName = cleanString(data.competitionName, 'Test Competition');
    const finalSeriesName = cleanString(`${baseSeriesName} ${uniqueSuffix}`);
    const finalCompetitionName = cleanString(`${baseCompetitionName} ${uniqueSuffix}`);
    
    // Fetch default beverage type and matching evaluation template
    let beverageTypeId = '';
    let activeTemplateEditionId = '';
    let evaluationProperties: { code: string, min: number, max: number }[] = [];

    try {
      const bevTypesRes = await sdk.DevGetBeverageTypes();
      const bevItems = bevTypesRes.beverageTypes?.items || [];
      log(`📋 Завантажено типів напоїв: ${bevItems.length}`);
      
      const existingWine = bevItems.find(i => i.code === "WINE");
      beverageTypeId = existingWine?.id || "11111111-1111-4111-8111-111111111101";

      const evalTemplatesRes = await sdk.DevGetEvaluationTemplateEditions();
      const items = evalTemplatesRes.evaluationTemplateEditions?.items || [];
      log(`🔎 Знайдено ${items.length} шаблонів у базі. Підбираємо активний шаблон для типу напою...`);

      const DEFAULT_DEV_TOOLS_TEMPLATE_EDITION_ID = "14fa1fe7-139d-4c12-903d-80f65331f9d2";
      const targetTemplateEditionId = (data.templateEditionId?.trim() || DEFAULT_DEV_TOOLS_TEMPLATE_EDITION_ID);

      let selectedTemplate: any = null;

      // Якщо вказаний валідний UUID, спочатку пробуємо знайти його серед наявних шаблонів
      if (isValidUuid(targetTemplateEditionId)) {
        selectedTemplate = items.find((i: any) => 
          i.id === targetTemplateEditionId || i.template?.id === targetTemplateEditionId
        );

        if (selectedTemplate) {
          activeTemplateEditionId = selectedTemplate.id;
          if (selectedTemplate.template?.beverageType?.id) {
            beverageTypeId = selectedTemplate.template.beverageType.id;
            log(`ℹ️ Використано тип напою з шаблону: ${beverageTypeId}`);
          }
        } else {
          // Якщо в items немає (наприклад, інший статус), використовуємо цільовий ID безпосередньо
          activeTemplateEditionId = targetTemplateEditionId;
        }
      }

      // Якщо шаблон досі не вибрано (наприклад, цільовий UUID був невалідний)
      if (!activeTemplateEditionId) {
        // Шукаємо активний або опублікований шаблон саме для цього beverageTypeId
        selectedTemplate = items.find((i: any) => 
          (i.status === 'PUBLISHED' || i.status === 'ACTIVE') && 
          i.template?.beverageType?.id === beverageTypeId
        );

        // Якщо для WINE шаблону немає, беремо будь-який активний шаблон і використовуємо його beverageTypeId
        if (!selectedTemplate) {
          selectedTemplate = items.find((i: any) => 
            (i.status === 'PUBLISHED' || i.status === 'ACTIVE') && i.template?.beverageType?.id
          ) || items[0];

          if (selectedTemplate?.template?.beverageType?.id) {
            beverageTypeId = selectedTemplate.template.beverageType.id;
            log(`ℹ️ Використано тип напою з шаблону: ${beverageTypeId}`);
          }
        }

        if (selectedTemplate) {
          activeTemplateEditionId = selectedTemplate.id;
        }
      }

      if (activeTemplateEditionId) {
        const selectedName = selectedTemplate?.template?.name || (activeTemplateEditionId === DEFAULT_DEV_TOOLS_TEMPLATE_EDITION_ID ? "Default DevTools Template" : "Template");
        log(`📄 Вибрано шаблон оцінювання: "${selectedName}" (ID: ${activeTemplateEditionId})`);

        const query = `
          query GetTemplate($id: ID!) {
            evaluationTemplateEdition(id: $id) {
              template {
                name
                beverageType {
                  id
                }
              }
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
        const tplEdition = tplData?.data?.evaluationTemplateEdition;
        if (tplEdition?.template?.beverageType?.id && (!selectedTemplate || !selectedTemplate.template?.beverageType?.id)) {
          beverageTypeId = tplEdition.template.beverageType.id;
          log(`ℹ️ Оновлено тип напою з шаблону: ${beverageTypeId}`);
        }
        if (tplEdition?.template?.name && selectedName === "Default DevTools Template") {
          log(`📄 Оновлено назву шаблону: "${tplEdition.template.name}"`);
        }
        const categories = tplEdition?.categories || [];
        categories.forEach((cat: any) => {
          cat.properties?.forEach((prop: any) => {
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
        log(`⚠️ Шаблони оцінювання не знайдені в базі!`);
      }
    } catch (e: any) {
      log(`⚠️ Помилка отримання шаблонів: ${e.message}`);
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

    // Helper for creating commission and seeding data
    const seedCommission = async (
      name: string,
      config: CommissionConfig,
      type: 'NOT_STARTED' | 'IN_PROGRESS' | 'FINISHED'
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
        log(`🔗 Шаблон оцінювання (${activeTemplateEditionId}) успішно прив'язано до комісії для типу напою ${beverageTypeId}`);
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
          const safeCommName = commCleanName.replace(/[^a-zA-Z0-9]/g, '');
          const bevName = cleanString(`Test Wine ${uniqueSuffix} - Comm${safeCommName || '1'}-${wineIndex}`);
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
            anonymizedCode: `WINE-${wineIndex + 1}`
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
        evalCount = config.evaluatedWinesCount || 0;
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

        // Життєвий цикл репліки
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

        createdReplicas.push({ replicaId, replicaName: cleanReplicaName, headAuid, experts });
        
        commissionReplicasOutput.push({
          replicaId,
          replicaName: cleanReplicaName,
          head: { auid: headAuid },
          experts
        });
      }

      // 6. Життєвий цикл репліки та оцінювання згідно зі статусом
      if (type === 'NOT_STARTED') {
        log(`⏸️ Комісія "${commCleanName}" готова, статус "Не розпочата" (репліки в статусі PLANNED, очікують старту головою).`);
      } else {
        // Для IN_PROGRESS або FINISHED
        for (const rep of createdReplicas) {
          await sdk.DevStartCommissionReplica(
            { id: rep.replicaId },
            { headers: { 'X-ACTOR': rep.headAuid.toString() } }
          );
          log(`▶️ Репліка "${rep.replicaName}" активована (STARTED)`);

          const commissionData = await sdk.GetCommission({ id: commissionId });
          const activeReplica = commissionData.commission?.replicas.find(r => r.id === rep.replicaId);
          const replicaPanels = activeReplica?.replicaPanels || [];

          let winesEvaluated = 0;
          let nextCandidateToSet: { replicaPanelId: string; candidateId: string } | null = null;

          for (const panel of replicaPanels) {
            const panelCandidates = panel.replicaCandidates || [];
            let allPanelCandidatesEvaluated = true;

            for (const candidate of panelCandidates) {
              if (winesEvaluated < evalCount) {
                // Встановлюємо поточну панель та зразок перед оцінюванням
                try {
                  await sdk.DevSetCommissionReplicaCurrentPanel({
                    id: rep.replicaId,
                    currentPanelId: panel.id,
                  }, { headers: { 'X-ACTOR': rep.headAuid.toString() } });
                  await sdk.DevSetCommissionReplicaPanelCurrentCandidate({
                    id: rep.replicaId,
                    panelId: panel.id,
                    currentCandidateId: candidate.id
                  }, { headers: { 'X-ACTOR': rep.headAuid.toString() } });
                } catch (e: any) {
                  log(`   ⚠️ Помилка встановлення кандидата: ${e.message}`);
                }

                // Оцінювання головою та всіма експертами
                const allMembers = [{ auid: rep.headAuid, isHead: true }, ...rep.experts];
                for (const member of allMembers) {
                  try {
                    const scores = evaluationProperties.length > 0 
                      ? evaluationProperties.map(prop => {
                          const range = Math.max(1, prop.max - prop.min);
                          const minAllowed = prop.min + Math.floor(range / 2);
                          const score = Math.floor(Math.random() * (prop.max - minAllowed + 1)) + minAllowed;
                          return { code: prop.code, value: score.toString() };
                        })
                      : [
                          { code: "example", value: (Math.floor(Math.random() * 5) + 1).toString() }
                        ];

                    const evalRes = await sdk.SubmitEvaluation({
                      input: {
                        candidateId: candidate.id,
                        scores,
                        comments: [{ text: 'Automated evaluation comment from seeder', sortOrder: 1 }]
                      }
                    }, { headers: { 'X-ACTOR': member.auid.toString() } });

                    if (!evalRes?.submitEvaluation) {
                      log(`   ⚠️ Оцінка для зразка ${candidate.id} (${member.auid}) повернула порожній результат`);
                    }
                  } catch (e: any) {
                    log(`   ⚠️ Помилка оцінювання для зразка ${candidate.id} (${member.auid}): ${e.message}`);
                  }
                }

                // Фіксуємо оцінювання зразка
                try {
                  await sdk.MarkCommissionReplicaCandidateAsEvaluated(
                    { id: candidate.id },
                    { headers: { 'X-ACTOR': rep.headAuid.toString() } }
                  );
                } catch (e: any) {
                  log(`   ⚠️ Не вдалося позначити зразок оціненим: ${e.message}`);
                }

                winesEvaluated++;
              } else {
                allPanelCandidatesEvaluated = false;
                if (!nextCandidateToSet) {
                  nextCandidateToSet = { replicaPanelId: panel.id, candidateId: candidate.id };
                }
              }
            }

            // Якщо всі кандидати цієї панелі оцінені, завершуємо панель
            if (allPanelCandidatesEvaluated && panelCandidates.length > 0) {
              try {
                await sdk.DevCompleteCommissionReplicaPanel({
                  id: rep.replicaId,
                  panelId: panel.id
                }, { headers: { 'X-ACTOR': rep.headAuid.toString() } });
                log(`   ✅ Панель завершена у репліці "${rep.replicaName}"`);
              } catch (e: any) {
                log(`   ⚠️ Не вдалося завершити панель: ${e.message}`);
              }
            }
          }

          if (type === 'IN_PROGRESS') {
            log(`   ✅ Оцінено ${winesEvaluated} вин у "${rep.replicaName}"`);
            if (nextCandidateToSet) {
              try {
                await sdk.DevSetCommissionReplicaCurrentPanel({
                  id: rep.replicaId,
                  currentPanelId: nextCandidateToSet.replicaPanelId,
                }, { headers: { 'X-ACTOR': rep.headAuid.toString() } });
                await sdk.DevSetCommissionReplicaPanelCurrentCandidate({
                  id: rep.replicaId,
                  panelId: nextCandidateToSet.replicaPanelId,
                  currentCandidateId: nextCandidateToSet.candidateId
                }, { headers: { 'X-ACTOR': rep.headAuid.toString() } });
                log(`   👉 Наступний активний зразок встановлено (${nextCandidateToSet.candidateId})`);
              } catch (e: any) {
                log(`   ⚠️ Не вдалося встановити наступного кандидата: ${e.message}`);
              }
            }
          } else if (type === 'FINISHED') {
            log(`   🎉 Усі зразки оцінено, панелі завершено, репліка "${rep.replicaName}" перейшла в статус COMPLETED`);
          }
        }
      }


      resultCommissions.push({
        id: commissionId,
        name: commCleanName,
        replicas: commissionReplicasOutput,
        type
      });
    };

    for (const config of data.commissions) {
      await seedCommission(config.name, config, config.type);
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
