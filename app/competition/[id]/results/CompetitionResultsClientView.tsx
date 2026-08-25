"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
    ArrowLeft,
    AlertTriangle,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    Download,
    FileSpreadsheet,
    FileText,
    Wine,
    Users,
    Award,
    Loader2,
    Printer,
    Search,
    Layers,
    Filter,
} from "lucide-react"

import { AppHeader } from "@/components/AppHeader"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTranslation } from "@/lib/i18n/context"
import { useUsernames } from "@/hooks/useUsernames"
import { MemberEvaluationSection } from "@/app/commission/EvaluationCommentsDisplay"
import { formatPropertyScoreValue } from "@/lib/formatPropertyScore"
import {
    calculateDeltaOutliers,
    formatSignedDiff,
    type DeltaOutlierInfo,
} from "@/lib/deltaOutliers"
import { parseEvaluationTotal } from "@/lib/evaluationTotals"
import { getCompetitionExportDataAction } from "../export/actions"
import {
    downloadCompetitionResultsXlsx,
    buildCompetitionResultsCsv,
    type CompetitionExportContext,
    type CompetitionCommentRow,
    type CompetitionExpertScoreRow,
} from "../export/exportCompetitionResults"
import { downloadCsv, sanitizeFilename } from "@/app/commission/[id]/results/exportResults"

interface CommissionMeta {
    id: string
    name: string
    status: string
    plannedStartAt: string | null
    plannedEndAt: string | null
    startedAt: string | null
    endedAt: string | null
    wineJumperMiniGameEnabled: boolean
    voiceCommentsEnabled: boolean
    propertyCommentsEnabled: boolean
    beverageOriginDuringEvaluationEnabled: boolean
}

interface CompetitionData {
    id: string
    name: string
    status: string
    startedAt: string | null
    plannedStartAt: string | null
    plannedEndAt: string | null
    endedAt: string | null
    series: {
        id: string
        name: string
        status: string
    }
    holders: number[]
    commissions: CommissionMeta[]
}

const AUTO_REFRESH_MS = 3000

export default function CompetitionResultsClientView({
    initialData,
    initialCommissionId,
}: {
    initialData: CompetitionData
    initialCommissionId?: string | null
}) {
    const { t, locale, formatStatus, formatReplicaType } = useTranslation()
    const router = useRouter()
    const pathname = usePathname()

    // Filter states
    const [selectedCommissionFilter, setSelectedCommissionFilter] = useState<string>(
        initialCommissionId || "ALL",
    )
    const [searchQuery, setSearchQuery] = useState("")

    // Data fetching and progress states
    const [isLoadingData, setIsLoadingData] = useState(true)
    const [loadingProgress, setLoadingProgress] = useState("")
    const [exportProgress, setExportProgress] = useState("")
    const [isExporting, setIsExporting] = useState(false)
    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null)

    // Expanded rows state for candidate details
    const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set())

    // Aggregated export/results context state
    const [allResultsContext, setAllResultsContext] = useState<CompetitionExportContext | null>(null)

    // Active Tab View
    const [activeTab, setActiveTab] = useState<"overview" | "commissions" | "expertScores" | "comments" | "awards">("overview")

    useEffect(() => {
        setSelectedCommissionFilter(initialCommissionId || "ALL")
    }, [initialCommissionId])

    const selectedCommission = useMemo(
        () => initialData.commissions.find((commission) => commission.id === selectedCommissionFilter) ?? null,
        [initialData.commissions, selectedCommissionFilter],
    )

    const resultsContext = useMemo((): CompetitionExportContext | null => {
        if (!allResultsContext || selectedCommissionFilter === "ALL") return allResultsContext

        const belongsToSelectedCommission = (row: { commissionId: string }) =>
            row.commissionId === selectedCommissionFilter
        const overviewRows = allResultsContext.overviewRows.filter(belongsToSelectedCommission)

        return {
            ...allResultsContext,
            overviewRows,
            commissionSummaryRows: allResultsContext.commissionSummaryRows.filter(belongsToSelectedCommission),
            expertScoreRows: allResultsContext.expertScoreRows.filter(belongsToSelectedCommission),
            commentRows: allResultsContext.commentRows.filter(belongsToSelectedCommission),
            awardRows: allResultsContext.awardRows.filter(belongsToSelectedCommission),
            outcomePropertyCodes: allResultsContext.outcomePropertyCodes.filter((code) =>
                overviewRows.some((row) => Object.prototype.hasOwnProperty.call(row.outcomes, code)),
            ),
        }
    }, [allResultsContext, selectedCommissionFilter])

    const handleCommissionFilterChange = (commissionId: string) => {
        setSelectedCommissionFilter(commissionId)

        const params = new URLSearchParams(window.location.search)
        if (commissionId === "ALL") {
            params.delete("commission")
        } else {
            params.set("commission", commissionId)
        }
        const query = params.toString()
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    }

    // Collect all evaluator/producer AUIDs to resolve names
    const allPersonAuids = useMemo(() => {
        if (!resultsContext) return []
        const set = new Set<string>()
        resultsContext.overviewRows.forEach((r) => {
            if (r.producer && !isNaN(Number(r.producer))) set.add(r.producer)
        })
        resultsContext.expertScoreRows.forEach((r) => {
            if (r.evaluator && !isNaN(Number(r.evaluator))) set.add(r.evaluator)
        })
        return Array.from(set)
    }, [resultsContext])

    const { usernames } = useUsernames(allPersonAuids)

    const resolvePersonName = (auidStr: string) => {
        if (!auidStr || auidStr === "-") return t("commission.results.unknownProducer")
        if (usernames[auidStr]) return usernames[auidStr]
        return auidStr
    }

    // Load results data on server action call
    const loadResultsData = async (isBackgroundRefresh = false) => {
        if (!isBackgroundRefresh) {
            setIsLoadingData(true)
            setLoadingProgress(t("competition.preparingExport"))
        }

        try {
            const targetCommissions = initialData.commissions.map((c) => ({
                id: c.id,
                name: c.name,
                status: c.status,
            }))

            const context = await getCompetitionExportDataAction(
                targetCommissions,
                initialData.name,
                locale as "en" | "uk" | "hu"
            )

            setAllResultsContext(context)
            setLastRefreshedAt(new Date())
        } catch (err: any) {
            console.error("[results] Failed to load competition results:", err)
            if (!isBackgroundRefresh) {
                alert(err.message || "Failed to load competition results data")
            }
        } finally {
            if (!isBackgroundRefresh) {
                setIsLoadingData(false)
                setLoadingProgress("")
            }
        }
    }

    useEffect(() => {
        void loadResultsData()
    }, [])

    // Auto-update every 3 seconds if competition is active/in progress (safely locked to prevent promise stacking)
    useEffect(() => {
        if (initialData.status === "COMPLETED") return

        let isMounted = true
        let isPolling = false

        const poll = async () => {
            if (!isMounted || isPolling) return
            isPolling = true
            try {
                await loadResultsData(true)
            } finally {
                isPolling = false
            }
        }

        const intervalId = setInterval(poll, AUTO_REFRESH_MS)
        return () => {
            isMounted = false
            clearInterval(intervalId)
        }
    }, [initialData.status])

    // Toggle expanded row for candidate details
    const toggleRowExpanded = (rowId: string) => {
        setExpandedRowIds((prev) => {
            const next = new Set(prev)
            if (next.has(rowId)) {
                next.delete(rowId)
            } else {
                next.add(rowId)
            }
            return next
        })
    }

    // Filter overview rows based on selected commission & search query
    const filteredOverviewRows = useMemo(() => {
        if (!resultsContext) return []
        let rows = resultsContext.overviewRows

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim()
            rows = rows.filter(
                (r) =>
                    r.code.toLowerCase().includes(q) ||
                    r.beverage.toLowerCase().includes(q) ||
                    r.commissionName.toLowerCase().includes(q) ||
                    resolvePersonName(r.producer).toLowerCase().includes(q)
            )
        }

        return rows
    }, [resultsContext, searchQuery, usernames])

    // Trigger Excel Download
    const handleExportExcel = async () => {
        if (!resultsContext) return
        setIsExporting(true)
        setExportProgress("Generating Excel file...")
        try {
            const filename = `${sanitizeFilename(selectedCommission?.name || initialData.name)}-results.xlsx`
            await downloadCompetitionResultsXlsx(resultsContext, filename)
        } catch (err: any) {
            console.error("Excel export error:", err)
            alert(err.message || "Failed to export Excel file")
        } finally {
            setIsExporting(false)
            setExportProgress("")
        }
    }

    // Trigger CSV Download
    const handleExportCsv = () => {
        if (!resultsContext) return
        try {
            const csv = buildCompetitionResultsCsv(resultsContext)
            const filename = `${sanitizeFilename(selectedCommission?.name || initialData.name)}-results.csv`
            downloadCsv(csv, filename)
        } catch (err: any) {
            console.error("CSV export error:", err)
            alert(err.message || "Failed to export CSV file")
        }
    }

    const handlePrint = () => {
        window.print()
    }

    const resultsScopeName = selectedCommission?.name || initialData.name
    const resultsScopeStatus = selectedCommission?.status || initialData.status
    const isResultsComplete = resultsScopeStatus === "COMPLETED"

    const toEvaluation = (
        scoreRow: CompetitionExpertScoreRow,
        comments: CompetitionCommentRow[],
    ) => ({
        scores: Object.entries(scoreRow.scores).map(([code, value]) => ({ code, value })),
        comments: comments
            .filter((comment) => comment.evaluationId === scoreRow.evaluationId)
            .map((comment) => ({
                id: comment.commentId,
                text: comment.commentText,
                voiceUrl: comment.voiceUrl || null,
                propertyId: comment.property === "General" ? null : comment.property,
            })),
    })

    const buildOutlierMap = (scoreRows: CompetitionExpertScoreRow[]) => {
        const result = new Map<CompetitionExpertScoreRow, DeltaOutlierInfo>()
        const rowsByReplica = new Map<string, CompetitionExpertScoreRow[]>()

        scoreRows.forEach((scoreRow) => {
            const replicaRows = rowsByReplica.get(scoreRow.replicaId) || []
            replicaRows.push(scoreRow)
            rowsByReplica.set(scoreRow.replicaId, replicaRows)
        })

        rowsByReplica.forEach((replicaRows) => {
            const replicaOutliers = calculateDeltaOutliers(replicaRows, (scoreRow) =>
                parseEvaluationTotal(
                    Object.entries(scoreRow.scores).map(([code, value]) => ({ code, value })),
                    resultsContext?.propertyMap,
                ),
            )
            replicaOutliers.forEach((info, scoreRow) => result.set(scoreRow, info))
        })

        return result
    }

    function ReplicaTypeBadge({ type }: { type: string }) {
        const isTrainee = type === "TRAINEE"
        return (
            <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                isTrainee
                    ? "bg-amber-100 text-amber-700"
                    : "bg-indigo-100 text-indigo-700"
            }`}>
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
                    <div className="flex flex-col gap-4 print:hidden">
                        <Link
                            href={selectedCommission ? `/commission/${selectedCommission.id}` : `/competition/${initialData.id}`}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors w-fit"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            {selectedCommission
                                ? t("commission.backToCommission")
                                : t("commission.backToCompetition")}
                        </Link>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
                                    {t("commission.results.pageTitle", { name: resultsScopeName })}
                                </h1>
                                <span className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${
                                    isResultsComplete
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-amber-100 text-amber-700"
                                }`}>
                                    {isResultsComplete
                                        ? t("commission.results.statusCompleted")
                                        : t("commission.results.statusInProgress")}
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            disabled={!resultsContext || isLoadingData || isExporting}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {isExporting ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Download className="w-4 h-4" />
                                            )}
                                            {isExporting ? (
                                                <span>{exportProgress || t("competition.preparingExport")}</span>
                                            ) : (
                                                <span>{t("commission.results.export")}</span>
                                            )}
                                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem
                                            className="cursor-pointer font-semibold text-xs py-2"
                                            onClick={() => void handleExportExcel()}
                                        >
                                            <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
                                            {t("commission.results.exportXlsx")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="cursor-pointer font-semibold text-xs py-2"
                                            onClick={handleExportCsv}
                                        >
                                            <FileText className="w-4 h-4 mr-2 text-indigo-600" />
                                            {t("commission.results.exportCsv")}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <button
                                    type="button"
                                    onClick={handlePrint}
                                    disabled={!resultsContext || isLoadingData}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <Printer className="w-4 h-4" />
                                    <span>{t("commission.results.print")}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <h1 className="hidden print:block text-2xl font-bold text-slate-800 mb-4">
                        {t("commission.results.pageTitle", { name: resultsScopeName })}
                    </h1>

                    <div className={`rounded-2xl px-5 py-4 border flex items-start gap-3 print:hidden ${
                        isResultsComplete
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-indigo-50 border-indigo-200"
                    }`}>
                        {isResultsComplete ? (
                            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                            <Loader2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5 animate-spin" />
                        )}
                        <div>
                            <p className={`text-sm font-bold ${isResultsComplete ? "text-emerald-800" : "text-indigo-900"}`}>
                                {t("competition.totalCandidates")}: {resultsContext?.overviewRows.length ?? "–"} · {t("competition.totalEvaluations")}: {resultsContext?.expertScoreRows.length ?? "–"}
                            </p>
                            <p className={`text-xs mt-0.5 ${isResultsComplete ? "text-emerald-600" : "text-indigo-600"}`}>
                                {isResultsComplete
                                    ? t("commission.results.progressFinal")
                                    : t("commission.results.progressNote")}
                            </p>
                        </div>
                    </div>

                    {lastRefreshedAt && (
                        <p className="text-xs text-slate-400 print:hidden">
                            {t("commission.results.autoRefresh")} · {t("commission.results.lastUpdated", {
                                time: lastRefreshedAt.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                }),
                            })}
                        </p>
                    )}

                    {(isLoadingData || isExporting) && (
                        <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center gap-3 text-indigo-700 text-xs font-semibold animate-pulse print:hidden">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                            <span>{loadingProgress || exportProgress || t("competition.preparingExport")}</span>
                        </div>
                    )}

                    {/* Stats Metrics Bar */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xl shadow-slate-200/50 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                                <Wine className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {t("competition.totalCommissions")}
                                </span>
                                <p className="text-2xl font-extrabold text-slate-800">
                                    {resultsContext ? resultsContext.commissionSummaryRows.length : "-"}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xl shadow-slate-200/50 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                                <Layers className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {t("competition.totalCandidates")}
                                </span>
                                <p className="text-2xl font-extrabold text-slate-800">
                                    {resultsContext ? resultsContext.overviewRows.length : "-"}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xl shadow-slate-200/50 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 border border-violet-100">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {t("competition.totalEvaluations")}
                                </span>
                                <p className="text-2xl font-extrabold text-slate-800">
                                    {resultsContext ? resultsContext.expertScoreRows.length : "-"}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xl shadow-slate-200/50 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                                <Award className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {t("competition.totalAwards")}
                                </span>
                                <p className="text-2xl font-extrabold text-slate-800">
                                    {resultsContext ? resultsContext.awardRows.length : "-"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Main Results Table & View Container */}
                    <div className="bg-white border border-slate-100 rounded-[32px] p-6 md:p-8 shadow-xl shadow-slate-200/50 space-y-6">
                        {/* Filters & Tabs Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                            {/* View Switcher Tabs */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                                <button
                                    onClick={() => setActiveTab("overview")}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                        activeTab === "overview"
                                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    {t("commission.results.finalOverview")} ({resultsContext ? filteredOverviewRows.length : 0})
                                </button>
                                <button
                                    onClick={() => setActiveTab("commissions")}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                        activeTab === "commissions"
                                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    {t("competition.commissionsBreakdown")} ({resultsContext ? resultsContext.commissionSummaryRows.length : 0})
                                </button>
                                <button
                                    onClick={() => setActiveTab("expertScores")}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                        activeTab === "expertScores"
                                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    Expert Scores ({resultsContext ? resultsContext.expertScoreRows.length : 0})
                                </button>
                                <button
                                    onClick={() => setActiveTab("comments")}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                        activeTab === "comments"
                                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    Comments ({resultsContext ? resultsContext.commentRows.length : 0})
                                </button>
                                <button
                                    onClick={() => setActiveTab("awards")}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                        activeTab === "awards"
                                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    {t("commission.results.awards")} ({resultsContext ? resultsContext.awardRows.length : 0})
                                </button>
                            </div>

                            {/* Search & Commission Selector */}
                            <div className="flex items-center gap-3 flex-wrap">
                                {/* Commission Selector Filter */}
                                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                                    <select
                                        value={selectedCommissionFilter}
                                        onChange={(e) => handleCommissionFilterChange(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                                    >
                                        <option value="ALL">{t("competition.exportAllCommissions")}</option>
                                        {initialData.commissions.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Search Bar */}
                                <div className="relative w-full sm:w-56 shrink-0">
                                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder={t("commission.results.searchPlaceholder")}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Content Area */}
                        {isLoadingData ? (
                            <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                <span className="text-xs font-semibold">{loadingProgress || t("competition.preparingExport")}</span>
                            </div>
                        ) : !resultsContext ? (
                            <div className="text-center py-16 text-slate-400 text-xs font-medium">
                                No competition results available.
                            </div>
                        ) : (
                            <>
                                {/* TAB 1: FINAL OVERVIEW TABLE (Matching Commission Results Page) */}
                                {activeTab === "overview" && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                                    <th className="p-3 w-8"></th>
                                                    <th className="p-3">{t("commission.results.rank")}</th>
                                                    <th className="p-3">Commission</th>
                                                    <th className="p-3">{t("commission.results.candidateCode")}</th>
                                                    <th className="p-3">{t("commission.results.codeBeverage")}</th>
                                                    <th className="p-3">Type</th>
                                                    <th className="p-3">{t("commission.results.producer")}</th>
                                                    {resultsContext.outcomePropertyCodes.map((code) => (
                                                        <th key={code} className="p-3 text-center">
                                                            {resultsContext.outcomePropertyNames[code] ?? code}
                                                        </th>
                                                    ))}
                                                    <th className="p-3">{t("commission.results.awards")}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                                {filteredOverviewRows.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={8 + resultsContext.outcomePropertyCodes.length} className="p-8 text-center text-slate-400">
                                                            No matching candidates found.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredOverviewRows.map((row, idx) => {
                                                        const rowKey = `${row.commissionId}-${row.candidateId}-${idx}`
                                                        const isExpanded = expandedRowIds.has(rowKey)

                                                        // Find matching expert score rows for detail drawer
                                                        const rowScores = resultsContext.expertScoreRows.filter(
                                                            (s) => s.commissionId === row.commissionId && s.code === row.code
                                                        )
                                                        const rowComments = resultsContext.commentRows.filter(
                                                            (c) => c.commissionId === row.commissionId && c.code === row.code
                                                        )
                                                        const outlierMap = buildOutlierMap(rowScores)
                                                        const commissionSettings = initialData.commissions.find(
                                                            (commission) => commission.id === row.commissionId,
                                                        )

                                                        return (
                                                            <React.Fragment key={rowKey}>
                                                                <tr
                                                                    onClick={() => toggleRowExpanded(rowKey)}
                                                                    className={`cursor-pointer transition-colors ${
                                                                        isExpanded ? "bg-indigo-50/30" : "hover:bg-slate-50/60"
                                                                    }`}
                                                                >
                                                                    <td className="p-3 text-slate-400">
                                                                        {isExpanded ? (
                                                                            <ChevronDown className="w-4 h-4 text-indigo-600" />
                                                                        ) : (
                                                                            <ChevronRight className="w-4 h-4" />
                                                                        )}
                                                                    </td>
                                                                    <td className="p-3 font-extrabold text-slate-400 text-xs">
                                                                        #{idx + 1}
                                                                    </td>
                                                                    <td className="p-3 font-bold text-indigo-600">
                                                                        {row.commissionName}
                                                                    </td>
                                                                    <td className="p-3 font-extrabold text-slate-900">
                                                                        {row.code}
                                                                    </td>
                                                                    <td className="p-3">
                                                                        <div className="flex flex-col">
                                                                            <span className="font-bold text-slate-800 text-sm leading-snug">
                                                                                {row.beverage}
                                                                            </span>
                                                                            <span className="text-[10px] text-slate-400">
                                                                                {[row.wineType !== "-" && row.wineType, row.vintage !== "-" && row.vintage, row.volume !== "-" && row.volume].filter(Boolean).join(" • ")}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 text-slate-500 font-semibold">{row.beverageType}</td>
                                                                    <td className="p-3 text-slate-600">{resolvePersonName(row.producer)}</td>
                                                                    {resultsContext.outcomePropertyCodes.map((code) => (
                                                                        <td key={code} className="p-3 text-center font-extrabold text-slate-900 text-sm">
                                                                            {row.outcomes[code] ?? "-"}
                                                                        </td>
                                                                    ))}
                                                                    <td className="p-3">
                                                                        {row.awards !== "-" ? (
                                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                                                <Award className="w-3 h-3 text-amber-500" />
                                                                                {row.awards}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-slate-400 text-[10px]">-</span>
                                                                        )}
                                                                    </td>
                                                                </tr>

                                                                {/* Expanded expert evaluation cards */}
                                                                {isExpanded && (
                                                                    <tr className="bg-slate-50/80">
                                                                        <td colSpan={8 + resultsContext.outcomePropertyCodes.length} className="p-0 border-b border-slate-200 shadow-inner">
                                                                            <div className="p-6">
                                                                                <h4 className="text-sm font-bold text-slate-700 mb-4">
                                                                                    {t("commission.results.expertBreakdown")}
                                                                                </h4>
                                                                                {rowScores.length > 0 ? (
                                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                                        {rowScores.map((scoreRow) => {
                                                                                            const evaluation = toEvaluation(scoreRow, rowComments)
                                                                                            const outlierInfo = outlierMap.get(scoreRow)
                                                                                            const resultScores = evaluation.scores.filter(
                                                                                                (score) => resultsContext.propertyMap[score.code]?.isResult,
                                                                                            )
                                                                                            const booleanLabels = {
                                                                                                yesLabel: t("common.yes"),
                                                                                                noLabel: t("common.no"),
                                                                                            }

                                                                                            return (
                                                                                                <div
                                                                                                    key={scoreRow.evaluationId}
                                                                                                    className={`p-4 rounded-xl shadow-sm flex flex-col transition-all ${
                                                                                                        outlierInfo?.isOutlier
                                                                                                            ? "bg-amber-50/90 border-2 border-amber-300 shadow-amber-100/50"
                                                                                                            : "bg-white border border-slate-200"
                                                                                                    }`}
                                                                                                >
                                                                                                    <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                                                                                                        <div className="flex flex-col gap-1">
                                                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                                                <span className="text-xs font-bold text-slate-500 uppercase">
                                                                                                                    {scoreRow.replicaName}
                                                                                                                </span>
                                                                                                                <ReplicaTypeBadge type={scoreRow.replicaType} />
                                                                                                                {outlierInfo?.isOutlier && (
                                                                                                                    <span
                                                                                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs"
                                                                                                                        title={t("commission.results.outOfDeltaTooltip", {
                                                                                                                            score: outlierInfo.totalScore ?? "-",
                                                                                                                            diff: formatSignedDiff(outlierInfo.signedDiff),
                                                                                                                            avg: outlierInfo.preAvg != null ? outlierInfo.preAvg.toFixed(1) : "-",
                                                                                                                            threshold: outlierInfo.threshold,
                                                                                                                        })}
                                                                                                                    >
                                                                                                                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                                                                                                        <span>{t("commission.results.outOfDelta")}</span>
                                                                                                                        {outlierInfo.signedDiff != null && (
                                                                                                                            <span className="opacity-90 font-mono">
                                                                                                                                ({formatSignedDiff(outlierInfo.signedDiff)})
                                                                                                                            </span>
                                                                                                                        )}
                                                                                                                    </span>
                                                                                                                )}
                                                                                                            </div>
                                                                                                            <span className="text-xs text-slate-600 font-semibold">
                                                                                                                {resolvePersonName(scoreRow.evaluator)}
                                                                                                            </span>
                                                                                                        </div>
                                                                                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                                                                                            {resultScores.length === 1 ? (
                                                                                                                <div className={`text-xl font-black px-2 py-1 rounded-lg shrink-0 ${
                                                                                                                    outlierInfo?.isOutlier
                                                                                                                        ? "text-amber-800 bg-amber-100/90 border border-amber-300"
                                                                                                                        : "text-indigo-600 bg-indigo-50"
                                                                                                                }`}>
                                                                                                                    {formatPropertyScoreValue(
                                                                                                                        resultScores[0].value,
                                                                                                                        resultsContext.propertyMap[resultScores[0].code],
                                                                                                                        booleanLabels,
                                                                                                                    )}
                                                                                                                </div>
                                                                                                            ) : resultScores.length > 1 ? (
                                                                                                                resultScores.map((score) => (
                                                                                                                    <div
                                                                                                                        key={score.code}
                                                                                                                        className={`text-xs font-extrabold px-2 py-0.5 rounded-lg whitespace-nowrap ${
                                                                                                                            outlierInfo?.isOutlier
                                                                                                                                ? "text-amber-800 bg-amber-100/90 border border-amber-300"
                                                                                                                                : "text-indigo-600 bg-indigo-50"
                                                                                                                        }`}
                                                                                                                    >
                                                                                                                        {resultsContext.propertyMap[score.code]?.name ?? score.code}: {formatPropertyScoreValue(
                                                                                                                            score.value,
                                                                                                                            resultsContext.propertyMap[score.code],
                                                                                                                            booleanLabels,
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                ))
                                                                                                            ) : (
                                                                                                                <div className="text-xl font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-lg shrink-0">
                                                                                                                    -
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <MemberEvaluationSection
                                                                                                        evaluation={evaluation}
                                                                                                        propertyMap={resultsContext.propertyMap}
                                                                                                        accent="indigo"
                                                                                                        propertyCommentsEnabled={commissionSettings?.propertyCommentsEnabled ?? false}
                                                                                                        voiceCommentsEnabled={commissionSettings?.voiceCommentsEnabled ?? false}
                                                                                                    />
                                                                                                </div>
                                                                                            )
                                                                                        })}
                                                                                    </div>
                                                                                ) : (
                                                                                    <p className="text-sm text-slate-500 italic">
                                                                                        {t("commission.results.noEvaluationsYet")}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </React.Fragment>
                                                        )
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* TAB 2: COMMISSIONS BREAKDOWN */}
                                {activeTab === "commissions" && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                                    <th className="p-3">Commission Name</th>
                                                    <th className="p-3">Status</th>
                                                    <th className="p-3 text-center">Candidates Count</th>
                                                    <th className="p-3 text-center">Replicas Count</th>
                                                    <th className="p-3 text-center">Awards Granted</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                                {resultsContext.commissionSummaryRows.map((row) => (
                                                    <tr key={row.commissionId} className="hover:bg-slate-50/60 transition-colors">
                                                        <td className="p-3 font-bold text-slate-800">{row.commissionName}</td>
                                                        <td className="p-3">
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                                {formatStatus(row.status)}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-center font-bold text-slate-900">{row.candidateCount}</td>
                                                        <td className="p-3 text-center font-semibold text-slate-600">{row.replicaCount}</td>
                                                        <td className="p-3 text-center font-bold text-amber-600">{row.awardsCount}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* TAB 3: EXPERT SCORES */}
                                {activeTab === "expertScores" && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                                    <th className="p-3">Commission</th>
                                                    <th className="p-3">Code</th>
                                                    <th className="p-3">Beverage</th>
                                                    <th className="p-3">Replica</th>
                                                    <th className="p-3">Evaluator</th>
                                                    <th className="p-3">Scores Overview</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                                {resultsContext.expertScoreRows.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="p-8 text-center text-slate-400">
                                                            No individual expert scores available.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    resultsContext.expertScoreRows.slice(0, 100).map((row, i) => (
                                                        <tr key={`score-${i}`} className="hover:bg-slate-50/60 transition-colors">
                                                            <td className="p-3 font-semibold text-indigo-600">{row.commissionName}</td>
                                                            <td className="p-3 font-bold text-slate-900">{row.code}</td>
                                                            <td className="p-3 font-semibold text-slate-800">{row.beverage}</td>
                                                            <td className="p-3 text-slate-600">{row.replicaName}</td>
                                                            <td className="p-3 text-slate-600">{resolvePersonName(row.evaluator)}</td>
                                                            <td className="p-3">
                                                                <div className="flex flex-wrap gap-1">
                                                                    {Object.entries(row.scores).map(([k, v]) => (
                                                                        <span key={k} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono">
                                                                            {k}: {v}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                        {resultsContext.expertScoreRows.length > 100 && (
                                            <div className="p-3 text-center text-[10px] text-slate-400 font-semibold bg-slate-50 border-t border-slate-100">
                                                Showing first 100 entries in web preview. All {resultsContext.expertScoreRows.length} entries included in full Excel download.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 4: COMMENTS */}
                                {activeTab === "comments" && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                                    <th className="p-3">Commission</th>
                                                    <th className="p-3">Code</th>
                                                    <th className="p-3">Beverage</th>
                                                    <th className="p-3">Evaluator</th>
                                                    <th className="p-3">Property</th>
                                                    <th className="p-3">Comment Text</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                                {resultsContext.commentRows.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="p-8 text-center text-slate-400">
                                                            No comments found.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    resultsContext.commentRows.map((row, i) => (
                                                        <tr key={`comment-${i}`} className="hover:bg-slate-50/60 transition-colors">
                                                            <td className="p-3 font-semibold text-indigo-600">{row.commissionName}</td>
                                                            <td className="p-3 font-bold text-slate-900">{row.code}</td>
                                                            <td className="p-3 font-semibold text-slate-800">{row.beverage}</td>
                                                            <td className="p-3 text-slate-600">{resolvePersonName(row.evaluator)}</td>
                                                            <td className="p-3 font-semibold text-slate-500">{row.property}</td>
                                                            <td className="p-3 text-slate-800">
                                                                {row.commentText && <div>{row.commentText}</div>}
                                                                {row.voiceUrl && (
                                                                    <audio controls src={row.voiceUrl} className="h-8 w-full max-w-xs mt-1" />
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* TAB 5: AWARDS */}
                                {activeTab === "awards" && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                                    <th className="p-3">Commission</th>
                                                    <th className="p-3">Code</th>
                                                    <th className="p-3">Beverage</th>
                                                    <th className="p-3">Producer</th>
                                                    <th className="p-3">Award Name</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                                {resultsContext.awardRows.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="p-8 text-center text-slate-400">
                                                            No awards registered for candidates.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    resultsContext.awardRows.map((row, i) => (
                                                        <tr key={`award-${i}`} className="hover:bg-slate-50/60 transition-colors">
                                                            <td className="p-3 font-semibold text-indigo-600">{row.commissionName}</td>
                                                            <td className="p-3 font-bold text-slate-900">{row.code}</td>
                                                            <td className="p-3 font-semibold text-slate-800">{row.beverage}</td>
                                                            <td className="p-3 text-slate-600">{resolvePersonName(row.producer)}</td>
                                                            <td className="p-3 font-bold text-amber-600 flex items-center gap-1.5">
                                                                <Award className="w-4 h-4 text-amber-500" />
                                                                {row.awardName}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
