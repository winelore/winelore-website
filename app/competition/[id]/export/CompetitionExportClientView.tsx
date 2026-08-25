"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import {
    ArrowLeft,
    Download,
    FileSpreadsheet,
    FileText,
    Trophy,
    Wine,
    Users,
    MessageSquare,
    Award,
    Loader2,
    Printer,
    RefreshCw,
    Search,
    CheckSquare,
    Square,
    ChevronRight,
    Layers
} from "lucide-react"

import { AppHeader } from "@/components/AppHeader"
import { useTranslation } from "@/lib/i18n/context"
import { useUsernames } from "@/hooks/useUsernames"
import { getCompetitionExportDataAction } from "./actions"
import {
    downloadCompetitionResultsXlsx,
    buildCompetitionResultsCsv,
    type CompetitionExportContext,
    type CompetitionOverviewRow,
    type CommissionSummaryRow,
    type CompetitionExpertScoreRow,
    type CompetitionCommentRow,
    type CompetitionAwardRow,
} from "./exportCompetitionResults"
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

export default function CompetitionExportClientView({
    initialData,
    serverAuid,
}: {
    initialData: CompetitionData
    serverAuid?: number | null
}) {
    const { t, locale, formatStatus, formatBeverageType } = useTranslation()
    const router = useRouter()
    const [currentAuid, setCurrentAuid] = useState<number | null>(serverAuid || null)
    
    // Commission selection state
    const [selectedCommissionIds, setSelectedCommissionIds] = useState<string[]>(
        initialData.commissions.map((c) => c.id)
    )

    // Data fetching and progress states
    const [isLoadingData, setIsLoadingData] = useState(false)
    const [loadingProgress, setLoadingProgress] = useState("")
    const [exportProgress, setExportProgress] = useState("")
    const [isExporting, setIsExporting] = useState(false)

    // Aggregated export context state
    const [exportContext, setExportContext] = useState<CompetitionExportContext | null>(null)
    
    // UI state
    const [activePreviewTab, setActivePreviewTab] = useState<"overview" | "commissions" | "expertScores" | "comments" | "awards">("overview")
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        const cookieAuid = Cookies.get("auid")
        if (cookieAuid) {
            setCurrentAuid(parseInt(cookieAuid, 10))
        }
    }, [])

    // Collect all producer AUIDs to resolve names
    const allProducerAuids = useMemo(() => {
        if (!exportContext) return []
        const set = new Set<string>()
        exportContext.overviewRows.forEach((r) => {
            if (r.producer && !isNaN(Number(r.producer))) set.add(r.producer)
        })
        return Array.from(set)
    }, [exportContext])

    const { usernames } = useUsernames(allProducerAuids)

    const resolveProducerName = (producerStr: string) => {
        if (!producerStr) return t("commission.results.unknownProducer")
        if (usernames[producerStr]) return usernames[producerStr]
        return producerStr
    }

    // Toggle single commission
    const toggleCommission = (id: string) => {
        setSelectedCommissionIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        )
    }

    // Toggle all commissions
    const toggleSelectAllCommissions = () => {
        if (selectedCommissionIds.length === initialData.commissions.length) {
            setSelectedCommissionIds([])
        } else {
            setSelectedCommissionIds(initialData.commissions.map((c) => c.id))
        }
    }

    // Load multi-commission export data via Server Action
    const loadExportData = async () => {
        if (selectedCommissionIds.length === 0) {
            alert(t("competition.selectCommissionsToExport"))
            return
        }

        setIsLoadingData(true)
        setLoadingProgress(t("competition.preparingExport"))

        try {
            const targetCommissions = initialData.commissions
                .filter((c) => selectedCommissionIds.includes(c.id))
                .map((c) => ({ id: c.id, name: c.name, status: c.status }))

            const context = await getCompetitionExportDataAction(
                targetCommissions,
                initialData.name,
                locale as "en" | "uk" | "hu"
            )

            setExportContext(context)
        } catch (err: any) {
            console.error("Failed to load export data:", err)
            alert(err.message || "Failed to load competition export data")
        } finally {
            setIsLoadingData(false)
            setLoadingProgress("")
        }
    }

    // Load data on mount when component renders
    useEffect(() => {
        if (selectedCommissionIds.length > 0) {
            void loadExportData()
        }
    }, [])

    // Filter overview rows based on search query
    const filteredOverviewRows = useMemo(() => {
        if (!exportContext) return []
        if (!searchQuery.trim()) return exportContext.overviewRows

        const query = searchQuery.toLowerCase().trim()
        return exportContext.overviewRows.filter(
            (row) =>
                row.code.toLowerCase().includes(query) ||
                row.beverage.toLowerCase().includes(query) ||
                row.commissionName.toLowerCase().includes(query) ||
                resolveProducerName(row.producer).toLowerCase().includes(query)
        )
    }, [exportContext, searchQuery, usernames])

    // Trigger Excel Download
    const handleExportExcel = async () => {
        if (!exportContext) return
        setIsExporting(true)
        setExportProgress("Generating Excel file...")
        try {
            const filename = `${sanitizeFilename(initialData.name)}-competition-results.xlsx`
            await downloadCompetitionResultsXlsx(exportContext, filename)
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
        if (!exportContext) return
        try {
            const csv = buildCompetitionResultsCsv(exportContext)
            const filename = `${sanitizeFilename(initialData.name)}-competition-results.csv`
            downloadCsv(csv, filename)
        } catch (err: any) {
            console.error("CSV export error:", err)
            alert(err.message || "Failed to export CSV file")
        }
    }

    // Trigger Print
    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="flex min-h-screen flex-col bg-slate-50/50">
            <AppHeader activeTab="competitions" />

            <main className="flex-1 p-4 md:p-8 flex flex-col items-center">
                {/* Back Link */}
                <div className="w-full max-w-7xl mb-4 flex justify-start print:hidden">
                    <Link
                        href={`/competition/${initialData.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t("commission.backToCompetition")}
                    </Link>
                </div>

                <div className="w-full max-w-7xl space-y-6">
                    {/* Header Card */}
                    <div className="relative overflow-hidden bg-white border border-slate-100 rounded-[32px] p-6 md:p-8 shadow-xl shadow-slate-200/50">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            <div className="flex items-start gap-4">
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
                                    <Trophy className="h-8 w-8" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-bold tracking-widest uppercase text-slate-400">
                                            {initialData.series?.name || t("competition.panel")}
                                        </span>
                                        <span className="text-slate-300">•</span>
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                                            {formatStatus(initialData.status)}
                                        </span>
                                    </div>
                                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
                                        {initialData.name} - {t("competition.exportTitle")}
                                    </h1>
                                    <p className="text-xs md:text-sm text-slate-500">
                                        {t("competition.exportSubtitle")}
                                    </p>
                                </div>
                            </div>

                            {/* Export Actions Bar */}
                            <div className="flex items-center gap-2.5 flex-wrap shrink-0 print:hidden">
                                <button
                                    onClick={handleExportExcel}
                                    disabled={!exportContext || isLoadingData || isExporting}
                                    className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                    {isExporting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <FileSpreadsheet className="w-4 h-4" />
                                    )}
                                    <span>{t("competition.exportExcel")}</span>
                                </button>

                                <button
                                    onClick={handleExportCsv}
                                    disabled={!exportContext || isLoadingData || isExporting}
                                    className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                    <FileText className="w-4 h-4 text-emerald-600" />
                                    <span>{t("competition.exportCsv")}</span>
                                </button>

                                <button
                                    onClick={handlePrint}
                                    disabled={!exportContext || isLoadingData}
                                    className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2.5 text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                    <Printer className="w-4 h-4 text-slate-500" />
                                    <span className="hidden sm:inline">{t("commission.results.print")}</span>
                                </button>

                                <button
                                    onClick={() => void loadExportData()}
                                    disabled={isLoadingData}
                                    className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                    title="Reload Data"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isLoadingData ? "animate-spin" : ""}`} />
                                </button>
                            </div>
                        </div>

                        {/* Progress Bar Banner */}
                        {(isLoadingData || isExporting) && (
                            <div className="mt-6 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center gap-3 text-indigo-700 text-xs font-semibold animate-pulse">
                                <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                                <span>{loadingProgress || exportProgress || t("competition.preparingExport")}</span>
                            </div>
                        )}
                    </div>

                    {/* Stats Grid */}
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
                                    {selectedCommissionIds.length} / {initialData.commissions.length}
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
                                    {exportContext ? exportContext.overviewRows.length : "-"}
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
                                    {exportContext ? exportContext.expertScoreRows.length : "-"}
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
                                    {exportContext ? exportContext.awardRows.length : "-"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Commission Selection Panel */}
                    <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50 print:hidden">
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <Wine className="w-4 h-4 text-indigo-500" />
                                    {t("competition.selectCommissionsToExport")}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {t("competition.commissionsSubtitle")}
                                </p>
                            </div>

                            <button
                                onClick={toggleSelectAllCommissions}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                            >
                                {selectedCommissionIds.length === initialData.commissions.length ? (
                                    <CheckSquare className="w-4 h-4" />
                                ) : (
                                    <Square className="w-4 h-4" />
                                )}
                                <span>{t("competition.exportAllCommissions")}</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {initialData.commissions.map((comm) => {
                                const isSelected = selectedCommissionIds.includes(comm.id)
                                return (
                                    <div
                                        key={comm.id}
                                        onClick={() => toggleCommission(comm.id)}
                                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                                            isSelected
                                                ? "bg-indigo-50/40 border-indigo-200 ring-2 ring-indigo-500/10"
                                                : "bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/60"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {isSelected ? (
                                                <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                                            ) : (
                                                <Square className="w-4 h-4 text-slate-400 shrink-0" />
                                            )}
                                            <span className="text-xs font-bold text-slate-800 truncate">
                                                {comm.name}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 shrink-0">
                                            {formatStatus(comm.status)}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Data Preview Card */}
                    <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50">
                        {/* Tabs & Search Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                                <button
                                    onClick={() => setActivePreviewTab("overview")}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                        activePreviewTab === "overview"
                                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    Overview ({exportContext ? exportContext.overviewRows.length : 0})
                                </button>
                                <button
                                    onClick={() => setActivePreviewTab("commissions")}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                        activePreviewTab === "commissions"
                                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    {t("competition.commissionsBreakdown")} ({exportContext ? exportContext.commissionSummaryRows.length : 0})
                                </button>
                                <button
                                    onClick={() => setActivePreviewTab("expertScores")}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                        activePreviewTab === "expertScores"
                                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    Expert Scores ({exportContext ? exportContext.expertScoreRows.length : 0})
                                </button>
                                <button
                                    onClick={() => setActivePreviewTab("comments")}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                        activePreviewTab === "comments"
                                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    Comments ({exportContext ? exportContext.commentRows.length : 0})
                                </button>
                                <button
                                    onClick={() => setActivePreviewTab("awards")}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                        activePreviewTab === "awards"
                                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    Awards ({exportContext ? exportContext.awardRows.length : 0})
                                </button>
                            </div>

                            {activePreviewTab === "overview" && (
                                <div className="relative w-full sm:w-64 shrink-0">
                                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search candidate / beverage..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Content Area */}
                        {isLoadingData ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                <span className="text-xs font-semibold">{loadingProgress || "Loading competition data..."}</span>
                            </div>
                        ) : !exportContext ? (
                            <div className="text-center py-16 text-slate-400 text-xs font-medium">
                                No export data loaded. Select commissions above and click Reload.
                            </div>
                        ) : (
                            <>
                                {/* TAB 1: OVERVIEW TABLE */}
                                {activePreviewTab === "overview" && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                                    <th className="p-3">Commission</th>
                                                    <th className="p-3">Code</th>
                                                    <th className="p-3">Beverage</th>
                                                    <th className="p-3">Type</th>
                                                    <th className="p-3">Producer</th>
                                                    {exportContext.outcomePropertyCodes.map((code) => (
                                                        <th key={code} className="p-3 text-center">
                                                            {exportContext.outcomePropertyNames[code] ?? code}
                                                        </th>
                                                    ))}
                                                    <th className="p-3">Awards</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                                {filteredOverviewRows.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6 + exportContext.outcomePropertyCodes.length} className="p-8 text-center text-slate-400">
                                                            No matching candidates found.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredOverviewRows.map((row, i) => (
                                                        <tr key={`${row.commissionName}-${row.candidateId}-${i}`} className="hover:bg-slate-50/60 transition-colors">
                                                            <td className="p-3 font-semibold text-indigo-600">{row.commissionName}</td>
                                                            <td className="p-3 font-bold text-slate-900">{row.code}</td>
                                                            <td className="p-3 font-semibold text-slate-800">{row.beverage}</td>
                                                            <td className="p-3 text-slate-500">{row.beverageType}</td>
                                                            <td className="p-3 text-slate-600">{resolveProducerName(row.producer)}</td>
                                                            {exportContext.outcomePropertyCodes.map((code) => (
                                                                <td key={code} className="p-3 text-center font-bold text-slate-900">
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
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* TAB 2: COMMISSIONS SUMMARY */}
                                {activePreviewTab === "commissions" && (
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
                                                {exportContext.commissionSummaryRows.map((row) => (
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
                                {activePreviewTab === "expertScores" && (
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
                                                {exportContext.expertScoreRows.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="p-8 text-center text-slate-400">
                                                            No individual expert scores available.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    exportContext.expertScoreRows.slice(0, 100).map((row, i) => (
                                                        <tr key={`score-${i}`} className="hover:bg-slate-50/60 transition-colors">
                                                            <td className="p-3 font-semibold text-indigo-600">{row.commissionName}</td>
                                                            <td className="p-3 font-bold text-slate-900">{row.code}</td>
                                                            <td className="p-3 font-semibold text-slate-800">{row.beverage}</td>
                                                            <td className="p-3 text-slate-600">{row.replicaName}</td>
                                                            <td className="p-3 text-slate-600">{resolveProducerName(row.evaluator)}</td>
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
                                        {exportContext.expertScoreRows.length > 100 && (
                                            <div className="p-3 text-center text-[10px] text-slate-400 font-semibold bg-slate-50 border-t border-slate-100">
                                                Showing first 100 entries in web preview. All {exportContext.expertScoreRows.length} entries included in full Excel download.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 4: COMMENTS */}
                                {activePreviewTab === "comments" && (
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
                                                {exportContext.commentRows.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="p-8 text-center text-slate-400">
                                                            No comments found.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    exportContext.commentRows.map((row, i) => (
                                                        <tr key={`comment-${i}`} className="hover:bg-slate-50/60 transition-colors">
                                                            <td className="p-3 font-semibold text-indigo-600">{row.commissionName}</td>
                                                            <td className="p-3 font-bold text-slate-900">{row.code}</td>
                                                            <td className="p-3 font-semibold text-slate-800">{row.beverage}</td>
                                                            <td className="p-3 text-slate-600">{resolveProducerName(row.evaluator)}</td>
                                                            <td className="p-3 font-semibold text-slate-500">{row.property}</td>
                                                            <td className="p-3 text-slate-800">{row.commentText || row.voiceUrl || "-"}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* TAB 5: AWARDS */}
                                {activePreviewTab === "awards" && (
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
                                                {exportContext.awardRows.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="p-8 text-center text-slate-400">
                                                            No awards registered for candidates.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    exportContext.awardRows.map((row, i) => (
                                                        <tr key={`award-${i}`} className="hover:bg-slate-50/60 transition-colors">
                                                            <td className="p-3 font-semibold text-indigo-600">{row.commissionName}</td>
                                                            <td className="p-3 font-bold text-slate-900">{row.code}</td>
                                                            <td className="p-3 font-semibold text-slate-800">{row.beverage}</td>
                                                            <td className="p-3 text-slate-600">{resolveProducerName(row.producer)}</td>
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
