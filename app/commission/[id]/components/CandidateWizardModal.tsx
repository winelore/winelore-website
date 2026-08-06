"use client"

import React, { useState, useEffect } from "react"
import {
    X,
    Search,
    Wine,
    Boxes,
    FlaskConical,
    Tag,
    ChevronRight,
    ChevronLeft,
    Check,
    AlertCircle,
    Loader2,
    Plus
} from "lucide-react"
import {
    searchBeveragesAction,
    getBatchesForBeverageAction,
    getSamplesForBatchAction,
    addCommissionCandidateAction
} from "../../actions"
import { useTranslation } from "@/lib/i18n/context"

interface BeverageItem {
    id: string
    name: string
}

interface BatchItem {
    id: string
    lotNumber?: string | null
    volumeMl?: number | null
    createdAt?: string | null
    attributes?: string | null
}

interface SampleItem {
    id: string
    volumeMl?: number | null
    createdAt?: string | null
}

interface CandidateWizardModalProps {
    isOpen: boolean
    onClose: () => void
    commissionId: string
    panelId: string
    panelName: string
    onCandidateAdded: () => void
}

export function CandidateWizardModal({
    isOpen,
    onClose,
    commissionId,
    panelId,
    panelName,
    onCandidateAdded,
}: CandidateWizardModalProps) {
    const { t } = useTranslation()
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

    // Step 1 State: Beverages
    const [beverageSearch, setBeverageSearch] = useState("")
    const [beveragePage, setBeveragePage] = useState(1)
    const [beverageTotalPages, setBeverageTotalPages] = useState(1)
    const [hasMoreBeverages, setHasMoreBeverages] = useState(false)
    const [beverages, setBeverages] = useState<BeverageItem[]>([])
    const [isLoadingBeverages, setIsLoadingBeverages] = useState(false)
    const [selectedBeverage, setSelectedBeverage] = useState<BeverageItem | null>(null)

    // Step 2 State: Batches
    const [batches, setBatches] = useState<BatchItem[]>([])
    const [batchPage, setBatchPage] = useState(1)
    const [batchTotalPages, setBatchTotalPages] = useState(1)
    const [hasMoreBatches, setHasMoreBatches] = useState(false)
    const [isLoadingBatches, setIsLoadingBatches] = useState(false)
    const [selectedBatch, setSelectedBatch] = useState<BatchItem | null>(null)

    // Step 3 State: Samples
    const [samples, setSamples] = useState<SampleItem[]>([])
    const [samplePage, setSamplePage] = useState(1)
    const [sampleTotalPages, setSampleTotalPages] = useState(1)
    const [hasMoreSamples, setHasMoreSamples] = useState(false)
    const [isLoadingSamples, setIsLoadingSamples] = useState(false)
    const [selectedSample, setSelectedSample] = useState<SampleItem | null>(null)

    // Step 4 State: Code & Submit
    const [anonymizedCode, setAnonymizedCode] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep(1)
            setBeverageSearch("")
            setBeveragePage(1)
            setBeverageTotalPages(1)
            setHasMoreBeverages(false)
            setBatchPage(1)
            setBatchTotalPages(1)
            setHasMoreBatches(false)
            setSamplePage(1)
            setSampleTotalPages(1)
            setHasMoreSamples(false)
            setSelectedBeverage(null)
            setSelectedBatch(null)
            setSelectedSample(null)
            setAnonymizedCode("")
            setSubmitError(null)
            loadBeverages("", 1)
        }
    }, [isOpen])

    const loadBeverages = async (query: string, page: number = 1) => {
        setIsLoadingBeverages(true)
        try {
            const res = await searchBeveragesAction(query, page, 8)
            if (res.success && res.items) {
                setBeverages(res.items)
                setBeveragePage(page)
                setBeverageTotalPages(res.totalPages || 1)
                setHasMoreBeverages(!!res.hasMore)
            } else {
                setBeverages([])
                setBeverageTotalPages(1)
                setHasMoreBeverages(false)
            }
        } catch (err) {
            console.error("Failed to load beverages:", err)
            setBeverages([])
            setBeverageTotalPages(1)
            setHasMoreBeverages(false)
        } finally {
            setIsLoadingBeverages(false)
        }
    }

    const handleBeverageSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setBeverageSearch(val)
        setBeveragePage(1)
        loadBeverages(val, 1)
    }

    const handleBeveragePageChange = (newPage: number) => {
        if (newPage < 1) return
        loadBeverages(beverageSearch, newPage)
    }

    const loadBatches = async (bevId: string, page: number = 1) => {
        setIsLoadingBatches(true)
        try {
            const res = await getBatchesForBeverageAction(bevId, page, 8)
            if (res.success && res.items) {
                setBatches(res.items)
                setBatchPage(page)
                setBatchTotalPages(res.totalPages || 1)
                setHasMoreBatches(!!res.hasMore)
            } else {
                setBatches([])
                setBatchTotalPages(1)
                setHasMoreBatches(false)
            }
        } catch (err) {
            console.error("Failed to load batches:", err)
            setBatches([])
            setBatchTotalPages(1)
            setHasMoreBatches(false)
        } finally {
            setIsLoadingBatches(false)
        }
    }

    const handleBatchPageChange = (newPage: number) => {
        if (newPage < 1 || !selectedBeverage) return
        loadBatches(selectedBeverage.id, newPage)
    }

    const handleSelectBeverage = async (bev: BeverageItem) => {
        setSelectedBeverage(bev)
        setSelectedBatch(null)
        setSelectedSample(null)
        setStep(2)
        setBatchPage(1)
        loadBatches(bev.id, 1)
    }

    const loadSamples = async (bId: string, page: number = 1) => {
        setIsLoadingSamples(true)
        try {
            const res = await getSamplesForBatchAction(bId, page, 8)
            if (res.success && res.items) {
                setSamples(res.items)
                setSamplePage(page)
                setSampleTotalPages(res.totalPages || 1)
                setHasMoreSamples(!!res.hasMore)
            } else {
                setSamples([])
                setSampleTotalPages(1)
                setHasMoreSamples(false)
            }
        } catch (err) {
            console.error("Failed to load samples:", err)
            setSamples([])
            setSampleTotalPages(1)
            setHasMoreSamples(false)
        } finally {
            setIsLoadingSamples(false)
        }
    }

    const handleSamplePageChange = (newPage: number) => {
        if (newPage < 1 || !selectedBatch) return
        loadSamples(selectedBatch.id, newPage)
    }

    const handleSelectBatch = async (batch: BatchItem) => {
        setSelectedBatch(batch)
        setSelectedSample(null)
        setStep(3)
        setSamplePage(1)
        loadSamples(batch.id, 1)
    }

    const handleSelectSample = (sample: SampleItem) => {
        setSelectedSample(sample)
        setStep(4)
    }

    const renderPagination = (
        currentPage: number,
        totalPages: number,
        isLoading: boolean,
        onPageChange: (page: number) => void
    ) => {
        if (totalPages <= 1) return null

        const pages: (number | string)[] = []

        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i)
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, "...", totalPages)
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
            } else {
                pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages)
            }
        }

        return (
            <div className="flex items-center justify-center gap-1.5 pt-3 border-t border-slate-100 mt-2">
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || isLoading}
                    className="flex items-center justify-center h-8 w-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-sm"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                {pages.map((p, i) =>
                    typeof p === "number" ? (
                        <button
                            key={i}
                            type="button"
                            onClick={() => onPageChange(p)}
                            disabled={isLoading || p === currentPage}
                            className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold transition-all shadow-sm ${
                                p === currentPage
                                    ? "bg-indigo-600 text-white shadow-indigo-200 pointer-events-none"
                                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-200 cursor-pointer"
                            }`}
                        >
                            {p}
                        </button>
                    ) : (
                        <span key={i} className="flex items-center justify-center w-6 h-8 text-xs text-slate-400 font-bold">
                            ...
                        </span>
                    )
                )}

                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || isLoading}
                    className="flex items-center justify-center h-8 w-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-sm"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        )
    }

    const handleSubmit = async () => {
        if (!selectedSample) return
        setIsSubmitting(true)
        setSubmitError(null)
        try {
            const res = await addCommissionCandidateAction({
                commissionId,
                panelId,
                sampleId: selectedSample.id,
                anonymizedCode: anonymizedCode.trim() || undefined
            })
            if (res.success) {
                onCandidateAdded()
                onClose()
            } else {
                setSubmitError(res.error || t("panels.wizard.failedToAddCandidate"))
            }
        } catch (err: any) {
            setSubmitError(err.message || t("panels.wizard.addCandidateError"))
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-xl overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-2xl animate-scale-up flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100/60">
                            <Wine className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800">
                                {t("panels.wizard.addSampleToPanel")}
                            </h3>
                            <p className="text-xs text-slate-400">
                                {t("panels.wizard.panelLabel")}: <span className="font-semibold text-slate-600">{panelName}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Step Progress Stepper */}
                <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-1 overflow-x-auto text-[11px] font-semibold text-slate-500">
                    <button
                        type="button"
                        onClick={() => setStep(1)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                            step === 1
                                ? "bg-indigo-600 text-white font-bold shadow-xs"
                                : selectedBeverage
                                ? "text-indigo-600 hover:bg-indigo-50 font-bold"
                                : "text-slate-400"
                        }`}
                    >
                        <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
                        <span>{t("panels.wizard.beverageStep")}</span>
                    </button>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />

                    <button
                        type="button"
                        onClick={() => selectedBeverage && setStep(2)}
                        disabled={!selectedBeverage}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                            step === 2
                                ? "bg-indigo-600 text-white font-bold shadow-xs"
                                : selectedBatch
                                ? "text-indigo-600 hover:bg-indigo-50 font-bold"
                                : "text-slate-400 opacity-60 pointer-events-none"
                        }`}
                    >
                        <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
                        <span>{t("panels.wizard.batchStep")}</span>
                    </button>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />

                    <button
                        type="button"
                        onClick={() => selectedBatch && setStep(3)}
                        disabled={!selectedBatch}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                            step === 3
                                ? "bg-indigo-600 text-white font-bold shadow-xs"
                                : selectedSample
                                ? "text-indigo-600 hover:bg-indigo-50 font-bold"
                                : "text-slate-400 opacity-60 pointer-events-none"
                        }`}
                    >
                        <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</span>
                        <span>{t("panels.wizard.sampleStep")}</span>
                    </button>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />

                    <button
                        type="button"
                        onClick={() => selectedSample && setStep(4)}
                        disabled={!selectedSample}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                            step === 4
                                ? "bg-indigo-600 text-white font-bold shadow-xs"
                                : "text-slate-400 opacity-60 pointer-events-none"
                        }`}
                    >
                        <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">4</span>
                        <span>{t("panels.wizard.codeStep")}</span>
                    </button>
                </div>

                {/* Modal Body / Steps */}
                <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
                    {/* STEP 1: Beverage Selection */}
                    {step === 1 && (
                        <div className="flex flex-col gap-4">
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder={t("panels.wizard.searchBeveragePlaceholder")}
                                    value={beverageSearch}
                                    onChange={handleBeverageSearchChange}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                    autoFocus
                                />
                            </div>

                            {isLoadingBeverages ? (
                                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                    <span className="text-xs">{t("panels.wizard.loadingBeverages")}</span>
                                </div>
                            ) : beverages.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 text-xs">
                                    {beverageSearch ? t("panels.wizard.noBeveragesFound") : t("panels.wizard.noBeveragesAvailable")}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
                                        {beverages.map((bev) => {
                                            const isSelected = selectedBeverage?.id === bev.id
                                            return (
                                                <div
                                                    key={bev.id}
                                                    onClick={() => handleSelectBeverage(bev)}
                                                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                                                        isSelected
                                                            ? "bg-indigo-50 border-indigo-300 shadow-sm"
                                                            : "bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50/70"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/50">
                                                            <Wine className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-slate-800 truncate">
                                                                {bev.name}
                                                            </p>
                                                            <span className="text-[10px] text-slate-400 font-mono">
                                                                ID: {bev.id.slice(0, 8)}...
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Pagination Controls */}
                                    {renderPagination(beveragePage, beverageTotalPages, isLoadingBeverages, handleBeveragePageChange)}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: Batch Selection */}
                    {step === 2 && (
                        <div className="flex flex-col gap-4">
                            <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <Wine className="w-4 h-4 text-indigo-600 shrink-0" />
                                    <span className="text-xs font-bold text-slate-800 truncate">
                                        {selectedBeverage?.name}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer shrink-0"
                                >
                                    {t("panels.wizard.change")}
                                </button>
                            </div>

                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                {t("panels.wizard.selectBatchTitle")}
                            </h4>

                            {isLoadingBatches ? (
                                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                    <span className="text-xs">{t("panels.wizard.loadingBatches")}</span>
                                </div>
                            ) : batches.length === 0 ? (
                                <div className="py-10 text-center flex flex-col items-center gap-2">
                                    <AlertCircle className="w-8 h-8 text-amber-500" />
                                    <p className="text-xs font-bold text-slate-700">{t("panels.wizard.noBatchesTitle")}</p>
                                    <p className="text-[11px] text-slate-400">{t("panels.wizard.noBatchesDesc")}</p>
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="mt-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                                    >
                                        {t("panels.wizard.selectDifferentBeverage")}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
                                        {batches.map((batch) => {
                                            const isSelected = selectedBatch?.id === batch.id
                                            let vintageVal: string | null = null
                                            if (batch.attributes) {
                                                try {
                                                    const parsed = JSON.parse(batch.attributes)
                                                    if (parsed && parsed.vintage) {
                                                        vintageVal = String(parsed.vintage)
                                                    }
                                                } catch (e) {}
                                            }

                                            return (
                                                <div
                                                    key={batch.id}
                                                    onClick={() => handleSelectBatch(batch)}
                                                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                                                        isSelected
                                                            ? "bg-indigo-50 border-indigo-300 shadow-sm"
                                                            : "bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50/70"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100/50">
                                                            <Boxes className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-slate-800 truncate flex items-center gap-1.5">
                                                                <span>{batch.lotNumber ? t("panels.wizard.batchNo", { number: batch.lotNumber }) : t("panels.wizard.batchNoNumber")}</span>
                                                                {vintageVal && (
                                                                    <span className="text-xs font-normal text-slate-400 shrink-0">
                                                                        ({vintageVal})
                                                                    </span>
                                                                )}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                                {batch.volumeMl && <span>{batch.volumeMl} ml</span>}
                                                                <span>•</span>
                                                                <span className="font-mono">{batch.id.slice(0, 8)}...</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Pagination Controls for Batches */}
                                    {renderPagination(batchPage, batchTotalPages, isLoadingBatches, handleBatchPageChange)}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3: Sample Selection */}
                    {step === 3 && (
                        <div className="flex flex-col gap-4">
                            <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Boxes className="w-4 h-4 text-indigo-600 shrink-0" />
                                    <span className="text-xs font-bold text-slate-800 truncate">
                                        {selectedBeverage?.name} — {selectedBatch?.lotNumber ? t("panels.lotNo", { lot: selectedBatch.lotNumber }) : t("panels.wizard.batchStep")}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer shrink-0"
                                >
                                    {t("panels.wizard.change")}
                                </button>
                            </div>

                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                {t("panels.wizard.selectSampleTitle")}
                            </h4>

                            {isLoadingSamples ? (
                                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                    <span className="text-xs">{t("panels.wizard.loadingSamples")}</span>
                                </div>
                            ) : samples.length === 0 ? (
                                <div className="py-10 text-center flex flex-col items-center gap-2">
                                    <AlertCircle className="w-8 h-8 text-amber-500" />
                                    <p className="text-xs font-bold text-slate-700">{t("panels.wizard.noSamplesTitle")}</p>
                                    <p className="text-[11px] text-slate-400">{t("panels.wizard.noSamplesDesc")}</p>
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="mt-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                                    >
                                        {t("panels.wizard.backToBatchSelect")}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
                                        {samples.map((sample) => {
                                            const isSelected = selectedSample?.id === sample.id
                                            return (
                                                <div
                                                    key={sample.id}
                                                    onClick={() => handleSelectSample(sample)}
                                                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                                                        isSelected
                                                            ? "bg-indigo-50 border-indigo-300 shadow-sm"
                                                            : "bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50/70"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/50">
                                                            <FlaskConical className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-slate-800 truncate">
                                                                {t("panels.wizard.sampleLabel")}: {sample.volumeMl ? `${sample.volumeMl} ml` : t("panels.wizard.volumeNotSpecified")}
                                                            </p>
                                                            <span className="text-[10px] text-slate-400 font-mono">
                                                                ID: {sample.id}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Pagination Controls for Samples */}
                                    {renderPagination(samplePage, sampleTotalPages, isLoadingSamples, handleSamplePageChange)}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 4: Anonymized Code & Review */}
                    {step === 4 && (
                        <div className="flex flex-col gap-4 animate-fade-in">
                            <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 flex flex-col gap-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                                    {t("panels.wizard.summaryTitle")}
                                </span>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-50">
                                        <span className="text-[10px] text-slate-400 block">{t("panels.wizard.beverageStep")}</span>
                                        <span className="font-bold text-slate-800 truncate block">
                                            {selectedBeverage?.name}
                                        </span>
                                    </div>
                                    <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-50">
                                        <span className="text-[10px] text-slate-400 block">{t("panels.wizard.batchLotLabel")}</span>
                                        <span className="font-bold text-slate-800 truncate block">
                                            {selectedBatch?.lotNumber || "—"}
                                        </span>
                                    </div>
                                    <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-50">
                                        <span className="text-[10px] text-slate-400 block">{t("panels.wizard.sampleStep")}</span>
                                        <span className="font-bold text-slate-800 truncate block">
                                            {selectedSample?.volumeMl ? `${selectedSample.volumeMl} мл` : t("panels.wizard.selected")}
                                        </span>
                                    </div>
                                    <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-50">
                                        <span className="text-[10px] text-slate-400 block">{t("panels.wizard.panelLabel")}</span>
                                        <span className="font-bold text-slate-800 truncate block">
                                            {panelName}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                                    {t("panels.wizard.anonymizedCodeLabel")}
                                </label>
                                <div className="relative">
                                    <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder={t("panels.wizard.anonymizedCodePlaceholder")}
                                        value={anonymizedCode}
                                        onChange={(e) => setAnonymizedCode(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                        autoFocus
                                    />
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1.5">
                                    {t("panels.wizard.anonymizedCodeDesc")}
                                </p>
                            </div>

                            {submitError && (
                                <p className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>{submitError}</span>
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between p-5 border-t border-slate-100 bg-slate-50/50">
                    {step > 1 ? (
                        <button
                            type="button"
                            onClick={() => setStep((prev) => (prev - 1) as any)}
                            disabled={isSubmitting}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span>{t("panels.wizard.back")}</span>
                        </button>
                    ) : (
                        <div />
                    )}

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            {t("competition.cancel")}
                        </button>

                        {step === 4 && (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/15 transition-all active:scale-95 cursor-pointer disabled:pointer-events-none"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Plus className="w-4 h-4" />
                                )}
                                <span>{t("panels.wizard.addCandidate")}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
