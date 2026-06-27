"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    ArrowLeft,
    ChevronDown,
    ChevronRight,
    Download,
    Printer,
    Search,
    CheckCircle,
    Loader2,
} from "lucide-react"
import { AppHeader } from "@/components/AppHeader"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MemberEvaluationSection } from "../../EvaluationCommentsDisplay"
import { normalizeAuids } from "../../auidUtils"
import type { PropertyMeta } from "../../propertyMap"
import { useTranslation } from "@/lib/i18n/context"
import { TranslatedText } from "@/lib/i18n/TranslatedText"
import { useUsernames } from "@/hooks/useUsernames"
import {
    buildCommentExportRows,
    buildExpertScoreExportRows,
    buildResultsCsv,
    downloadCsv,
    downloadResultsXlsx,
    sanitizeFilename,
    type CommentExportRow,
    type DetailedExportContext,
    type ExpertScoreExportRow,
    type ExportLayoutOptions,
    type ExportRow,
} from "./exportResults"
import type { TemplateEdition } from "@/lib/evaluationScores"
import { buildOutcomePropertyMap } from "@/lib/outcomePolicy/outcomePropertyMap"
import {
    aggregateOverallFromReplicas,
    getReplicaBeverageOutcome,
    resolveReplicaBeverageOutcomes,
    type OverallOutcomeByProperty,
} from "@/lib/outcomePolicy/resolveBeverageOutcomes"
import { isReplicaCandidateFinished } from "../../replicaUtils"
import {
    CALCULATED_TOTAL_SCORE_CODE,
    hasEvaluationTotalScore,
    parseEvaluationTotal,
    TOTAL_SCORE_CODE,
} from "@/lib/evaluationTotals"

const AUTO_REFRESH_MS = 10000

interface ReplicaCandidateDetails {
    outcomeScores: Record<string, string>
    categories: Record<string, string>
    isPreview: boolean
}

interface ExpertBreakdownEntry {
    key: string
    replicaId: string
    replicaName: string
    replicaType: string
    evaluatorAuids: string[]
    totalScore: string
    evaluation: {
        scores?: Array<{ code: string; value: string }>
        comments?: Array<{ id: string; text?: string; voiceUrl?: string | null; propertyId?: string | null }>
    }
}

interface CandidateRow {
    candidate: any
    beverageName: string
    producerAuids: string[]
    outcomeOverall: OverallOutcomeByProperty | null
    awards: any[]
    expertBreakdown: ExpertBreakdownEntry[]
}

function getBeverageProducerAuids(candidate: any): string[] {
    const producers = candidate.sample?.batch?.beverage?.producers
    if (!Array.isArray(producers)) return []

    const auids = new Set<string>()
    producers.forEach((producer: { auid?: unknown }) => {
        normalizeAuids(producer.auid).forEach((id) => auids.add(id))
    })
    return Array.from(auids)
}

function getPropertyLabel(code: string, propertyMap: Record<string, PropertyMeta>): string {
    return propertyMap[code]?.name ?? code
}

function computeEvaluationProgress(commission: { replicas: any[]; candidates: any[] }) {
    let expected = 0
    let complete = 0

    commission.replicas
        .filter((r) => r.type !== "TRAINEE")
        .forEach((r) => {
            const membersCount = r.members?.length ?? 0
            const candidatesCount = commission.candidates?.length ?? 0
            expected += membersCount * candidatesCount

            r.replicaCandidates?.forEach((rc: any) => {
                rc.evaluations?.forEach((ev: any) => {
                    if (ev.isComplete) complete++
                })
            })
        })

    return { expected, complete }
}

function computeReplicaBeverageProgress(replicas: any[]) {
    return replicas.map((replica) => {
        const left = (replica.replicaCandidates ?? []).filter(
            (rc: { status: string }) => !isReplicaCandidateFinished(rc.status),
        ).length
        return { replica, left }
    })
}

function computeRanks(
    candidates: Array<{ id: string; numericScore: number | null }>,
): Map<string, number> {
    const ranks = new Map<string, number>()
    const scored = candidates
        .filter((c) => c.numericScore !== null)
        .sort((a, b) => (b.numericScore as number) - (a.numericScore as number))

    let rank = 1
    for (let i = 0; i < scored.length; i++) {
        if (i > 0 && scored[i].numericScore !== scored[i - 1].numericScore) {
            rank = i + 1
        }
        ranks.set(scored[i].id, rank)
    }
    return ranks
}

interface CommissionResultsClientViewProps {
    commission: any
    awardsMap: Record<string, any[]>
    propertyMap: Record<string, PropertyMeta>
    templateEditionById: Record<string, TemplateEdition>
    propertyCommentsEnabled: boolean
    voiceCommentsEnabled: boolean
}

export default function CommissionResultsClientView({
    commission,
    awardsMap,
    propertyMap,
    templateEditionById,
    propertyCommentsEnabled,
    voiceCommentsEnabled,
}: CommissionResultsClientViewProps) {
    const router = useRouter()
    const { t, tCount, formatReplicaType, formatShortDateTime } = useTranslation()

    const [showCompare, setShowCompare] = useState(false)
    const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null)
    const [expandedCompareCandidateId, setExpandedCompareCandidateId] = useState<string | null>(null)
    const [replicaAId, setReplicaAId] = useState("")
    const [replicaBId, setReplicaBId] = useState("")
    const [sortMode, setSortMode] = useState<"score" | "order">("score")
    const [searchQuery, setSearchQuery] = useState("")
    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(() => new Date())
    const [isPrinting, setIsPrinting] = useState(false)
    const [isExportingXlsx, setIsExportingXlsx] = useState(false)

    useEffect(() => {
        if (commission?.replicas?.length >= 2) {
            setReplicaAId(commission.replicas[0].id)
            setReplicaBId(commission.replicas[1].id)
        } else if (commission?.replicas?.length === 1) {
            setReplicaAId(commission.replicas[0].id)
        }
    }, [commission])

    useEffect(() => {
        setLastRefreshedAt(new Date())
    }, [commission])

    useEffect(() => {
        const intervalId = setInterval(() => router.refresh(), AUTO_REFRESH_MS)
        return () => clearInterval(intervalId)
    }, [router])

    useEffect(() => {
        const onAfterPrint = () => setIsPrinting(false)
        window.addEventListener("afterprint", onAfterPrint)
        return () => window.removeEventListener("afterprint", onAfterPrint)
    }, [])

    const allPersonAuids = useMemo(() => {
        const auids = new Set<string>()
        commission.replicas?.forEach((r: any) => {
            r.replicaCandidates?.forEach((rc: any) => {
                rc.evaluations?.forEach((ev: any) => {
                    normalizeAuids(ev.evaluatorAuid).forEach((id) => auids.add(id))
                })
            })
        })
        commission.candidates?.forEach((candidate: any) => {
            getBeverageProducerAuids(candidate).forEach((id) => auids.add(id))
        })
        return Array.from(auids)
    }, [commission])
    const { usernames } = useUsernames(allPersonAuids)

    const resolveEvaluatorName = useCallback(
        (auids: string[]) => auids.map((id) => usernames[id] || id).join(", "),
        [usernames],
    )

    const resolveProducerName = useCallback(
        (auids: string[]) => {
            if (auids.length === 0) return t("commission.results.unknownProducer")
            return auids.map((id) => usernames[id] || id).join(", ")
        },
        [usernames, t],
    )

    const hasPolicyEdition = Boolean(commission.policyEdition)

    const isReplicaBeverageIncomplete = useCallback(
        (replicaId: string, beverageId: string): boolean => {
            const candidateIds = commission.candidates
                .filter((c: any) => c.sample?.batch?.beverage?.id === beverageId)
                .map((c: any) => c.id)

            const replica = commission.replicas.find((r: any) => r.id === replicaId)
            if (!replica) return false

            const expectedEvaluators = replica.members?.length ?? 0
            for (const candidateId of candidateIds) {
                const rc = replica.replicaCandidates?.find(
                    (item: any) => item.candidate.id === candidateId,
                )
                if (!rc) {
                    if (expectedEvaluators > 0) return true
                    continue
                }
                if (isReplicaCandidateFinished(rc.status)) {
                    continue
                }
                let completeCount = 0
                rc.evaluations?.forEach((ev: any) => {
                    if (ev.isComplete) completeCount++
                })
                if (expectedEvaluators > 0 && completeCount < expectedEvaluators) return true
            }
            return false
        },
        [commission],
    )

    const resolvedOutcomes = useMemo(() => {
        if (!hasPolicyEdition) {
            return { replicaOutcomes: new Map(), outputProperties: [] }
        }
        return resolveReplicaBeverageOutcomes({
            commission,
            policyEdition: commission.policyEdition,
            templateEditionById,
            templatePropertyMap: propertyMap,
            isReplicaBeverageIncomplete,
        })
    }, [commission, templateEditionById, hasPolicyEdition, isReplicaBeverageIncomplete, propertyMap])

    const replicaBeverageOutcomes = resolvedOutcomes.replicaOutcomes
    const policyOutputProperties = resolvedOutcomes.outputProperties

    const outcomePropertyMap = useMemo(
        () => buildOutcomePropertyMap(commission.policyEdition, policyOutputProperties, propertyMap),
        [commission.policyEdition, policyOutputProperties, propertyMap],
    )

    const getReplicaCandidateDetails = useCallback(
        (replica: any, candidateId: string): ReplicaCandidateDetails | null => {
            const rc = replica.replicaCandidates.find((c: any) => c.candidate.id === candidateId)
            const candidate = commission.candidates.find((c: any) => c.id === candidateId)
            const beverageId = candidate?.sample?.batch?.beverage?.id
            const replicaOutcome =
                hasPolicyEdition && beverageId
                    ? getReplicaBeverageOutcome(replicaBeverageOutcomes, replica.id, beverageId)
                    : undefined

            if (!rc) return null
            if (!rc.evaluations?.length && !replicaOutcome) return null

            let completeWithTotalCount = 0
            const categoryValues: Record<string, string[]> = {}
            const expectedEvaluators = replica.members?.length ?? 0

            rc.evaluations?.forEach((ev: any) => {
                if (ev.isComplete) completeWithTotalCount++

                ev.scores?.forEach((score: any) => {
                    if (
                        score.code === TOTAL_SCORE_CODE ||
                        score.code === CALCULATED_TOTAL_SCORE_CODE
                    ) {
                        return
                    }
                    if (!ev.isComplete && !score.value) return
                    if (!categoryValues[score.code]) categoryValues[score.code] = []
                    categoryValues[score.code].push(score.value)
                })
            })

            const categories: Record<string, string> = {}
            Object.keys(categoryValues).forEach((code) => {
                const vals = categoryValues[code]
                const isNumeric = vals.length > 0 && vals.every((v) => !isNaN(parseFloat(v)))

                if (isNumeric) {
                    const sum = vals.reduce((acc, curr) => acc + parseFloat(curr), 0)
                    categories[code] = (sum / vals.length).toFixed(2)
                } else {
                    categories[code] = Array.from(new Set(vals)).join(" | ")
                }
            })

            if (hasPolicyEdition && beverageId) {
                const outcomeScores: Record<string, string> = {}
                for (const prop of policyOutputProperties) {
                    outcomeScores[prop.code] = replicaOutcome?.values[prop.code]?.display ?? "-"
                }
                return {
                    outcomeScores,
                    categories,
                    isPreview: replicaOutcome?.isPreview ?? true,
                }
            }

            if (Object.keys(categoryValues).length === 0) return null

            return {
                outcomeScores: {},
                categories,
                isPreview:
                    expectedEvaluators > 0
                        ? completeWithTotalCount < expectedEvaluators
                        : rc.evaluations.some(
                              (ev: any) => !ev.isComplete && hasEvaluationTotalScore(ev),
                          ),
            }
        },
        [commission.candidates, replicaBeverageOutcomes, hasPolicyEdition, policyOutputProperties],
    )

    const getExpertBreakdown = useCallback(
        (candidateId: string): ExpertBreakdownEntry[] => {
            const breakdown: ExpertBreakdownEntry[] = []
            commission.replicas.forEach((r: any) => {
                const rc = r.replicaCandidates.find((c: any) => c.candidate.id === candidateId)
                if (rc?.evaluations) {
                    rc.evaluations.forEach((ev: any, idx: number) => {
                        if (ev.isComplete) {
                            const totalVal = parseEvaluationTotal(ev.scores)
                            const evaluatorAuids = normalizeAuids(ev.evaluatorAuid)
                            breakdown.push({
                                key: `${r.id}-${evaluatorAuids.join("-")}-${idx}`,
                                replicaId: r.id,
                                replicaName: r.name || formatReplicaType(r.type),
                                replicaType: r.type,
                                evaluatorAuids,
                                totalScore: totalVal !== null ? String(totalVal) : "-",
                                evaluation: {
                                    scores: ev.scores || [],
                                    comments: ev.comments || [],
                                },
                            })
                        }
                    })
                }
            })
            return breakdown
        },
        [commission.replicas, formatReplicaType],
    )

    const candidateRows = useMemo((): CandidateRow[] => {
        return commission.candidates.map((candidate: any) => {
            const beverageId = candidate.sample?.batch?.beverage?.id
            const beverageName =
                candidate.sample?.batch?.beverage?.name || t("commission.results.unknownBeverage")

            const outcomeOverall: OverallOutcomeByProperty | null =
                hasPolicyEdition && beverageId
                    ? aggregateOverallFromReplicas(
                          replicaBeverageOutcomes,
                          beverageId,
                          commission.replicas,
                          policyOutputProperties,
                      )
                    : null

            const allBeverageAwards = awardsMap[beverageId] || []
            const currentCommissionAwards = allBeverageAwards.filter(
                (a: any) => a.commissionId === commission.id,
            )

            return {
                candidate,
                beverageName,
                producerAuids: getBeverageProducerAuids(candidate),
                outcomeOverall,
                awards: currentCommissionAwards,
                expertBreakdown: getExpertBreakdown(candidate.id),
            }
        })
    }, [
        commission.candidates,
        commission.id,
        commission.replicas,
        awardsMap,
        replicaBeverageOutcomes,
        policyOutputProperties,
        getExpertBreakdown,
        t,
        hasPolicyEdition,
    ])

    const sortScorePropertyCode = policyOutputProperties[0]?.code ?? null

    const ranks = useMemo(() => {
        const byProperty: Record<string, Map<string, number>> = {}
        for (const prop of policyOutputProperties) {
            byProperty[prop.code] = computeRanks(
                candidateRows.map((row) => ({
                    id: row.candidate.id,
                    numericScore: row.outcomeOverall?.[prop.code]?.numeric ?? null,
                })),
            )
        }
        return byProperty
    }, [candidateRows, policyOutputProperties])

    const maxScoreByProperty = useMemo(() => {
        const maxes: Record<string, number> = {}
        for (const prop of policyOutputProperties) {
            let max = 0
            candidateRows.forEach((row) => {
                const numeric = row.outcomeOverall?.[prop.code]?.numeric
                if (numeric !== null && numeric !== undefined && numeric > max) max = numeric
            })
            maxes[prop.code] = max
        }
        return maxes
    }, [candidateRows, policyOutputProperties])

    const candidateOrderIndex = useMemo(() => {
        const map = new Map<string, number>()
        commission.candidates.forEach((candidate: any, index: number) => {
            map.set(candidate.id, index + 1)
        })
        return map
    }, [commission.candidates])

    const filteredAndSortedRows = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()
        let rows: CandidateRow[] = candidateRows

        if (query) {
            rows = rows.filter((row) => {
                const code = (row.candidate.anonymizedCode || "").toLowerCase()
                const beverage = row.beverageName.toLowerCase()
                const producer = resolveProducerName(row.producerAuids).toLowerCase()
                return (
                    code.includes(query) ||
                    beverage.includes(query) ||
                    producer.includes(query)
                )
            })
        }

        if (sortMode === "score" && sortScorePropertyCode) {
            rows = [...rows].sort((a, b) => {
                const aScore = a.outcomeOverall?.[sortScorePropertyCode]?.numeric
                const bScore = b.outcomeOverall?.[sortScorePropertyCode]?.numeric
                if (aScore === null && bScore === null) return 0
                if (aScore === null || aScore === undefined) return 1
                if (bScore === null || bScore === undefined) return -1
                return bScore - aScore
            })
        } else if (sortMode === "order") {
            rows = [...rows].sort((a, b) => {
                const idxA = candidateOrderIndex.get(a.candidate.id) ?? Number.MAX_SAFE_INTEGER
                const idxB = candidateOrderIndex.get(b.candidate.id) ?? Number.MAX_SAFE_INTEGER
                return idxA - idxB
            })
        }

        return rows
    }, [
        candidateRows,
        searchQuery,
        sortMode,
        candidateOrderIndex,
        resolveProducerName,
        sortScorePropertyCode,
    ])

    const { expected: expectedEvaluations, complete: completeEvaluations } = useMemo(
        () => computeEvaluationProgress(commission),
        [commission],
    )

    const replicaBeverageProgress = useMemo(
        () => computeReplicaBeverageProgress(commission.replicas ?? []),
        [commission.replicas],
    )

    const hasPreviewScores = useMemo(
        () =>
            candidateRows.some((row) =>
                Object.values(row.outcomeOverall ?? {}).some((o) => o.isPreview),
            ),
        [candidateRows],
    )

    const isSessionComplete =
        commission.status === "COMPLETED" ||
        (expectedEvaluations > 0 && completeEvaluations >= expectedEvaluations && !hasPreviewScores)

    const replicaA = commission.replicas.find((r: any) => r.id === replicaAId)
    const replicaB = commission.replicas.find((r: any) => r.id === replicaBId)

    const allCategoriesKeys = useMemo(() => {
        const cats = new Set<string>()
        const processReplica = (rep: any) => {
            if (!rep) return
            commission.candidates.forEach((c: any) => {
                const details = getReplicaCandidateDetails(rep, c.id)
                if (details) Object.keys(details.categories).forEach((k) => cats.add(k))
            })
        }
        processReplica(replicaA)
        processReplica(replicaB)
        return Array.from(cats)
    }, [replicaA, replicaB, commission.candidates, getReplicaCandidateDetails])

    const candidateRowById = useMemo(() => {
        const map = new Map<string, CandidateRow>()
        candidateRows.forEach((row) => map.set(row.candidate.id, row))
        return map
    }, [candidateRows])

    const getReplicaLabel = (replica: any) => replica.name || formatReplicaType(replica.type)

    const buildExportLayout = (): ExportLayoutOptions => ({
        sortMode,
        outcomePropertyCodes: policyOutputProperties.map((p) => p.code),
        outcomePropertyNames: Object.fromEntries(
            policyOutputProperties.map((p) => [p.code, outcomePropertyMap[p.code]?.name ?? p.name]),
        ),
        orderByCandidateId: candidateOrderIndex,
    })

    const buildExportContext = (): DetailedExportContext => {
        const overviewRows: ExportRow[] = filteredAndSortedRows.map((row: CandidateRow) => {
            const outcomes: Record<string, string> = {}
            for (const prop of policyOutputProperties) {
                outcomes[prop.code] = row.outcomeOverall?.[prop.code]?.average ?? "-"
            }

            return {
                candidateId: row.candidate.id,
                code: row.candidate.anonymizedCode || "N/A",
                beverage: row.beverageName,
                producer: resolveProducerName(row.producerAuids),
                outcomes,
                awards: row.awards.map((a: any) => a.award?.name || "").filter(Boolean).join("; "),
            }
        })

        const expertScoreRows: ExpertScoreExportRow[] = []
        const commentRows: CommentExportRow[] = []
        const exportOptions = {
            propertyMap,
            propertyCommentsEnabled,
            voiceCommentsEnabled,
            generalCommentLabel: t("evaluation.generalCommentLabel"),
        }

        filteredAndSortedRows.forEach((row: CandidateRow) => {
            const code = row.candidate.anonymizedCode || "N/A"
            const producer = resolveProducerName(row.producerAuids)
            row.expertBreakdown.forEach((expert) => {
                const evaluator = resolveEvaluatorName(expert.evaluatorAuids)
                expertScoreRows.push(
                    buildExpertScoreExportRows(
                        code,
                        row.beverageName,
                        producer,
                        expert.replicaName,
                        expert.replicaType,
                        evaluator,
                        expert.evaluation.scores || [],
                        propertyMap,
                    ),
                )
                commentRows.push(
                    ...buildCommentExportRows(
                        code,
                        row.beverageName,
                        producer,
                        expert.replicaName,
                        evaluator,
                        expert.evaluation.comments || [],
                        propertyMap,
                        exportOptions,
                    ),
                )
            })
        })

        return { overviewRows, expertScoreRows, commentRows }
    }

    const handleExport = async (format: "csv" | "xlsx") => {
        if (format === "csv") {
            const { overviewRows } = buildExportContext()
            const csv = buildResultsCsv(overviewRows, buildExportLayout())
            downloadCsv(csv, `${sanitizeFilename(commission.name)}-results.csv`)
            return
        }

        setIsExportingXlsx(true)
        try {
            const context = buildExportContext()
            await downloadResultsXlsx(
                context,
                propertyMap,
                `${sanitizeFilename(commission.name)}-results.xlsx`,
                buildExportLayout(),
            )
        } finally {
            setIsExportingXlsx(false)
        }
    }

    const handlePrint = () => {
        setIsPrinting(true)
        requestAnimationFrame(() => window.print())
    }

    const showSearch = commission.candidates.length > 5

    function CandidateIdentityCell({
        code,
        beverageName,
        producerAuids,
    }: {
        code: string | null
        beverageName: string
        producerAuids: string[]
    }) {
        const producerName = resolveProducerName(producerAuids)
        return (
            <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-bold text-slate-800 text-sm leading-snug">
                    {beverageName}
                </span>
                <span className="text-xs text-slate-600">
                    <span className="font-medium text-slate-500">
                        {t("commission.results.producer")}:
                    </span>{" "}
                    {producerName}
                </span>
                {code && (
                    <span className="text-[11px] font-mono text-slate-400">
                        {t("commission.results.candidateCode")}: {code}
                    </span>
                )}
            </div>
        )
    }

    function PreviewScoreBadge({ className = "" }: { className?: string }) {
        return (
            <span
                className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded ${className}`}
                title={t("commission.results.previewTooltip")}
            >
                {t("commission.results.previewBadge")}
            </span>
        )
    }

    function OutcomePropertyLabel({ code }: { code: string }) {
        const label = outcomePropertyMap[code]?.name ?? code
        return <TranslatedText text={label} />
    }

    function ScoreCell({
        value,
        isPreview,
        highlight,
    }: {
        value: string | number | null
        isPreview?: boolean
        highlight?: "winner" | "loser" | null
    }) {
        if (value === null || value === "-") return <>-</>

        const highlightClass =
            highlight === "winner"
                ? "text-emerald-700 font-bold"
                : highlight === "loser"
                  ? "text-slate-400"
                  : isPreview
                    ? "text-amber-700"
                    : undefined

        return (
            <div className="flex flex-col items-center gap-1">
                <span className={highlightClass}>{value}</span>
                {isPreview && <PreviewScoreBadge />}
            </div>
        )
    }

    function OutcomeScoresStack({
        scores,
        isPreview,
        highlight,
    }: {
        scores: Record<string, string>
        isPreview?: boolean
        highlight?: Record<string, "winner" | "loser" | null>
    }) {
        if (policyOutputProperties.length === 0) return <>-</>

        return (
            <div className="flex flex-col gap-2">
                {policyOutputProperties.map((prop) => (
                    <div key={prop.code} className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            <OutcomePropertyLabel code={prop.code} />
                        </span>
                        <ScoreCell
                            value={scores[prop.code] ?? "-"}
                            isPreview={isPreview}
                            highlight={highlight?.[prop.code]}
                        />
                    </div>
                ))}
            </div>
        )
    }

    function ReplicaTypeBadge({ type }: { type: string }) {
        const isTrainee = type === "TRAINEE"
        return (
            <span
                className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                    isTrainee
                        ? "bg-amber-100 text-amber-700"
                        : "bg-indigo-100 text-indigo-700"
                }`}
            >
                {formatReplicaType(type)}
            </span>
        )
    }

    return (
        <div className="flex min-h-screen flex-col bg-slate-50/50 font-sans">
            <div className="print:hidden">
                <AppHeader activeTab="competitions" />
            </div>

            <main className="flex-1 p-4 md:p-8 lg:p-12">
                <div className="max-w-7xl mx-auto flex flex-col gap-6">
                    {/* Back + title */}
                    <div className="flex flex-col gap-4 print:hidden">
                        <Link
                            href={`/commission/${commission.id}`}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors w-fit"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            {t("commission.backToCommission")}
                        </Link>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
                                    {t("commission.results.pageTitle", { name: commission.name })}
                                </h1>
                                <span
                                    className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${
                                        isSessionComplete
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-amber-100 text-amber-700"
                                    }`}
                                >
                                    {isSessionComplete
                                        ? t("commission.results.statusCompleted")
                                        : t("commission.results.statusInProgress")}
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            disabled={isExportingXlsx}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {isExportingXlsx ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Download className="w-4 h-4" />
                                            )}
                                            {t("commission.results.export")}
                                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="min-w-[10rem]">
                                        <DropdownMenuItem onClick={() => void handleExport("csv")}>
                                            {t("commission.results.exportCsv")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => void handleExport("xlsx")}>
                                            {t("commission.results.exportXlsx")}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <button
                                    type="button"
                                    onClick={handlePrint}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                                >
                                    <Printer className="w-4 h-4" />
                                    {t("commission.results.print")}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCompare(!showCompare)}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm text-sm"
                                >
                                    {showCompare
                                        ? t("commission.results.backToOverview")
                                        : t("commission.results.compareReplicas")}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Print-only title */}
                    <h1 className="hidden print:block text-2xl font-bold text-slate-800 mb-4">
                        {t("commission.results.pageTitle", { name: commission.name })}
                    </h1>

                    {/* Status banner */}
                    <div
                        className={`rounded-2xl px-5 py-4 border flex items-start gap-3 print:hidden ${
                            isSessionComplete
                                ? "bg-emerald-50 border-emerald-200"
                                : "bg-indigo-50 border-indigo-200"
                        }`}
                    >
                        {isSessionComplete ? (
                            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                            <Loader2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5 animate-spin" />
                        )}
                        <div>
                            <p
                                className={`text-sm font-bold ${
                                    isSessionComplete ? "text-emerald-800" : "text-indigo-900"
                                }`}
                            >
                                {expectedEvaluations > 0
                                    ? t("commission.results.progressComplete", {
                                          complete: completeEvaluations,
                                          expected: expectedEvaluations,
                                      })
                                    : t("commission.results.statusInProgress")}
                            </p>
                            <p
                                className={`text-xs mt-0.5 ${
                                    isSessionComplete ? "text-emerald-600" : "text-indigo-600"
                                }`}
                            >
                                {isSessionComplete
                                    ? t("commission.results.progressFinal")
                                    : t("commission.results.progressNote")}
                            </p>
                            {!isSessionComplete &&
                                replicaBeverageProgress.some(({ left }) => left > 0) && (
                                    <ul className="mt-2 space-y-0.5">
                                        {replicaBeverageProgress.map(({ replica, left }) =>
                                            left > 0 ? (
                                                <li
                                                    key={replica.id}
                                                    className="text-xs text-indigo-700"
                                                >
                                                    {tCount(
                                                        "commission.results.replicaBeveragesLeft",
                                                        left,
                                                        { name: getReplicaLabel(replica) },
                                                    )}
                                                </li>
                                            ) : null,
                                        )}
                                    </ul>
                                )}
                        </div>
                    </div>

                    {/* Refresh indicator */}
                    <p className="text-xs text-slate-400 print:hidden">
                        {t("commission.results.autoRefresh")} ·{" "}
                        {t("commission.results.lastUpdated", {
                            time: formatShortDateTime(lastRefreshedAt.toISOString()),
                        })}
                    </p>

                    {showCompare ? (
                        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                            <div className="mb-6 border-b border-slate-100 pb-4">
                                <h2 className="text-xl font-bold text-slate-800">
                                    {t("commission.results.compareTitle")}
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    {t("commission.results.compareDesc")}
                                </p>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 mb-8 items-end print:hidden">
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        {t("commission.results.replicaA")}
                                    </label>
                                    <select
                                        value={replicaAId}
                                        onChange={(e) => setReplicaAId(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="" disabled>
                                            {t("commission.results.selectReplica")}
                                        </option>
                                        {commission.replicas.map((r: any) => (
                                            <option key={r.id} value={r.id}>
                                                {getReplicaLabel(r)} ({formatReplicaType(r.type)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        {t("commission.results.replicaB")}
                                    </label>
                                    <select
                                        value={replicaBId}
                                        onChange={(e) => setReplicaBId(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="" disabled>
                                            {t("commission.results.selectReplica")}
                                        </option>
                                        {commission.replicas.map((r: any) => (
                                            <option key={r.id} value={r.id}>
                                                {getReplicaLabel(r)} ({formatReplicaType(r.type)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setReplicaAId("")
                                        setReplicaBId("")
                                    }}
                                    className="px-4 py-2.5 text-rose-600 font-medium bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
                                >
                                    {t("commission.results.clear")}
                                </button>
                            </div>

                            {replicaA && replicaB && replicaAId !== replicaBId ? (
                                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/80 border-b border-slate-200">
                                                <th className="py-4 px-6 font-semibold text-slate-600">
                                                    {t("commission.results.candidate")}
                                                </th>
                                                <th className="py-4 px-6 text-center text-slate-600">
                                                    {t("commission.results.totalA")}{" "}
                                                    <span className="text-xs font-normal">
                                                        ({getReplicaLabel(replicaA)})
                                                    </span>
                                                </th>
                                                <th className="py-4 px-6 text-center text-slate-600">
                                                    {t("commission.results.totalB")}{" "}
                                                    <span className="text-xs font-normal">
                                                        ({getReplicaLabel(replicaB)})
                                                    </span>
                                                </th>
                                                <th className="py-4 px-6 text-center font-bold text-slate-800">
                                                    {t("commission.results.diffAB")}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {commission.candidates.map((candidate: any) => {
                                                const rowInfo = candidateRowById.get(candidate.id)
                                                const detA = getReplicaCandidateDetails(
                                                    replicaA,
                                                    candidate.id,
                                                )
                                                const detB = getReplicaCandidateDetails(
                                                    replicaB,
                                                    candidate.id,
                                                )

                                                const highlightAByProp: Record<
                                                    string,
                                                    "winner" | "loser" | null
                                                > = {}
                                                const highlightBByProp: Record<
                                                    string,
                                                    "winner" | "loser" | null
                                                > = {}
                                                const outcomeDiffs: Record<string, string> = {}

                                                for (const prop of policyOutputProperties) {
                                                    const valA = detA?.outcomeScores[prop.code]
                                                    const valB = detB?.outcomeScores[prop.code]
                                                    const numA =
                                                        valA && valA !== "-"
                                                            ? parseFloat(valA)
                                                            : null
                                                    const numB =
                                                        valB && valB !== "-"
                                                            ? parseFloat(valB)
                                                            : null
                                                    if (
                                                        numA !== null &&
                                                        numB !== null &&
                                                        numA !== numB
                                                    ) {
                                                        if (numA > numB) {
                                                            highlightAByProp[prop.code] = "winner"
                                                            highlightBByProp[prop.code] = "loser"
                                                        } else {
                                                            highlightBByProp[prop.code] = "winner"
                                                            highlightAByProp[prop.code] = "loser"
                                                        }
                                                        const diff = numA - numB
                                                        outcomeDiffs[prop.code] =
                                                            diff > 0
                                                                ? `+${diff.toFixed(2)}`
                                                                : diff.toFixed(2)
                                                    } else {
                                                        outcomeDiffs[prop.code] = "-"
                                                    }
                                                }

                                                const isExpanded =
                                                    expandedCompareCandidateId === candidate.id ||
                                                    isPrinting

                                                return (
                                                    <React.Fragment key={candidate.id}>
                                                        <tr
                                                            className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                                                            onClick={() =>
                                                                setExpandedCompareCandidateId(
                                                                    expandedCompareCandidateId ===
                                                                        candidate.id
                                                                        ? null
                                                                        : candidate.id,
                                                                )
                                                            }
                                                        >
                                                            <td className="py-4 px-6 font-medium text-slate-800">
                                                                <div className="flex items-center gap-2">
                                                                    {isExpanded ? (
                                                                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 print:hidden" />
                                                                    ) : (
                                                                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 print:hidden" />
                                                                    )}
                                                                    <div className="flex flex-col gap-1 min-w-0">
                                                                        {rowInfo ? (
                                                                            <CandidateIdentityCell
                                                                                code={
                                                                                    candidate.anonymizedCode ||
                                                                                    null
                                                                                }
                                                                                beverageName={
                                                                                    rowInfo.beverageName
                                                                                }
                                                                                producerAuids={
                                                                                    rowInfo.producerAuids
                                                                                }
                                                                            />
                                                                        ) : (
                                                                            <span className="font-mono text-xs text-slate-400">
                                                                                {candidate.anonymizedCode ||
                                                                                    "N/A"}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-6 text-center">
                                                                <OutcomeScoresStack
                                                                    scores={
                                                                        detA?.outcomeScores ?? {}
                                                                    }
                                                                    isPreview={detA?.isPreview}
                                                                    highlight={highlightAByProp}
                                                                />
                                                            </td>
                                                            <td className="py-4 px-6 text-center">
                                                                <OutcomeScoresStack
                                                                    scores={
                                                                        detB?.outcomeScores ?? {}
                                                                    }
                                                                    isPreview={detB?.isPreview}
                                                                    highlight={highlightBByProp}
                                                                />
                                                            </td>
                                                            <td className="py-4 px-6 text-center">
                                                                <div className="flex flex-col gap-2">
                                                                    {policyOutputProperties.map(
                                                                        (prop) => {
                                                                            const diff =
                                                                                outcomeDiffs[
                                                                                    prop.code
                                                                                ] ?? "-"
                                                                            const diffNum =
                                                                                diff !== "-"
                                                                                    ? parseFloat(
                                                                                          diff,
                                                                                      )
                                                                                    : null
                                                                            return (
                                                                                <div
                                                                                    key={prop.code}
                                                                                    className="flex flex-col items-center gap-0.5"
                                                                                >
                                                                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                                                        <OutcomePropertyLabel
                                                                                            code={
                                                                                                prop.code
                                                                                            }
                                                                                        />
                                                                                    </span>
                                                                                    <span
                                                                                        className={`font-bold ${
                                                                                            diffNum !==
                                                                                                null &&
                                                                                            diffNum >
                                                                                                0
                                                                                                ? "text-emerald-600"
                                                                                                : diffNum !==
                                                                                                      null &&
                                                                                                    diffNum <
                                                                                                        0
                                                                                                  ? "text-rose-600"
                                                                                                  : "text-slate-500"
                                                                                        }`}
                                                                                    >
                                                                                        {diff}
                                                                                    </span>
                                                                                </div>
                                                                            )
                                                                        },
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>

                                                        {isExpanded && (
                                                            <tr>
                                                                <td
                                                                    colSpan={4}
                                                                    className="p-0 border-b border-slate-200 bg-slate-50/80 shadow-inner"
                                                                >
                                                                    <div className="p-6">
                                                                        <h4 className="text-sm font-bold text-slate-700 mb-4">
                                                                            {t(
                                                                                "commission.results.categoryComparison",
                                                                            )}
                                                                        </h4>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                                            {allCategoriesKeys.map(
                                                                                (cat) => {
                                                                                    const valA =
                                                                                        detA
                                                                                            ?.categories[
                                                                                            cat
                                                                                        ] ?? null
                                                                                    const valB =
                                                                                        detB
                                                                                            ?.categories[
                                                                                            cat
                                                                                        ] ?? null

                                                                                    const isNumericCat =
                                                                                        valA !==
                                                                                            null &&
                                                                                        valB !==
                                                                                            null &&
                                                                                        !isNaN(
                                                                                            parseFloat(
                                                                                                valA,
                                                                                            ),
                                                                                        ) &&
                                                                                        !isNaN(
                                                                                            parseFloat(
                                                                                                valB,
                                                                                            ),
                                                                                        )

                                                                                    let diffDisplay =
                                                                                        "-"
                                                                                    let diffColor =
                                                                                        "text-slate-400"

                                                                                    if (
                                                                                        valA !==
                                                                                            null &&
                                                                                        valB !== null
                                                                                    ) {
                                                                                        if (
                                                                                            isNumericCat
                                                                                        ) {
                                                                                            const diffNum =
                                                                                                parseFloat(
                                                                                                    valA,
                                                                                                ) -
                                                                                                parseFloat(
                                                                                                    valB,
                                                                                                )
                                                                                            diffDisplay =
                                                                                                diffNum >
                                                                                                0
                                                                                                    ? `+${diffNum.toFixed(2)}`
                                                                                                    : diffNum.toFixed(
                                                                                                          2,
                                                                                                      )
                                                                                            diffColor =
                                                                                                diffNum >
                                                                                                0
                                                                                                    ? "text-emerald-500"
                                                                                                    : diffNum <
                                                                                                        0
                                                                                                      ? "text-rose-500"
                                                                                                      : "text-slate-400"
                                                                                        } else {
                                                                                            diffDisplay =
                                                                                                valA ===
                                                                                                valB
                                                                                                    ? "="
                                                                                                    : "≠"
                                                                                            diffColor =
                                                                                                valA ===
                                                                                                valB
                                                                                                    ? "text-slate-400"
                                                                                                    : "text-amber-500"
                                                                                        }
                                                                                    }

                                                                                    return (
                                                                                        <div
                                                                                            key={cat}
                                                                                            className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 text-sm"
                                                                                        >
                                                                                            <div className="font-semibold text-slate-600 mb-2 border-b border-slate-100 pb-1">
                                                                                                <TranslatedText
                                                                                                    text={getPropertyLabel(
                                                                                                        cat,
                                                                                                        propertyMap,
                                                                                                    )}
                                                                                                />
                                                                                            </div>
                                                                                            <div className="flex justify-between items-center mt-2">
                                                                                                <div className="flex flex-col space-y-1">
                                                                                                    <span className="text-xs text-slate-400">
                                                                                                        {t(
                                                                                                            "commission.results.repA",
                                                                                                        )}
                                                                                                        :{" "}
                                                                                                        <span className="font-medium text-slate-700">
                                                                                                            {valA ??
                                                                                                                "-"}
                                                                                                        </span>
                                                                                                    </span>
                                                                                                    <span className="text-xs text-slate-400">
                                                                                                        {t(
                                                                                                            "commission.results.repB",
                                                                                                        )}
                                                                                                        :{" "}
                                                                                                        <span className="font-medium text-slate-700">
                                                                                                            {valB ??
                                                                                                                "-"}
                                                                                                        </span>
                                                                                                    </span>
                                                                                                </div>
                                                                                                <div
                                                                                                    className={`font-bold text-base ${diffColor}`}
                                                                                                >
                                                                                                    {
                                                                                                        diffDisplay
                                                                                                    }
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    )
                                                                                },
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                                    {commission.replicas.length < 2
                                        ? t("commission.results.notEnoughReplicas")
                                        : t("commission.results.selectTwoReplicas")}
                                </div>
                            )}
                        </section>
                    ) : (
                        <section className="bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden">
                            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <h2 className="text-lg font-bold text-slate-800">
                                    {t("commission.results.finalOverview")}
                                </h2>
                                <div className="flex flex-wrap items-center gap-2 print:hidden">
                                    <span className="text-xs font-semibold text-slate-500 bg-slate-200 px-2 py-1 rounded">
                                        {t("commission.results.traineeExcluded")}
                                    </span>
                                    {showSearch && (
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                            <input
                                                type="search"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder={t(
                                                    "commission.results.searchPlaceholder",
                                                )}
                                                className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none w-48"
                                            />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-medium text-slate-500">
                                            {t("commission.results.sortLabel")}
                                        </span>
                                        <div
                                            className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5"
                                            role="group"
                                            aria-label={t("commission.results.sortLabel")}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setSortMode("score")}
                                                aria-pressed={sortMode === "score"}
                                                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                                                    sortMode === "score"
                                                        ? "bg-indigo-600 text-white shadow-sm"
                                                        : "text-slate-600 hover:bg-slate-50"
                                                }`}
                                            >
                                                {t("commission.results.sortByScore")}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSortMode("order")}
                                                aria-pressed={sortMode === "order"}
                                                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                                                    sortMode === "order"
                                                        ? "bg-indigo-600 text-white shadow-sm"
                                                        : "text-slate-600 hover:bg-slate-50"
                                                }`}
                                            >
                                                {t("commission.results.sortByOrder")}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p className="px-6 py-2 text-xs text-slate-400 border-b border-slate-50 print:hidden">
                                {t("commission.results.clickToExpand")}
                            </p>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/80 border-b border-slate-100">
                                            {sortMode === "order" && (
                                                <th className="py-4 px-4 font-semibold text-slate-600 text-sm w-16 text-center">
                                                    {t("commission.results.candidateOrder")}
                                                </th>
                                            )}
                                            <th className="py-4 px-6 font-semibold text-slate-600 text-sm">
                                                {t("commission.results.codeBeverage")}
                                            </th>
                                            {policyOutputProperties.map((prop) => (
                                                <th
                                                    key={prop.code}
                                                    className="py-4 px-6 font-bold text-indigo-700 text-sm text-center border-l border-slate-100 bg-indigo-50/30 min-w-[8rem]"
                                                >
                                                    <OutcomePropertyLabel code={prop.code} />
                                                </th>
                                            ))}
                                            <th className="py-4 px-6 font-semibold text-slate-600 text-sm border-l border-slate-100 w-1/2">
                                                {t("commission.results.awards")}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredAndSortedRows.map((row: CandidateRow) => {
                                            const isExpanded =
                                                expandedCandidateId === row.candidate.id ||
                                                isPrinting
                                            const sessionOrder = candidateOrderIndex.get(
                                                row.candidate.id,
                                            )
                                            const overviewTableColSpan =
                                                2 +
                                                policyOutputProperties.length +
                                                (sortMode === "order" ? 1 : 0)

                                            return (
                                                <React.Fragment key={row.candidate.id}>
                                                    <tr
                                                        className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                                                        onClick={() =>
                                                            setExpandedCandidateId(
                                                                expandedCandidateId ===
                                                                    row.candidate.id
                                                                    ? null
                                                                    : row.candidate.id,
                                                            )
                                                        }
                                                    >
                                                        {sortMode === "order" && (
                                                            <td className="py-4 px-4 text-center font-bold text-slate-500 text-sm">
                                                                {sessionOrder != null
                                                                    ? `#${sessionOrder}`
                                                                    : "—"}
                                                            </td>
                                                        )}
                                                        <td className="py-4 px-6">
                                                            <div className="flex items-center gap-2">
                                                                {isExpanded ? (
                                                                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 print:hidden" />
                                                                ) : (
                                                                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 print:hidden" />
                                                                )}
                                                                <CandidateIdentityCell
                                                                    code={
                                                                        row.candidate.anonymizedCode ||
                                                                        null
                                                                    }
                                                                    beverageName={row.beverageName}
                                                                    producerAuids={row.producerAuids}
                                                                />
                                                            </div>
                                                        </td>

                                                        {policyOutputProperties.map((prop) => {
                                                              const outcome =
                                                                  row.outcomeOverall?.[prop.code]
                                                              const propMax =
                                                                  maxScoreByProperty[prop.code] ??
                                                                  0
                                                              const scoreBarWidth =
                                                                  outcome?.numeric !== null &&
                                                                  outcome?.numeric !== undefined &&
                                                                  propMax > 0
                                                                      ? (outcome.numeric /
                                                                            propMax) *
                                                                        100
                                                                      : 0
                                                              const propRank = ranks[
                                                                  prop.code
                                                              ]?.get(row.candidate.id)

                                                              return (
                                                                  <td
                                                                      key={prop.code}
                                                                      className={`py-4 px-6 text-center border-l border-slate-50 font-bold bg-indigo-50/10 text-lg relative ${
                                                                          outcome?.isPreview
                                                                              ? "text-amber-700"
                                                                              : "text-indigo-700"
                                                                      }`}
                                                                  >
                                                                      {scoreBarWidth > 0 && (
                                                                          <div
                                                                              className="absolute inset-y-2 left-2 bg-indigo-100/60 rounded-md -z-0 print:hidden"
                                                                              style={{
                                                                                  width: `calc(${scoreBarWidth}% - 1rem)`,
                                                                              }}
                                                                          />
                                                                      )}
                                                                      <div className="relative z-10 flex flex-col items-center gap-1">
                                                                          <ScoreCell
                                                                              value={
                                                                                  outcome?.average ??
                                                                                  "-"
                                                                              }
                                                                              isPreview={
                                                                                  outcome?.isPreview
                                                                              }
                                                                          />
                                                                          {sortMode === "score" &&
                                                                              propRank != null && (
                                                                                  <span className="text-xs font-semibold text-slate-400">
                                                                                      #{propRank}
                                                                                  </span>
                                                                              )}
                                                                      </div>
                                                                  </td>
                                                              )
                                                          })}

                                                        <td className="py-4 px-6 border-l border-slate-50">
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {row.awards.map((assignment: any) => (
                                                                    <span
                                                                        key={assignment.id}
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/60 shadow-xs"
                                                                        title={
                                                                            assignment.award
                                                                                ?.description || ""
                                                                        }
                                                                    >
                                                                        {assignment.award
                                                                            ?.badgeUrl && (
                                                                            <img
                                                                                src={
                                                                                    assignment.award
                                                                                        .badgeUrl
                                                                                }
                                                                                alt={
                                                                                    assignment.award
                                                                                        .name
                                                                                }
                                                                                className="w-3.5 h-3.5 object-contain"
                                                                            />
                                                                        )}
                                                                        {assignment.award?.name ||
                                                                            t(
                                                                                "commission.results.unknownAward",
                                                                            )}
                                                                    </span>
                                                                ))}
                                                                {row.awards.length === 0 && (
                                                                    <span className="text-xs text-slate-400 font-normal">
                                                                        {t(
                                                                            "commission.results.noAwards",
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {isExpanded && (
                                                        <tr>
                                                            <td
                                                                colSpan={overviewTableColSpan}
                                                                className="p-0 border-b border-slate-200 bg-slate-50/80 shadow-inner"
                                                            >
                                                                <div className="p-6">
                                                                    <h4 className="text-sm font-bold text-slate-700 mb-4">
                                                                        {t(
                                                                            "commission.results.expertBreakdown",
                                                                        )}
                                                                    </h4>
                                                                    {row.expertBreakdown.length >
                                                                    0 ? (
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                            {row.expertBreakdown.map(
                                                                                (expert: ExpertBreakdownEntry) => (
                                                                                    <div
                                                                                        key={
                                                                                            expert.key
                                                                                        }
                                                                                        className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col"
                                                                                    >
                                                                                        <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                                                                                            <div className="flex flex-col gap-1">
                                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                                    <span className="text-xs font-bold text-slate-500 uppercase">
                                                                                                        {
                                                                                                            expert.replicaName
                                                                                                        }
                                                                                                    </span>
                                                                                                    <ReplicaTypeBadge
                                                                                                        type={
                                                                                                            expert.replicaType
                                                                                                        }
                                                                                                    />
                                                                                                </div>
                                                                                                <span className="text-xs text-slate-600">
                                                                                                    {resolveEvaluatorName(
                                                                                                        expert.evaluatorAuids,
                                                                                                    )}
                                                                                                </span>
                                                                                            </div>
                                                                                            <div className="text-xl font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg shrink-0">
                                                                                                {
                                                                                                    expert.totalScore
                                                                                                }
                                                                                            </div>
                                                                                        </div>
                                                                                        <MemberEvaluationSection
                                                                                            evaluation={
                                                                                                expert.evaluation
                                                                                            }
                                                                                            propertyMap={
                                                                                                propertyMap
                                                                                            }
                                                                                            accent="indigo"
                                                                                            propertyCommentsEnabled={
                                                                                                propertyCommentsEnabled
                                                                                            }
                                                                                            voiceCommentsEnabled={
                                                                                                voiceCommentsEnabled
                                                                                            }
                                                                                        />
                                                                                    </div>
                                                                                ),
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-sm text-slate-500 italic">
                                                                            {t(
                                                                                "commission.results.noEvaluationsYet",
                                                                            )}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            )
                                        })}

                                        {commission.candidates.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={
                                                        2 +
                                                        policyOutputProperties.length +
                                                        (sortMode === "order" ? 1 : 0)
                                                    }
                                                    className="py-12 text-center text-slate-400 text-sm"
                                                >
                                                    {t("commission.results.noCandidates")}
                                                </td>
                                            </tr>
                                        )}

                                        {commission.candidates.length > 0 &&
                                            filteredAndSortedRows.length === 0 && (
                                                <tr>
                                                    <td
                                                        colSpan={
                                                            2 +
                                                            policyOutputProperties.length +
                                                            (sortMode === "order" ? 1 : 0)
                                                        }
                                                        className="py-12 text-center text-slate-400 text-sm"
                                                    >
                                                        {t("commission.results.noSearchResults")}
                                                    </td>
                                                </tr>
                                            )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </div>
            </main>
        </div>
    )
}
