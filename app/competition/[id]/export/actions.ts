"use server"

import { cookies } from "next/headers"
import { fetchGraphQLRaw } from "@/lib/apiClient"
import { GET_COMMISSION_RESULTS, GET_BEVERAGE_AWARDS } from "@/app/commission/[id]/results/queries"
import {
    getCommissionTemplatesWithResultMarkers,
    getEvaluationsForCandidateAction,
} from "@/app/commission/actions"
import { buildPropertyMapFromCommissionTemplates, type PropertyMeta } from "@/app/commission/propertyMap"
import { isReplicaCandidateFinished } from "@/app/commission/replicaUtils"
import { buildTemplateEditionById } from "@/lib/templateEditionMap"
import {
    aggregateOverallFromReplicas,
    resolveReplicaBeverageOutcomes,
} from "@/lib/outcomePolicy/resolveBeverageOutcomes"
import type {
    CompetitionExportContext,
    CompetitionOverviewRow,
    CommissionSummaryRow,
    CompetitionExpertScoreRow,
    CompetitionCommentRow,
    CompetitionAwardRow,
} from "./exportCompetitionResults"

// Server-side memory caches (15 second TTL) to ensure 0-CPU background polling
const evaluationsCache = new Map<string, { data: any[]; expiresAt: number }>()
const awardsCache = new Map<string, { data: any[]; expiresAt: number }>()

function normalizeAuidNumbers(value: unknown): number[] {
    if (Array.isArray(value)) return value.flatMap(normalizeAuidNumbers)
    if (value === null || value === undefined || value === "") return []
    const parsed = Number(value)
    return Number.isFinite(parsed) ? [parsed] : []
}

function isReplicaBeverageIncomplete(
    commission: any,
    replicaId: string,
    beverageId: string,
): boolean {
    const candidateIds = (commission.candidates || [])
        .filter((candidate: any) => candidate.sample?.batch?.beverage?.id === beverageId)
        .map((candidate: any) => candidate.id)
    const replica = (commission.replicas || []).find((item: any) => item.id === replicaId)
    if (!replica) return false

    const expectedEvaluators = replica.members?.length ?? 0
    for (const candidateId of candidateIds) {
        const replicaCandidate = (replica.replicaCandidates || []).find(
            (item: any) => item.candidate?.id === candidateId,
        )
        if (!replicaCandidate) {
            if (expectedEvaluators > 0) return true
            continue
        }
        if (isReplicaCandidateFinished(replicaCandidate.status)) continue

        const completeCount = (replicaCandidate.evaluations || []).filter(
            (evaluation: any) => evaluation.isComplete,
        ).length
        if (expectedEvaluators > 0 && completeCount < expectedEvaluators) return true
    }
    return false
}

async function getCachedEvaluations(candidateId: string): Promise<any[]> {
    const cached = evaluationsCache.get(candidateId)
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data
    }
    try {
        const data = await getEvaluationsForCandidateAction(candidateId)
        evaluationsCache.set(candidateId, { data, expiresAt: Date.now() + 15000 })
        return data
    } catch {
        return []
    }
}

async function getCachedBeverageAwards(beverageId: string): Promise<any[]> {
    const cached = awardsCache.get(beverageId)
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data
    }
    try {
        const res = await fetchGraphQLRaw<any, { beverageId: string }>(GET_BEVERAGE_AWARDS, { beverageId })
        const data = res?.beverageAwards || []
        awardsCache.set(beverageId, { data, expiresAt: Date.now() + 15000 })
        return data
    } catch {
        return []
    }
}

export async function getCompetitionExportDataAction(
    commissions: { id: string; name: string; status: string }[],
    competitionName: string,
    locale: "en" | "uk" | "hu" = "en"
): Promise<CompetitionExportContext> {
    const cookieStore = await cookies()
    const auidStr = cookieStore.get("auid")?.value
    const currentAuid = auidStr ? Number(auidStr) : null
    const overviewRows: CompetitionOverviewRow[] = []
    const commissionSummaryRows: CommissionSummaryRow[] = []
    const expertScoreRows: CompetitionExpertScoreRow[] = []
    const commentRows: CompetitionCommentRow[] = []
    const awardRows: CompetitionAwardRow[] = []
    const combinedPropertyMap: Record<string, PropertyMeta> = {}
    const outcomePropertyCodesSet = new Set<string>()
    const outcomePropertyNamesMap: Record<string, string> = {}

    for (const comm of commissions) {
        try {
            const response = await fetchGraphQLRaw<any, { id: string }>(GET_COMMISSION_RESULTS, {
                id: comm.id,
            })
            const commissionData = response?.commission
            if (!commissionData) continue

            const isHolder =
                currentAuid !== null &&
                normalizeAuidNumbers(commissionData.competition?.holders).includes(currentAuid)
            const isMemberOfCompletedReplica =
                currentAuid !== null &&
                (commissionData.replicas || []).some(
                    (replica: any) =>
                        replica.status === "COMPLETED" &&
                        (replica.members || []).some((member: any) =>
                            normalizeAuidNumbers(member.auid).includes(currentAuid),
                        ),
                )
            if (!isHolder && !isMemberOfCompletedReplica) continue

            let commissionPropertyMap: Record<string, PropertyMeta> = {}
            let templateEditionById = {}

            // Fetch the same template metadata used by the former commission results page.
            try {
                const templateResult = await getCommissionTemplatesWithResultMarkers(comm.id)
                commissionPropertyMap = buildPropertyMapFromCommissionTemplates(templateResult)
                templateEditionById = buildTemplateEditionById(templateResult)
                Object.assign(combinedPropertyMap, commissionPropertyMap)
            } catch (e) {
                console.error(`[exportAction] Failed to fetch templates for commission ${comm.id}`, e)
            }

            // Extract panels & candidates
            const candidates = (commissionData.panels || []).flatMap((panel: any) =>
                (panel.candidates || []).map((cand: any) => ({ ...cand, panelId: panel.id }))
            )

            // Extract replicas & candidate evaluations (using 15s server cache for fast 0-CPU execution)
            const replicas = commissionData.replicas || []
            for (const replica of replicas) {
                const replicaCandidates = (replica.replicaPanels || []).flatMap((p: any) =>
                    (p.replicaCandidates || []).map((rc: any) => ({ ...rc, panelId: p.panel?.id }))
                )
                await Promise.all(
                    replicaCandidates.map(async (rc: any) => {
                        rc.evaluations = await getCachedEvaluations(rc.id)
                    })
                )
                replica.replicaCandidates = replicaCandidates
            }

            commissionData.candidates = candidates
            commissionData.replicas = replicas
            const resolvedOutcomes = resolveReplicaBeverageOutcomes({
                commission: commissionData,
                policyEdition: commissionData.outcomePolicyEdition,
                templateEditionById,
                templatePropertyMap: commissionPropertyMap,
                isReplicaBeverageIncomplete: (replicaId, beverageId) =>
                    isReplicaBeverageIncomplete(commissionData, replicaId, beverageId),
            })
            const policyOutputs = resolvedOutcomes.outputProperties
            policyOutputs.forEach((property) => {
                outcomePropertyCodesSet.add(property.code)
                outcomePropertyNamesMap[property.code] = property.name
            })

            // Fetch awards in batch using 15s server cache
            const awardsMap: Record<string, any[]> = {}
            const beverageIds = Array.from(
                new Set(
                    candidates
                        .map((c: any) => c.sample?.batch?.beverage?.id)
                        .filter(Boolean)
                )
            ) as string[]

            await Promise.all(
                beverageIds.map(async (beverageId) => {
                    awardsMap[beverageId] = await getCachedBeverageAwards(beverageId)
                })
            )

            let commissionAwardsCount = 0

            // Build candidate overview rows for this commission
            for (const candidate of candidates) {
                const beverage = candidate.sample?.batch?.beverage
                const beverageType = candidate.beverageType?.code || "-"

                let wineType = "-"
                if (beverage?.attributes) {
                    const attrs = typeof beverage.attributes === "string"
                        ? JSON.parse(beverage.attributes || "{}")
                        : beverage.attributes
                    if (attrs?.color) wineType = String(attrs.color)
                }

                let vintage = "-"
                const batchAttrs = candidate.sample?.batch?.attributes
                if (batchAttrs) {
                    const attrs = typeof batchAttrs === "string"
                        ? JSON.parse(batchAttrs || "{}")
                        : batchAttrs
                    if (attrs?.vintage) vintage = String(attrs.vintage)
                }

                const volume = candidate.sample?.volumeMl ? `${candidate.sample.volumeMl} ml` : "-"

                // Producer
                const producerAuids = (beverage?.producers || []).map((p: any) => String(p.auid || p.id))
                const producer = producerAuids.length > 0 ? producerAuids[0] : "-"

                // Use the same policy evaluation and non-trainee replica averaging as commission results.
                const overallOutcomes = beverage?.id
                    ? aggregateOverallFromReplicas(
                          resolvedOutcomes.replicaOutcomes,
                          beverage.id,
                          replicas,
                          policyOutputs,
                      )
                    : {}
                const outcomes = Object.fromEntries(
                    policyOutputs.map((property) => [
                        property.code,
                        overallOutcomes[property.code]?.average ?? "-",
                    ]),
                )

                // Awards
                const candAwards = ((beverage?.id ? awardsMap[beverage.id] : []) || []).filter(
                    (award: any) => !award.commissionId || award.commissionId === comm.id,
                )
                const awardNames = candAwards.map((a: any) => a.award?.name || "").filter(Boolean)
                commissionAwardsCount += candAwards.length

                candAwards.forEach((a: any) => {
                    awardRows.push({
                        commissionId: comm.id,
                        commissionName: comm.name,
                        code: candidate.anonymizedCode || "N/A",
                        beverage: beverage?.name || "Unknown Beverage",
                        producer,
                        awardName: a.award?.name || "Award",
                        awardCode: a.award?.code || "AWARD",
                    })
                })

                overviewRows.push({
                    commissionId: comm.id,
                    commissionName: comm.name,
                    candidateId: candidate.id,
                    code: candidate.anonymizedCode || "N/A",
                    beverage: beverage?.name || "Unknown Beverage",
                    producer,
                    outcomes,
                    awards: awardNames.join("; ") || "-",
                    beverageType,
                    wineType,
                    vintage,
                    volume,
                    origin: "-",
                })

                // Build expert score rows and comment rows from replicas
                replicas.forEach((replica: any) => {
                    (replica.replicaCandidates || []).forEach((rc: any) => {
                        if (rc.candidate?.id === candidate.id) {
                            (rc.evaluations || []).forEach((ev: any, evaluationIndex: number) => {
                                if (!ev.isComplete) return

                                const evaluationId = String(
                                    ev.id || `${replica.id}-${candidate.id}-${evaluationIndex}`,
                                )
                                const scores: Record<string, string> = {}
                                if (ev.scores && Array.isArray(ev.scores)) {
                                    ev.scores.forEach((s: any) => {
                                        if (s.code && s.value !== undefined) {
                                            scores[s.code] = String(s.value)
                                        }
                                    })
                                }

                                expertScoreRows.push({
                                    commissionId: comm.id,
                                    commissionName: comm.name,
                                    replicaId: replica.id,
                                    evaluationId,
                                    code: candidate.anonymizedCode || "N/A",
                                    beverage: beverage?.name || "Unknown Beverage",
                                    producer,
                                    replicaName: replica.name || "Replica",
                                    replicaType: replica.type || "STANDARD",
                                    evaluator: String(ev.evaluatorAuid || ev.auid || "Expert"),
                                    scores,
                                    beverageType,
                                    wineType,
                                    vintage,
                                    volume,
                                    origin: "-",
                                })

                                if (ev.comments && Array.isArray(ev.comments)) {
                                    ev.comments.forEach((c: any, commentIndex: number) => {
                                        if (c.text || c.voiceUrl) {
                                            commentRows.push({
                                                commissionId: comm.id,
                                                commissionName: comm.name,
                                                replicaId: replica.id,
                                                evaluationId,
                                                commentId: String(c.id || `${evaluationId}-${commentIndex}`),
                                                code: candidate.anonymizedCode || "N/A",
                                                beverage: beverage?.name || "Unknown Beverage",
                                                producer,
                                                replicaName: replica.name || "Replica",
                                                evaluator: String(ev.evaluatorAuid || ev.auid || "Expert"),
                                                property: c.propertyId || "General",
                                                commentText: c.text || "",
                                                voiceUrl: c.voiceUrl || "",
                                                beverageType,
                                                wineType,
                                                vintage,
                                                volume,
                                                origin: "-",
                                            })
                                        }
                                    })
                                }
                            })
                        }
                    })
                })
            }

            commissionSummaryRows.push({
                commissionId: comm.id,
                commissionName: comm.name,
                status: comm.status,
                candidateCount: candidates.length,
                replicaCount: replicas.length,
                awardsCount: commissionAwardsCount,
            })
        } catch (err) {
            console.error(`[exportAction] Error processing commission ${comm.id}:`, err)
        }
    }

    return {
        competitionName,
        overviewRows,
        commissionSummaryRows,
        expertScoreRows,
        commentRows,
        awardRows,
        outcomePropertyCodes: Array.from(outcomePropertyCodesSet),
        outcomePropertyNames: outcomePropertyNamesMap,
        propertyMap: combinedPropertyMap,
    }
}
