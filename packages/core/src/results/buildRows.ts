import { parseAttributes } from "../evaluation/attributes"
import { isReplicaCandidateFinished } from "../evaluation/routing"
import {
    aggregateOverallFromReplicas,
    resolveReplicaBeverageOutcomes,
} from "../outcomePolicy/resolveBeverageOutcomes"
import { isReplicaBeverageIncomplete } from "./access"
import type {
    CommissionSummaryRow,
    CompetitionAwardRow,
    CompetitionCommentRow,
    CompetitionExpertScoreRow,
    CompetitionOverviewRow,
} from "./types"

/** An award as the awards query returns it. */
export interface BeverageAward {
    commissionId?: string | null
    award?: { name?: string | null; code?: string | null } | null
}

export interface BuildCommissionResultRowsInput {
    /** Identity of the commission these rows belong to. */
    commission: { id: string; name: string; status: string }
    /**
     * The commission from GET_COMMISSION_RESULTS, with `candidates` flattened
     * from panels and each replica's `replicaCandidates` carrying `evaluations`.
     * Assembling that is I/O and stays with the caller.
     */
    commissionData: any
    templateEditionById: Record<string, any>
    templatePropertyMap?: any
    /** Awards keyed by beverage id. */
    awardsByBeverageId: Record<string, BeverageAward[]>
}

export interface CommissionResultRows {
    overviewRows: CompetitionOverviewRow[]
    expertScoreRows: CompetitionExpertScoreRow[]
    commentRows: CompetitionCommentRow[]
    awardRows: CompetitionAwardRow[]
    summaryRow: CommissionSummaryRow
    /** Outcome properties the policy produced, for column headers. */
    outcomeProperties: Array<{ code: string; name: string }>
}

const UNKNOWN_BEVERAGE = "Unknown Beverage"
const NO_CODE = "N/A"
const EMPTY = "-"

/**
 * Turn one commission's fetched data into result rows.
 *
 * Pure: every fetch the web action performs happens before this is called, so
 * the web table, the spreadsheet export and the mobile results list all derive
 * from one implementation. These are the numbers that decide who wins a
 * competition, so a second implementation is not an option.
 */
export function buildCommissionResultRows(
    input: BuildCommissionResultRowsInput,
): CommissionResultRows {
    const { commission, commissionData, templateEditionById, templatePropertyMap } = input

    const resolved = resolveReplicaBeverageOutcomes({
        commission: commissionData,
        policyEdition: commissionData.outcomePolicyEdition,
        templateEditionById,
        templatePropertyMap,
        isReplicaBeverageIncomplete: (replicaId, beverageId) =>
            isReplicaBeverageIncomplete(
                commissionData,
                replicaId,
                beverageId,
                isReplicaCandidateFinished,
            ),
    })

    const policyOutputs = resolved.outputProperties
    const replicas = commissionData.replicas ?? []
    const candidates = commissionData.candidates ?? []

    const overviewRows: CompetitionOverviewRow[] = []
    const expertScoreRows: CompetitionExpertScoreRow[] = []
    const commentRows: CompetitionCommentRow[] = []
    const awardRows: CompetitionAwardRow[] = []
    let awardsCount = 0

    for (const candidate of candidates) {
        const beverage = candidate.sample?.batch?.beverage
        const beverageName = beverage?.name || UNKNOWN_BEVERAGE
        const code = candidate.anonymizedCode || NO_CODE
        const beverageType = candidate.beverageType?.code || EMPTY

        // parseAttributes also understands Kotlin's Map toString(), which the
        // backend emits for fields never serialised as JSON; a bare JSON.parse
        // throws on those and loses the whole commission.
        const wineType = parseAttributes(beverage?.attributes).color || EMPTY
        const vintage = parseAttributes(candidate.sample?.batch?.attributes).vintage || EMPTY
        const volume = candidate.sample?.volumeMl ? `${candidate.sample.volumeMl} ml` : EMPTY

        const producers = beverage?.producers ?? []
        const producer = producers.length > 0 ? String(producers[0].auid ?? producers[0].id) : EMPTY

        const overall = beverage?.id
            ? aggregateOverallFromReplicas(
                  resolved.replicaOutcomes,
                  beverage.id,
                  replicas,
                  policyOutputs,
              )
            : {}
        const outcomes = Object.fromEntries(
            policyOutputs.map((property) => [
                property.code,
                overall[property.code]?.average ?? EMPTY,
            ]),
        )

        const candidateAwards = (
            (beverage?.id ? input.awardsByBeverageId[beverage.id] : []) ?? []
        ).filter((award) => !award.commissionId || award.commissionId === commission.id)
        awardsCount += candidateAwards.length

        for (const award of candidateAwards) {
            awardRows.push({
                commissionId: commission.id,
                commissionName: commission.name,
                code,
                beverage: beverageName,
                producer,
                awardName: award.award?.name || "Award",
                awardCode: award.award?.code || "AWARD",
            })
        }

        const shared = { beverageType, wineType, vintage, volume, origin: EMPTY }

        overviewRows.push({
            commissionId: commission.id,
            commissionName: commission.name,
            candidateId: candidate.id,
            code,
            beverage: beverageName,
            producer,
            outcomes,
            awards: candidateAwards.map((a) => a.award?.name || "").filter(Boolean).join("; ") || EMPTY,
            ...shared,
        })

        for (const replica of replicas) {
            for (const replicaCandidate of replica.replicaCandidates ?? []) {
                if (replicaCandidate.candidate?.id !== candidate.id) continue

                ;(replicaCandidate.evaluations ?? []).forEach((evaluation: any, index: number) => {
                    // Drafts are a judge's work in progress, never a result.
                    if (!evaluation.isComplete) return

                    const evaluationId = String(
                        evaluation.id || `${replica.id}-${candidate.id}-${index}`,
                    )
                    const evaluator = String(
                        evaluation.evaluatorAuid || evaluation.auid || "Expert",
                    )
                    const scores: Record<string, string> = {}
                    for (const score of evaluation.scores ?? []) {
                        if (score?.code && score.value !== undefined) {
                            scores[score.code] = String(score.value)
                        }
                    }

                    expertScoreRows.push({
                        commissionId: commission.id,
                        commissionName: commission.name,
                        replicaId: replica.id,
                        evaluationId,
                        code,
                        beverage: beverageName,
                        producer,
                        replicaName: replica.name || "Replica",
                        replicaType: replica.type || "STANDARD",
                        evaluator,
                        scores,
                        ...shared,
                    })

                    ;(evaluation.comments ?? []).forEach((comment: any, commentIndex: number) => {
                        if (!comment.text && !comment.voiceUrl) return
                        commentRows.push({
                            commissionId: commission.id,
                            commissionName: commission.name,
                            replicaId: replica.id,
                            evaluationId,
                            commentId: String(comment.id || `${evaluationId}-${commentIndex}`),
                            code,
                            beverage: beverageName,
                            producer,
                            replicaName: replica.name || "Replica",
                            evaluator,
                            property: comment.propertyId || "General",
                            commentText: comment.text || "",
                            voiceUrl: comment.voiceUrl || "",
                            ...shared,
                        })
                    })
                })
            }
        }
    }

    return {
        overviewRows,
        expertScoreRows,
        commentRows,
        awardRows,
        summaryRow: {
            commissionId: commission.id,
            commissionName: commission.name,
            status: commission.status,
            candidateCount: candidates.length,
            replicaCount: replicas.length,
            awardsCount,
        },
        outcomeProperties: policyOutputs.map((p) => ({ code: p.code, name: p.name })),
    }
}
