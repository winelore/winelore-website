"use server"

import { cookies } from "next/headers"
import { fetchGraphQLRaw } from "@/lib/apiClient"
import {
    GET_COMMISSION_RESULTS,
    GET_BEVERAGE_AWARDS,
    buildCommissionResultRows,
    canViewCommissionResults,
} from "@winelore/core/results"
import {
    getCommissionTemplatesWithResultMarkers,
    getEvaluationsForCandidateAction,
} from "@/app/commission/actions"
import { buildPropertyMapFromCommissionTemplates, buildTemplateEditionById } from '@winelore/core';
import type { PropertyMeta } from '@winelore/core';
import type {
    CompetitionExportContext,
    CompetitionOverviewRow,
    CommissionSummaryRow,
    CompetitionExpertScoreRow,
    CompetitionCommentRow,
    CompetitionAwardRow,
} from "@winelore/core/results"

// Server-side memory caches (15 second TTL) to ensure 0-CPU background polling
const evaluationsCache = new Map<string, { data: any[]; expiresAt: number }>()
const awardsCache = new Map<string, { data: any[]; expiresAt: number }>()

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

            const currentAuidStr = currentAuid === null ? null : String(currentAuid)
            if (!canViewCommissionResults(commissionData, currentAuidStr)) continue

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

            // Flatten panels into candidates, and attach each replica candidate's
            // evaluations. This is the I/O the row builder must not do itself.
            const candidates = (commissionData.panels || []).flatMap((panel: any) =>
                (panel.candidates || []).map((cand: any) => ({ ...cand, panelId: panel.id }))
            )
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

            const beverageIds = Array.from(
                new Set(
                    candidates.map((c: any) => c.sample?.batch?.beverage?.id).filter(Boolean)
                )
            ) as string[]
            const awardsByBeverageId: Record<string, any[]> = {}
            await Promise.all(
                beverageIds.map(async (beverageId) => {
                    awardsByBeverageId[beverageId] = await getCachedBeverageAwards(beverageId)
                })
            )

            const rows = buildCommissionResultRows({
                commission: comm,
                commissionData,
                templateEditionById,
                templatePropertyMap: commissionPropertyMap,
                awardsByBeverageId,
            })

            rows.outcomeProperties.forEach((property) => {
                outcomePropertyCodesSet.add(property.code)
                outcomePropertyNamesMap[property.code] = property.name
            })

            overviewRows.push(...rows.overviewRows)
            expertScoreRows.push(...rows.expertScoreRows)
            commentRows.push(...rows.commentRows)
            awardRows.push(...rows.awardRows)
            commissionSummaryRows.push(rows.summaryRow)
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
