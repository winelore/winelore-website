export const dynamic = "force-dynamic"

import { fetchGraphQLRaw } from "@/lib/apiClient"
import { getCommissionTemplatesWithResultMarkers } from "../../actions"
import { buildPropertyMapFromCommissionTemplates } from "../../propertyMap"
import { GET_COMMISSION_RESULTS, GET_BEVERAGE_AWARDS } from "./queries"
import CommissionResultsClientView from "./CommissionResultsClientView"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function CommissionResultsPage({ params }: PageProps) {
    const resolvedParams = await params;
    const commissionId = resolvedParams.id;

    let commission = null;
    const awardsMap: Record<string, any[]> = {};
    let propertyMap = {};
    let propertyCommentsEnabled = false;
    let voiceCommentsEnabled = false;

    console.log(`\n\n=== [СЕРВЕР] ПОЧАТОК ЗАВАНТАЖЕННЯ РЕЗУЛЬТАТІВ ДЛЯ КОМІСІЇ ${commissionId} ===`);

    try {
        console.log(`[СЕРВЕР] Відправка GET_COMMISSION_RESULTS...`);
        const response = await fetchGraphQLRaw<any, { id: string }>(GET_COMMISSION_RESULTS, { id: commissionId });

        // Обходимо TypeScript помилку за допомогою 'as any' виключно для дебагу
        const resAny = response as any;
        if (resAny?.errors) {
            console.error(`[СЕРВЕР] ❌ GRAPHQL ПОМИЛКА У GET_COMMISSION_RESULTS:`, JSON.stringify(resAny.errors, null, 2));
        }

        // Логуємо загальну відповідь
        console.log(`[СЕРВЕР] Відповідь GET_COMMISSION_RESULTS (урізано):`, JSON.stringify(response));

        commission = response?.commission;

        if (commission) {
            propertyCommentsEnabled = commission.competition?.propertyCommentsEnabled ?? false;
            voiceCommentsEnabled = commission.competition?.voiceCommentsEnabled ?? false;

            try {
                const templateResult = await getCommissionTemplatesWithResultMarkers(commissionId);
                propertyMap = buildPropertyMapFromCommissionTemplates(templateResult);
            } catch (err) {
                console.error("[СЕРВЕР] Failed to fetch template metadata for results:", err);
            }
        }

        if (commission?.candidates) {
            const beverageIds = Array.from(
                new Set(
                    commission.candidates
                        .map((c: any) => c.sample?.batch?.beverage?.id)
                        .filter(Boolean)
                )
            ) as string[];

            console.log(`[СЕРВЕР] Знайдено унікальних ID напоїв для запиту нагород:`, beverageIds);

            const awardsResponses = await Promise.all(
                beverageIds.map(async (beverageId) => {
                    try {
                        console.log(`[СЕРВЕР] Запит нагород для напою ${beverageId}...`);
                        const res = await fetchGraphQLRaw<any, { beverageId: string }>(GET_BEVERAGE_AWARDS, { beverageId });

                        const awardResAny = res as any;
                        if (awardResAny?.errors) {
                            console.error(`[СЕРВЕР] ❌ GRAPHQL ПОМИЛКА У GET_BEVERAGE_AWARDS (id: ${beverageId}):`, JSON.stringify(awardResAny.errors, null, 2));
                        }

                        return { beverageId, awards: res?.beverageAwards || [] };
                    } catch (err) {
                        console.error(`[СЕРВЕР] ❌ КРИТИЧНА ПОМИЛКА fetchGraphQL (нагороди ${beverageId}):`, err);
                        return { beverageId, awards: [] };
                    }
                })
            );

            awardsResponses.forEach(item => {
                awardsMap[item.beverageId] = item.awards;
            });

            console.log(`[СЕРВЕР] Завантаження нагород завершено. awardsMap keys:`, Object.keys(awardsMap));
        } else {
            console.log(`[СЕРВЕР] ⚠️ В об'єкті commission немає candidates або commission === null`);
        }
// ЛОГ СЕРВЕРА: Виводимо всю зібрану карту нагород
        console.log(`\n=== [СЕРВЕР] ЗІБРАНІ НАГОРОДИ (awardsMap) ===`);
        console.log(JSON.stringify(awardsMap, null, 2));
        console.log(`==============================================\n`);
    } catch (error) {
        console.error("[СЕРВЕР] ❌ КРИТИЧНА ПОМИЛКА ВИКОНАННЯ fetchGraphQL (головний запит):", error);
    }

    console.log(`=== [СЕРВЕР] КІНЕЦЬ ЗАВАНТАЖЕННЯ ===\n\n`);

    if (!commission) {
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-slate-50 gap-4">
                <p className="text-slate-500 font-medium">Failed to load results. Check server terminal for errors.</p>
            </div>
        )
    }

    return (
        <CommissionResultsClientView
            commission={commission}
            awardsMap={awardsMap}
            propertyMap={propertyMap}
            propertyCommentsEnabled={propertyCommentsEnabled}
            voiceCommentsEnabled={voiceCommentsEnabled}
        />
    )
}