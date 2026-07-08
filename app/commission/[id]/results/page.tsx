export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { fetchGraphQLRaw } from "@/lib/apiClient"
import { getCommissionTemplatesWithResultMarkers, getEvaluationsForCandidateAction } from "../../actions"
import { buildPropertyMapFromCommissionTemplates } from "../../propertyMap"
import { buildTemplateEditionById } from "@/lib/templateEditionMap"
import type { TemplateEdition } from "@/lib/evaluationScores"
import { GET_COMMISSION_RESULTS, GET_BEVERAGE_AWARDS } from "./queries"
import CommissionResultsClientView from "./CommissionResultsClientView"
import ResultsErrorView from "./ResultsErrorView"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function CommissionResultsPage({ params }: PageProps) {
    const resolvedParams = await params
    const commissionId = resolvedParams.id

    const cookieStore = await cookies()
    const auidStr = cookieStore.get("auid")?.value
    const currentAuid = auidStr ? parseInt(auidStr, 10) : null

    let commission = null
    const awardsMap: Record<string, any[]> = {}
    let propertyMap = {}
    let templateEditionById: Record<string, TemplateEdition> = {}
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
            const holders = commission.competition?.holders?.flat() ?? []
            const isHolder = currentAuid !== null && holders.includes(currentAuid)
            if (!isHolder) {
                return <ResultsErrorView commissionId={commissionId} variant="forbidden" />
            }
            propertyCommentsEnabled = commission.propertyCommentsEnabled ?? false
            voiceCommentsEnabled = commission.voiceCommentsEnabled ?? false

            try {
                const templateResult = await getCommissionTemplatesWithResultMarkers(commissionId)
                propertyMap = buildPropertyMapFromCommissionTemplates(templateResult)
                templateEditionById = buildTemplateEditionById(templateResult)
            } catch (err) {
                console.error("[results] Failed to fetch template metadata:", err)
            }

            // Fetch evaluations for each replica candidate
            if (commission.replicas) {
                const allReplicaCandidates = commission.replicas.flatMap(
                    (r: { replicaCandidates?: any[] }) => r.replicaCandidates || []
                )

                await Promise.all(
                    allReplicaCandidates.map(async (rc: any) => {
                        try {
                            const evs = await getEvaluationsForCandidateAction(rc.id)
                            rc.evaluations = evs
                        } catch (err) {
                            console.error(`[results] Failed to fetch evaluations for replica candidate ${rc.id}:`, err)
                            rc.evaluations = []
                        }
                    })
                )
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
            templateEditionById={templateEditionById}
            propertyCommentsEnabled={propertyCommentsEnabled}
            voiceCommentsEnabled={voiceCommentsEnabled}
        />
    )
}
