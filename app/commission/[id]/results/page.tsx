export const dynamic = "force-dynamic"

import { fetchGraphQLRaw } from "@/lib/apiClient"
import { getCommissionTemplatesWithResultMarkers } from "../../actions"
import { buildPropertyMapFromCommissionTemplates } from "../../propertyMap"
import { GET_COMMISSION_RESULTS, GET_BEVERAGE_AWARDS } from "./queries"
import CommissionResultsClientView from "./CommissionResultsClientView"
import ResultsErrorView from "./ResultsErrorView"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function CommissionResultsPage({ params }: PageProps) {
    const resolvedParams = await params
    const commissionId = resolvedParams.id

    let commission = null
    const awardsMap: Record<string, any[]> = {}
    let propertyMap = {}
    let propertyCommentsEnabled = false
    let voiceCommentsEnabled = false

    try {
        const response = await fetchGraphQLRaw<any, { id: string }>(GET_COMMISSION_RESULTS, {
            id: commissionId,
        })

        const resAny = response as { errors?: unknown }
        if (resAny?.errors) {
            console.error("[results] GraphQL error in GET_COMMISSION_RESULTS:", resAny.errors)
        }

        commission = response?.commission

        if (commission) {
            propertyCommentsEnabled = commission.competition?.propertyCommentsEnabled ?? false
            voiceCommentsEnabled = commission.competition?.voiceCommentsEnabled ?? false

            try {
                const templateResult = await getCommissionTemplatesWithResultMarkers(commissionId)
                propertyMap = buildPropertyMapFromCommissionTemplates(templateResult)
            } catch (err) {
                console.error("[results] Failed to fetch template metadata:", err)
            }
        }

        if (commission?.candidates) {
            const beverageIds = Array.from(
                new Set(
                    commission.candidates
                        .map((c: { sample?: { batch?: { beverage?: { id?: string } } } }) =>
                            c.sample?.batch?.beverage?.id,
                        )
                        .filter(Boolean),
                ),
            ) as string[]

            const awardsResponses = await Promise.all(
                beverageIds.map(async (beverageId) => {
                    try {
                        const res = await fetchGraphQLRaw<any, { beverageId: string }>(
                            GET_BEVERAGE_AWARDS,
                            { beverageId },
                        )

                        const awardResAny = res as { errors?: unknown }
                        if (awardResAny?.errors) {
                            console.error(
                                `[results] GraphQL error in GET_BEVERAGE_AWARDS (${beverageId}):`,
                                awardResAny.errors,
                            )
                        }

                        return { beverageId, awards: res?.beverageAwards || [] }
                    } catch (err) {
                        console.error(`[results] Failed to fetch awards for ${beverageId}:`, err)
                        return { beverageId, awards: [] }
                    }
                }),
            )

            awardsResponses.forEach((item) => {
                awardsMap[item.beverageId] = item.awards
            })
        }
    } catch (error) {
        console.error("[results] Failed to load commission results:", error)
    }

    if (!commission) {
        return <ResultsErrorView commissionId={commissionId} />
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
