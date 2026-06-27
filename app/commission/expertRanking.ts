import { parseEvaluationTotal } from "@/lib/evaluationTotals"

export interface ExpertBeverageRankEntry {
    order: number
    code: string
    beverageName: string
    totalScore: number
}

export interface ReplicaCandidateWithBeverage {
    id: string
    candidate?: {
        id: string
        anonymizedCode?: string | null
        sample?: {
            batch?: {
                beverage?: {
                    name?: string | null
                } | null
            } | null
        } | null
    } | null
}

interface MyEvaluation {
    isComplete?: boolean
    scores?: Array<{ code: string; value: string }>
}

export function buildExpertBeverageRanking(
    replicaCandidates: ReplicaCandidateWithBeverage[],
    myEvaluationsByReplicaCandidateId: Map<string, MyEvaluation | null>,
    unknownBeverageLabel: string,
): ExpertBeverageRankEntry[] {
    const entries: ExpertBeverageRankEntry[] = []

    replicaCandidates.forEach((rc, index) => {
        const evaluation = myEvaluationsByReplicaCandidateId.get(rc.id)
        if (!evaluation?.isComplete) return

        const totalScore = parseEvaluationTotal(evaluation.scores)
        if (totalScore === null) return

        entries.push({
            order: index + 1,
            code: rc.candidate?.anonymizedCode || "N/A",
            beverageName:
                rc.candidate?.sample?.batch?.beverage?.name || unknownBeverageLabel,
            totalScore,
        })
    })

    return entries
}
