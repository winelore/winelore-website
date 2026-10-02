"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import {
    X,
    Search,
    Wine,
    Boxes,
    FlaskConical,
    Tag,
    ChevronRight,
    ChevronLeft,
    ChevronDown,
    Check,
    AlertCircle,
    Loader2,
    Plus,
    Building2,
    Info,
    Calendar,
    Percent,
    User,
} from "lucide-react"
import {
    searchBeveragesAction,
    getBatchesForBeverageAction,
    getSamplesForBatchAction,
    addCommissionCandidateAction,
    getBeverageTypesForPanelAction,
    getBeverageTypeIdAction,
    getBeverageCharacteristicsForPanelAction,
    getProducersAction,
    createProducerAction,
    createBeverageForPanelAction,
    createBatchForPanelAction,
    createSampleForPanelAction,
    searchUserByUsernameAction,
    getBeveragesByProducerAction,
} from "../../actions"
import type { FoundUser } from "@winelore/core/auth"
import { MemberAvatar } from "@/components/MemberAvatar"
import { useAvatars } from "@/hooks/useAvatars"
import {
    ABV_PRESETS,
    BATCH_VOLUME_PRESETS,
    SAMPLE_VOLUME_PRESETS,
    vintagePresets,
    volumePresetLabel,
    type BeverageCharacteristic,
    type ProducerOption,
    type BeverageTypeOption,
} from "@winelore/core/beverage"
import { useTranslation } from "@/lib/i18n/context"
import { usePresence } from "@/hooks/usePresence"

interface BeverageItem {
    id: string
    name: string
    typeId?: string
}

interface BatchItem {
    id: string
    lotNumber?: string | null
    volumeMl?: number | null
    createdAt?: string | null
    attributes?: any
}

interface SampleItem {
    id: string
    volumeMl?: number | null
    code?: string | null
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

interface CustomSelectOption {
    value: string
    label: string
    hint?: string
    icon?: React.ReactNode
}

function WizardSelect({
    value,
    options,
    onChange,
    placeholder = "Select...",
    disabled = false,
    loading = false,
    loadingText = "Loading...",
    emptyMessage = "No options",
    searchable = false,
    searchPlaceholder = "Search...",
    icon,
}: {
    value: string
    options: CustomSelectOption[]
    onChange: (val: string) => void
    placeholder?: string
    disabled?: boolean
    loading?: boolean
    loadingText?: string
    emptyMessage?: string
    searchable?: boolean
    searchPlaceholder?: string
    icon?: React.ReactNode
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [query, setQuery] = useState("")
    const ref = useRef<HTMLDivElement>(null)

    const selectedOption = useMemo(
        () => options.find((opt) => opt.value === value),
        [options, value]
    )

    const filtered = useMemo(() => {
        if (!searchable || !query.trim()) return options
        const q = query.toLowerCase().trim()
        return options.filter((opt) => opt.label.toLowerCase().includes(q))
    }, [options, searchable, query])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false)
        }
        document.addEventListener("mousedown", handleClickOutside)
        document.addEventListener("keydown", handleKeyDown)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [])

    return (
        <div ref={ref} className={`relative w-full ${isOpen ? "z-40" : "z-10"}`}>
            <button
                type="button"
                onClick={() => {
                    if (!disabled && !loading) {
                        setIsOpen((prev) => !prev)
                        setQuery("")
                    }
                }}
                disabled={disabled || loading}
                className={`flex w-full items-center justify-between gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                    isOpen
                        ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-white shadow-sm"
                        : "border-slate-200 bg-slate-50/70 hover:border-indigo-300 hover:bg-white text-slate-800"
                } disabled:cursor-not-allowed disabled:opacity-60`}
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
                    <span className={`truncate ${selectedOption ? "text-slate-800 font-semibold" : "text-slate-400 font-normal"}`}>
                        {loading ? loadingText : selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <span className="shrink-0 text-slate-400">
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    ) : (
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180 text-indigo-600" : ""}`} />
                    )}
                </span>
            </button>

            {isOpen && !disabled && !loading && (
                <div className="absolute left-0 right-0 top-full mt-1.5 max-h-56 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-1.5 shadow-2xl shadow-slate-200/90 backdrop-blur-md transition-all duration-200 origin-top animate-scale-up z-50">
                    {searchable && options.length > 5 && (
                        <div className="p-1 border-b border-slate-100 mb-1 sticky top-0 bg-white z-10">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>
                    )}
                    {filtered.length === 0 ? (
                        <div className="py-4 px-3 text-center text-xs font-medium text-slate-400">
                            {emptyMessage}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-0.5">
                            {filtered.map((opt) => {
                                const isSelected = opt.value === value
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(opt.value)
                                            setIsOpen(false)
                                        }}
                                        className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                                            isSelected
                                                ? "bg-indigo-600 text-white shadow-xs"
                                                : "text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            {opt.icon && (
                                                <span className={`shrink-0 ${isSelected ? "text-white" : "text-slate-400"}`}>
                                                    {opt.icon}
                                                </span>
                                            )}
                                            <div className="flex flex-col items-start min-w-0">
                                                <span className="truncate">{opt.label}</span>
                                                {opt.hint && (
                                                    <span className={`text-[10px] font-normal truncate ${isSelected ? "text-indigo-100" : "text-slate-400"}`}>
                                                        {opt.hint}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export function CandidateWizardModal({
    isOpen,
    onClose,
    commissionId,
    panelId,
    panelName,
    onCandidateAdded,
}: CandidateWizardModalProps) {
    const { t, formatBeverageType } = useTranslation()
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

    // Modes for each step: 'select' from catalog/database or 'create' a new one
    const [beverageMode, setBeverageMode] = useState<"select" | "create">("select")
    const [batchMode, setBatchMode] = useState<"select" | "create">("select")
    const [sampleMode, setSampleMode] = useState<"select" | "create">("select")

    // Step 1 State: Beverages (Select mode)
    const [beverageSearch, setBeverageSearch] = useState("")
    const [beveragePage, setBeveragePage] = useState(1)
    const [beverageTotalPages, setBeverageTotalPages] = useState(1)
    const [hasMoreBeverages, setHasMoreBeverages] = useState(false)
    const [beverages, setBeverages] = useState<BeverageItem[]>([])
    const [isLoadingBeverages, setIsLoadingBeverages] = useState(false)
    const [selectedBeverage, setSelectedBeverage] = useState<BeverageItem | null>(null)

    // Step 1 State: Beverage (Create mode)
    type SelectedProducer =
        | { type: "account"; auid: number; username: string; displayName: string }
        | { type: "catalog"; id: string; name: string; claimStatus?: string }
        | { type: "new"; name: string }

    const [bevCreateName, setBevCreateName] = useState("")
    const [bevCreateTypeId, setBevCreateTypeId] = useState("")
    const [selectedProducer, setSelectedProducer] = useState<SelectedProducer | null>(null)
    const [producerQuery, setProducerQuery] = useState("")
    const [isProducerOpen, setIsProducerOpen] = useState(false)
    const [isSearchingUser, setIsSearchingUser] = useState(false)
    const [foundUser, setFoundUser] = useState<FoundUser | null>(null)
    const producerContainerRef = useRef<HTMLDivElement>(null)
    const [bevRole, setBevRole] = useState<"MAKER" | "BOTTLER">("MAKER")
    const [bevAttributes, setBevAttributes] = useState<Record<string, string>>({})
    const [beverageTypes, setBeverageTypes] = useState<BeverageTypeOption[]>([])
    const [producers, setProducers] = useState<ProducerOption[]>([])
    const [bevCharacteristics, setBevCharacteristics] = useState<BeverageCharacteristic[]>([])
    const [isLoadingBevMeta, setIsLoadingBevMeta] = useState(false)
    const [isLoadingBevChars, setIsLoadingBevChars] = useState(false)
    const [isCreatingBeverage, setIsCreatingBeverage] = useState(false)
    const [bevCreateError, setBevCreateError] = useState<string | null>(null)
    const [producerBeverages, setProducerBeverages] = useState<Array<{ id: string; name: string; typeId?: string }>>([])
    const [isLoadingProducerBeverages, setIsLoadingProducerBeverages] = useState(false)

    const relevantAuids = useMemo(() => {
        const ids: number[] = []
        if (foundUser?.auid) ids.push(foundUser.auid)
        if (selectedProducer?.type === "account") ids.push(selectedProducer.auid)
        return ids
    }, [foundUser?.auid, selectedProducer])
    const { avatars } = useAvatars(relevantAuids)

    // Step 2 State: Batches (Select mode)
    const [batches, setBatches] = useState<BatchItem[]>([])
    const [batchPage, setBatchPage] = useState(1)
    const [batchTotalPages, setBatchTotalPages] = useState(1)
    const [hasMoreBatches, setHasMoreBatches] = useState(false)
    const [isLoadingBatches, setIsLoadingBatches] = useState(false)
    const [selectedBatch, setSelectedBatch] = useState<BatchItem | null>(null)

    // Step 2 State: Batch (Create mode)
    const [batchLotNumber, setBatchLotNumber] = useState("")
    const [batchVolumeMl, setBatchVolumeMl] = useState("")
    const [batchAttributes, setBatchAttributes] = useState<Record<string, string>>({})
    const [batchCharacteristics, setBatchCharacteristics] = useState<BeverageCharacteristic[]>([])
    const [isLoadingBatchChars, setIsLoadingBatchChars] = useState(false)
    const [isCreatingBatch, setIsCreatingBatch] = useState(false)
    const [batchCreateError, setBatchCreateError] = useState<string | null>(null)

    // Step 3 State: Samples (Select mode)
    const [samples, setSamples] = useState<SampleItem[]>([])
    const [samplePage, setSamplePage] = useState(1)
    const [sampleTotalPages, setSampleTotalPages] = useState(1)
    const [hasMoreSamples, setHasMoreSamples] = useState(false)
    const [isLoadingSamples, setIsLoadingSamples] = useState(false)
    const [selectedSample, setSelectedSample] = useState<SampleItem | null>(null)

    // Step 3 State: Sample (Create mode)
    const [sampleVolumeMl, setSampleVolumeMl] = useState("")
    const [sampleCode, setSampleCode] = useState("")
    const [sampleAttributes, setSampleAttributes] = useState<Record<string, string>>({})
    const [sampleCharacteristics, setSampleCharacteristics] = useState<BeverageCharacteristic[]>([])
    const [isLoadingSampleChars, setIsLoadingSampleChars] = useState(false)
    const [isCreatingSample, setIsCreatingSample] = useState(false)
    const [sampleCreateError, setSampleCreateError] = useState<string | null>(null)

    // Step 4 State: Code & Submit
    const [anonymizedCode, setAnonymizedCode] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep(1)
            setBeverageMode("select")
            setBatchMode("select")
            setSampleMode("select")
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

            // Reset create form states
            setBevCreateName("")
            setBevCreateTypeId("")
            setSelectedProducer(null)
            setProducerQuery("")
            setIsProducerOpen(false)
            setFoundUser(null)
            setBevRole("MAKER")
            setBevAttributes({})
            setBevCreateError(null)
            setBatchLotNumber("")
            setBatchVolumeMl("")
            setBatchAttributes({})
            setBatchCreateError(null)
            setSampleVolumeMl("")
            setSampleCode("")
            setSampleAttributes({})
            setSampleCreateError(null)

            loadBeverages("", 1)
        }
    }, [isOpen])

    // Load beverage types and producers when opening beverage create mode
    useEffect(() => {
        if (beverageMode === "create" && beverageTypes.length === 0) {
            setIsLoadingBevMeta(true)
            Promise.all([getBeverageTypesForPanelAction(), getProducersAction()])
                .then(([types, prods]) => {
                    setBeverageTypes(types)
                    setProducers(prods)
                    if (types.length > 0 && !bevCreateTypeId) {
                        setBevCreateTypeId(types[0].id)
                    }
                })
                .catch((err) => console.error("Failed to load types/producers:", err))
                .finally(() => setIsLoadingBevMeta(false))
        }
    }, [beverageMode, beverageTypes.length, bevCreateTypeId])

    // Load beverage characteristics when typeId changes
    useEffect(() => {
        if (bevCreateTypeId) {
            setIsLoadingBevChars(true)
            getBeverageCharacteristicsForPanelAction(bevCreateTypeId, "BEVERAGE")
                .then((chars) => {
                    setBevCharacteristics(chars)
                    setBevAttributes({})
                })
                .catch((err) => {
                    console.error("Failed to load beverage characteristics:", err)
                    setBevCharacteristics([])
                })
                .finally(() => setIsLoadingBevChars(false))
        } else {
            setBevCharacteristics([])
        }
    }, [bevCreateTypeId])

    // Filter catalog producers by query
    const matchingCatalogProducers = useMemo(() => {
        if (!producerQuery.trim()) return producers.slice(0, 8)
        const q = producerQuery.trim().toLowerCase()
        return producers.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8)
    }, [producers, producerQuery])

    // Debounced search for registered winemaker
    useEffect(() => {
        const trimmed = producerQuery.trim().replace(/^@/, "")
        if (!trimmed || trimmed.length < 2) {
            setFoundUser(null)
            setIsSearchingUser(false)
            return
        }
        setIsSearchingUser(true)
        const timer = setTimeout(async () => {
            try {
                const res = await searchUserByUsernameAction(trimmed)
                if (res.success && res.user) {
                    setFoundUser(res.user)
                } else {
                    setFoundUser(null)
                }
            } catch {
                setFoundUser(null)
            } finally {
                setIsSearchingUser(false)
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [producerQuery])

    // Close producer dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (producerContainerRef.current && !producerContainerRef.current.contains(e.target as Node)) {
                setIsProducerOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Proactively fetch existing beverages for the chosen producer
    useEffect(() => {
        if (!selectedProducer) {
            setProducerBeverages([])
            return
        }
        let active = true
        setIsLoadingProducerBeverages(true)
        const input =
            selectedProducer.type === "account"
                ? { producerAuid: selectedProducer.auid }
                : selectedProducer.type === "catalog"
                ? { producerId: selectedProducer.id }
                : {}
        if (!input.producerAuid && !input.producerId) {
            setProducerBeverages([])
            setIsLoadingProducerBeverages(false)
            return
        }
        getBeveragesByProducerAction(input)
            .then((res) => {
                if (active && res.success) {
                    setProducerBeverages(res.items || [])
                }
            })
            .catch(() => {
                if (active) setProducerBeverages([])
            })
            .finally(() => {
                if (active) setIsLoadingProducerBeverages(false)
            })
        return () => {
            active = false
        }
    }, [selectedProducer])

    const matchingProducerBeverages = useMemo(() => {
        if (!bevCreateName.trim() || producerBeverages.length === 0) return []
        const q = bevCreateName.trim().toLowerCase()
        return producerBeverages.filter((b) => b.name.toLowerCase().includes(q))
    }, [bevCreateName, producerBeverages])

    // Load batch characteristics when switching to batch create mode
    useEffect(() => {
        if (batchMode === "create" && selectedBeverage) {
            const fetchBatchChars = async () => {
                setIsLoadingBatchChars(true)
                try {
                    let typeId = selectedBeverage.typeId
                    if (!typeId) {
                        typeId = (await getBeverageTypeIdAction(selectedBeverage.id)) || undefined
                        if (typeId) {
                            setSelectedBeverage((prev) => (prev ? { ...prev, typeId } : prev))
                        }
                    }
                    if (typeId) {
                        const chars = await getBeverageCharacteristicsForPanelAction(typeId, "BATCH")
                        setBatchCharacteristics(chars)
                    } else {
                        setBatchCharacteristics([])
                    }
                } catch (err) {
                    console.error("Failed to load batch characteristics:", err)
                    setBatchCharacteristics([])
                } finally {
                    setIsLoadingBatchChars(false)
                }
            }
            fetchBatchChars()
        }
    }, [batchMode, selectedBeverage])

    // Load sample characteristics when switching to sample create mode
    useEffect(() => {
        if (sampleMode === "create" && selectedBeverage) {
            const fetchSampleChars = async () => {
                setIsLoadingSampleChars(true)
                try {
                    let typeId = selectedBeverage.typeId
                    if (!typeId) {
                        typeId = (await getBeverageTypeIdAction(selectedBeverage.id)) || undefined
                        if (typeId) {
                            setSelectedBeverage((prev) => (prev ? { ...prev, typeId } : prev))
                        }
                    }
                    if (typeId) {
                        const chars = await getBeverageCharacteristicsForPanelAction(typeId, "SAMPLE")
                        setSampleCharacteristics(chars)
                    } else {
                        setSampleCharacteristics([])
                    }
                } catch (err) {
                    console.error("Failed to load sample characteristics:", err)
                    setSampleCharacteristics([])
                } finally {
                    setIsLoadingSampleChars(false)
                }
            }
            fetchSampleChars()
        }
    }, [sampleMode, selectedBeverage])

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
        setBatchMode("select")
        setStep(2)
        setBatchPage(1)
        loadBatches(bev.id, 1)

        if (!bev.typeId) {
            getBeverageTypeIdAction(bev.id).then((tId) => {
                if (tId) {
                    setSelectedBeverage((prev) => (prev?.id === bev.id ? { ...prev, typeId: tId } : prev))
                }
            })
        }
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
        setSampleMode("select")
        setStep(3)
        setSamplePage(1)
        loadSamples(batch.id, 1)
    }

    const handleSelectSample = (sample: SampleItem) => {
        setSelectedSample(sample)
        setStep(4)
    }

    // Handlers for creating Beverage
    const handleCreateBeverage = async () => {
        setBevCreateError(null)
        const trimmedName = bevCreateName.trim()
        if (!trimmedName) {
            setBevCreateError(t("panels.wizard.fillRequiredFields"))
            return
        }
        if (!bevCreateTypeId) {
            setBevCreateError(t("panels.wizard.beverageTypeSelectPlaceholder"))
            return
        }

        setIsCreatingBeverage(true)
        try {
            let producerAuid: number | undefined
            let producerId: string | undefined

            if (selectedProducer?.type === "account") {
                producerAuid = selectedProducer.auid
            } else if (selectedProducer?.type === "catalog") {
                producerId = selectedProducer.id
            } else if (selectedProducer?.type === "new") {
                const prodRes = await createProducerAction(selectedProducer.name)
                if (!prodRes.success || !prodRes.producer?.id) {
                    throw new Error(prodRes.error || t("panels.wizard.createProducerError"))
                }
                producerId = prodRes.producer.id
            } else if (producerQuery.trim()) {
                const query = producerQuery.trim()
                const cleanUser = query.replace(/^@/, "")
                if (foundUser && foundUser.username.toLowerCase() === cleanUser.toLowerCase()) {
                    producerAuid = foundUser.auid
                } else {
                    const catalogMatch = producers.find((p) => p.name.toLowerCase() === query.toLowerCase())
                    if (catalogMatch) {
                        producerId = catalogMatch.id
                    } else {
                        const prodRes = await createProducerAction(query)
                        if (!prodRes.success || !prodRes.producer?.id) {
                            throw new Error(prodRes.error || t("panels.wizard.createProducerError"))
                        }
                        producerId = prodRes.producer.id
                    }
                }
            } else {
                const prodRes = await createProducerAction(trimmedName)
                if (!prodRes.success || !prodRes.producer?.id) {
                    throw new Error(prodRes.error || t("panels.wizard.createProducerError"))
                }
                producerId = prodRes.producer.id
            }

            const res = await createBeverageForPanelAction({
                name: trimmedName,
                typeId: bevCreateTypeId,
                producerId,
                producerAuid,
                role: bevRole,
                attributes: bevAttributes,
            })

            if (!res.success || !res.beverageId) {
                throw new Error(res.error || t("panels.wizard.createBeverageError"))
            }

            const newBev: BeverageItem = {
                id: res.beverageId,
                name: trimmedName,
                typeId: bevCreateTypeId,
            }
            setSelectedBeverage(newBev)
            setSelectedBatch(null)
            setSelectedSample(null)

            // Auto-transition to Step 2 in Create Batch mode since new beverage has 0 batches
            setStep(2)
            setBatchMode("create")
            setBatches([])
        } catch (err: any) {
            setBevCreateError(err.message || t("panels.wizard.createBeverageError"))
        } finally {
            setIsCreatingBeverage(false)
        }
    }

    // Handlers for creating Batch
    const handleCreateBatch = async () => {
        if (!selectedBeverage) return
        setBatchCreateError(null)

        setIsCreatingBatch(true)
        try {
            const res = await createBatchForPanelAction({
                beverageId: selectedBeverage.id,
                lotNumber: batchLotNumber.trim() || undefined,
                volumeMl: batchVolumeMl ? Number(batchVolumeMl) : undefined,
                attributes: batchAttributes,
            })

            if (!res.success || !res.batchId) {
                throw new Error(res.error || t("panels.wizard.createBatchError"))
            }

            const newBatch: BatchItem = {
                id: res.batchId,
                lotNumber: batchLotNumber.trim() || null,
                volumeMl: batchVolumeMl ? Number(batchVolumeMl) : null,
            }
            setSelectedBatch(newBatch)
            setSelectedSample(null)

            // Auto-transition to Step 3 in Create Sample mode since new batch has 0 samples
            setStep(3)
            setSampleMode("create")
            setSamples([])
        } catch (err: any) {
            setBatchCreateError(err.message || t("panels.wizard.createBatchError"))
        } finally {
            setIsCreatingBatch(false)
        }
    }

    // Handlers for creating Sample
    const handleCreateSample = async () => {
        if (!selectedBatch) return
        setSampleCreateError(null)

        setIsCreatingSample(true)
        try {
            const res = await createSampleForPanelAction({
                batchId: selectedBatch.id,
                volumeMl: sampleVolumeMl ? Number(sampleVolumeMl) : undefined,
                code: sampleCode.trim() || undefined,
                attributes: sampleAttributes,
            })

            if (!res.success || !res.sampleId) {
                throw new Error(res.error || t("panels.wizard.createSampleError"))
            }

            const newSample: SampleItem = {
                id: res.sampleId,
                volumeMl: sampleVolumeMl ? Number(sampleVolumeMl) : null,
                code: sampleCode.trim() || null,
            }
            setSelectedSample(newSample)

            // Transition to Step 4 (Code & Submit)
            setStep(4)
        } catch (err: any) {
            setSampleCreateError(err.message || t("panels.wizard.createSampleError"))
        } finally {
            setIsCreatingSample(false)
        }
    }

    // Step 4 final submission
    const handleSubmit = async () => {
        if (!selectedSample) return
        setIsSubmitting(true)
        setSubmitError(null)
        try {
            const res = await addCommissionCandidateAction({
                commissionId,
                panelId,
                sampleId: selectedSample.id,
                anonymizedCode: anonymizedCode.trim() || undefined,
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

    // Renders dynamic characteristics for Beverage, Batch, or Sample
    const renderCharacteristicInputs = (
        chars: BeverageCharacteristic[],
        attributes: Record<string, string>,
        setAttributes: React.Dispatch<React.SetStateAction<Record<string, string>>>,
        scope: "BEVERAGE" | "BATCH" | "SAMPLE",
        disabled: boolean
    ) => {
        if (chars.length === 0) return null

        return (
            <div className="flex flex-col gap-3.5 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {t("panels.wizard.characteristicsSection")}
                </span>
                <div className="flex flex-col gap-3">
                    {chars.map((char) => {
                        const val = attributes[char.code] || ""
                        const hasAllowed = char.allowedValues && char.allowedValues.length > 0
                        const isVintage = scope === "BATCH" && (char.code === "vintage" || char.name?.toLowerCase().includes("vintage"))
                        const isAbv = scope === "BATCH" && (char.code === "alcoholByVolume" || char.code === "abv")

                        return (
                            <div key={char.code} className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                                    <span>
                                        {char.name || char.code}
                                        {char.isRequired && <span className="ml-0.5 text-rose-500">*</span>}
                                    </span>
                                    {char.minLimit !== undefined && char.maxLimit !== undefined && (
                                        <span className="text-[10px] text-slate-400 font-normal">
                                            {char.minLimit} – {char.maxLimit}
                                        </span>
                                    )}
                                </div>

                                {hasAllowed ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {char.allowedValues!.map((opt) => {
                                            const isSelected = val === opt
                                            const formatted = formatBeverageType(opt)
                                            const label = formatted && formatted !== opt ? formatted : opt

                                            return (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    disabled={disabled}
                                                    onClick={() => {
                                                        setAttributes((prev) => {
                                                            const next = { ...prev }
                                                            if (isSelected) delete next[char.code]
                                                            else next[char.code] = opt
                                                            return next
                                                        })
                                                    }}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                                                        isSelected
                                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                                            : "bg-white border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/40"
                                                    }`}
                                                >
                                                    {label}
                                                </button>
                                            )
                                        })}
                                        {val && (
                                            <button
                                                type="button"
                                                disabled={disabled}
                                                onClick={() => {
                                                    setAttributes((prev) => {
                                                        const next = { ...prev }
                                                        delete next[char.code]
                                                        return next
                                                    })
                                                }}
                                                className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
                                            >
                                                {t("competition.createPresetClear")}
                                            </button>
                                        )}
                                    </div>
                                ) : isVintage ? (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex flex-wrap gap-1.5">
                                            {vintagePresets(new Date()).map((year) => {
                                                const isSelected = val === String(year)
                                                return (
                                                    <button
                                                        key={year}
                                                        type="button"
                                                        disabled={disabled}
                                                        onClick={() => {
                                                            setAttributes((prev) => {
                                                                const next = { ...prev }
                                                                if (isSelected) delete next[char.code]
                                                                else next[char.code] = String(year)
                                                                return next
                                                            })
                                                        }}
                                                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                                                            isSelected
                                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                                                : "bg-white border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/40"
                                                        }`}
                                                    >
                                                        {year}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                        <input
                                            type="number"
                                            value={val}
                                            disabled={disabled}
                                            placeholder={String(new Date().getFullYear())}
                                            onChange={(e) => {
                                                const v = e.target.value
                                                setAttributes((prev) => {
                                                    const next = { ...prev }
                                                    if (!v.trim()) delete next[char.code]
                                                    else next[char.code] = v
                                                    return next
                                                })
                                            }}
                                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                                        />
                                    </div>
                                ) : isAbv ? (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex flex-wrap gap-1.5">
                                            {ABV_PRESETS.map((abv) => {
                                                const isSelected = val === abv
                                                return (
                                                    <button
                                                        key={abv}
                                                        type="button"
                                                        disabled={disabled}
                                                        onClick={() => {
                                                            setAttributes((prev) => {
                                                                const next = { ...prev }
                                                                if (isSelected) delete next[char.code]
                                                                else next[char.code] = abv
                                                                return next
                                                            })
                                                        }}
                                                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                                                            isSelected
                                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                                                : "bg-white border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/40"
                                                        }`}
                                                    >
                                                        {abv}%
                                                    </button>
                                                )
                                            })}
                                        </div>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={val}
                                            disabled={disabled}
                                            placeholder="13.5"
                                            onChange={(e) => {
                                                const v = e.target.value
                                                setAttributes((prev) => {
                                                    const next = { ...prev }
                                                    if (!v.trim()) delete next[char.code]
                                                    else next[char.code] = v
                                                    return next
                                                })
                                            }}
                                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                                        />
                                    </div>
                                ) : char.typeName.toUpperCase().includes("INT") || char.typeName.toUpperCase().includes("DOUBLE") ? (
                                    <input
                                        type="number"
                                        value={val}
                                        disabled={disabled}
                                        min={char.minLimit}
                                        max={char.maxLimit}
                                        step={char.typeName.toUpperCase().includes("DOUBLE") ? "0.01" : "1"}
                                        placeholder={char.name || char.code}
                                        onChange={(e) => {
                                            const v = e.target.value
                                            setAttributes((prev) => {
                                                const next = { ...prev }
                                                if (v === "") delete next[char.code]
                                                else next[char.code] = v
                                                return next
                                            })
                                        }}
                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={val}
                                        disabled={disabled}
                                        placeholder={char.name || char.code}
                                        onChange={(e) => {
                                            const v = e.target.value
                                            setAttributes((prev) => {
                                                const next = { ...prev }
                                                if (!v.trim()) delete next[char.code]
                                                else next[char.code] = v
                                                return next
                                            })
                                        }}
                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                                    />
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    // Stays mounted briefly after closing so the sheet/dialog can animate out.
    const { mounted, closing } = usePresence(isOpen)
    if (!mounted) return null

    return (
        <div data-closing={closing || undefined} className="sheet-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="sheet-panel relative w-full max-w-xl overflow-hidden bg-white rounded-[32px] border border-slate-100 shadow-2xl animate-scale-up flex flex-col max-h-[90vh]">
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
                        onClick={() => {
                            setStep(1)
                        }}
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
                    {/* STEP 1: Beverage Selection / Creation */}
                    {step === 1 && (
                        <div className="flex flex-col gap-4">
                            {beverageMode === "select" ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
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
                                        <button
                                            type="button"
                                            onClick={() => setBeverageMode("create")}
                                            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-xs shrink-0 transition-colors cursor-pointer border border-indigo-100"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>{t("panels.wizard.createBeverageBtn")}</span>
                                        </button>
                                    </div>

                                    {isLoadingBeverages ? (
                                        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                                            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                            <span className="text-xs">{t("panels.wizard.loadingBeverages")}</span>
                                        </div>
                                    ) : beverages.length === 0 ? (
                                        <div className="py-10 text-center flex flex-col items-center gap-3">
                                            <AlertCircle className="w-8 h-8 text-slate-300" />
                                            <p className="text-xs text-slate-500 font-medium">
                                                {beverageSearch ? t("panels.wizard.noBeveragesFound") : t("panels.wizard.noBeveragesAvailable")}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (beverageSearch.trim()) setBevCreateName(beverageSearch.trim())
                                                    setBeverageMode("create")
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
                                            >
                                                <Plus className="w-4 h-4" />
                                                <span>{beverageSearch.trim() ? t("panels.wizard.createBeverageNamed", { name: beverageSearch.trim() }) : t("panels.wizard.createBeverageBtn")}</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            {beverageSearch.trim() && (
                                                <div className="flex items-center justify-between px-3 py-2 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs animate-fade-in">
                                                    <span className="text-slate-600 font-medium">{t("panels.wizard.createBeveragePrompt")}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setBevCreateName(beverageSearch.trim())
                                                            setBeverageMode("create")
                                                        }}
                                                        className="font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer transition-colors"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        <span>{t("panels.wizard.createBeverageNamed", { name: beverageSearch.trim() })}</span>
                                                    </button>
                                                </div>
                                            )}
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
                                </>
                            ) : (
                                /* CREATE BEVERAGE FORM */
                                <div className="flex flex-col gap-4 animate-fade-in">
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800">
                                                {t("panels.wizard.createBeverageTitle")}
                                            </h4>
                                            <p className="text-[11px] text-slate-400">
                                                {t("panels.wizard.createBeverageDesc")}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setBeverageMode("select")}
                                            className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                                        >
                                            {t("panels.wizard.backToList")}
                                        </button>
                                    </div>

                                    {/* Producer / Winery Selection */}
                                    <div className="flex flex-col gap-2" ref={producerContainerRef}>
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                                {t("panels.wizard.producerLabel")}
                                            </label>
                                            {selectedProducer && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedProducer(null)
                                                        setProducerQuery("")
                                                        setIsProducerOpen(true)
                                                    }}
                                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                                                >
                                                    {t("panels.wizard.producerChange")}
                                                </button>
                                            )}
                                        </div>

                                        {selectedProducer ? (
                                            selectedProducer.type === "account" ? (
                                                <div className="flex items-center justify-between gap-3 p-3 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl shadow-xs">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <MemberAvatar
                                                            auid={selectedProducer.auid}
                                                            username={selectedProducer.displayName || selectedProducer.username}
                                                            imageUrl={avatars[String(selectedProducer.auid)]}
                                                            className="w-8 h-8 rounded-full shadow-xs shrink-0"
                                                            showCrown={false}
                                                        />
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <span className="text-xs font-bold text-slate-800 truncate">
                                                                    {selectedProducer.displayName}
                                                                </span>
                                                                <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-600 text-white tracking-wide uppercase">
                                                                    {t("panels.wizard.producerAccountBadge")}
                                                                </span>
                                                            </div>
                                                            <span className="text-[11px] font-semibold text-indigo-600 truncate">
                                                                @{selectedProducer.username}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedProducer(null)
                                                            setProducerQuery("")
                                                            setIsProducerOpen(true)
                                                        }}
                                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-all cursor-pointer shrink-0"
                                                        title={t("panels.wizard.producerChange")}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : selectedProducer.type === "catalog" ? (
                                                <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl shadow-xs">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                                                            <Building2 className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <span className="text-xs font-bold text-slate-800 truncate">
                                                                    {selectedProducer.name}
                                                                </span>
                                                                <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-200 text-slate-700 tracking-wide">
                                                                    {t("panels.wizard.producerCatalogBadge")}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedProducer(null)
                                                            setProducerQuery("")
                                                            setIsProducerOpen(true)
                                                        }}
                                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-all cursor-pointer shrink-0"
                                                        title={t("panels.wizard.producerChange")}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center justify-between gap-3 p-3 bg-amber-50/50 border border-amber-200/70 rounded-2xl shadow-xs">
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                                                <Building2 className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                    <span className="text-xs font-bold text-slate-800 truncate">
                                                                        {selectedProducer.name}
                                                                    </span>
                                                                    <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-white tracking-wide uppercase">
                                                                        {t("panels.wizard.producerNewBadge")}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedProducer(null)
                                                                setProducerQuery("")
                                                                setIsProducerOpen(true)
                                                            }}
                                                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-all cursor-pointer shrink-0"
                                                            title={t("panels.wizard.producerChange")}
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <div className="p-2.5 bg-amber-50/70 border border-amber-200/60 rounded-xl flex items-start gap-2 text-xs text-amber-800">
                                                        <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                                        <span className="leading-relaxed text-[11px]">
                                                            {t("panels.wizard.producerStubNotice")}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        ) : (
                                            <div className="relative w-full">
                                                <div className="relative flex items-center">
                                                    <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                                    <input
                                                        id="winery_producer_search"
                                                        name="winery_producer_search"
                                                        type="text"
                                                        autoComplete="off"
                                                        autoCorrect="off"
                                                        autoCapitalize="none"
                                                        spellCheck={false}
                                                        data-lpignore="true"
                                                        data-1p-ignore="true"
                                                        data-form-type="other"
                                                        value={producerQuery}
                                                        onChange={(e) => {
                                                            setProducerQuery(e.target.value)
                                                            setIsProducerOpen(true)
                                                        }}
                                                        onFocus={() => setIsProducerOpen(true)}
                                                        placeholder={t("panels.wizard.producerUnifiedPlaceholder")}
                                                        className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                                    />
                                                    <div className="absolute right-3 flex items-center">
                                                        {isSearchingUser ? (
                                                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                                        ) : producerQuery ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setProducerQuery("")}
                                                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        ) : (
                                                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isProducerOpen ? "rotate-180 text-indigo-600" : ""}`} />
                                                        )}
                                                    </div>
                                                </div>

                                                {isProducerOpen && (
                                                    <div className="absolute left-0 right-0 top-full mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-1.5 shadow-2xl shadow-slate-200/90 backdrop-blur-md transition-all duration-200 origin-top animate-scale-up z-50">
                                                        {/* Section: Winemaker user if found */}
                                                        {foundUser && (
                                                            <div className="mb-1">
                                                                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                                                                    {t("panels.wizard.producerSectionAccount")}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedProducer({
                                                                            type: "account",
                                                                            auid: foundUser.auid,
                                                                            username: foundUser.username,
                                                                            displayName: foundUser.displayName,
                                                                        })
                                                                        setProducerQuery("")
                                                                        setIsProducerOpen(false)
                                                                    }}
                                                                    className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all cursor-pointer"
                                                                >
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <MemberAvatar
                                                                            auid={foundUser.auid}
                                                                            username={foundUser.displayName || foundUser.username}
                                                                            imageUrl={avatars[String(foundUser.auid)]}
                                                                            className="w-7 h-7 rounded-full shadow-xs shrink-0"
                                                                            showCrown={false}
                                                                        />
                                                                        <div className="flex flex-col items-start min-w-0">
                                                                            <span className="font-bold text-slate-800 truncate">
                                                                                {foundUser.displayName}
                                                                            </span>
                                                                            <span className="text-[10px] font-semibold text-indigo-600 truncate">
                                                                                @{foundUser.username}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wide">
                                                                        {t("panels.wizard.producerAccountBadge")}
                                                                    </span>
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Section: Catalog Producers */}
                                                        {matchingCatalogProducers.length > 0 && (
                                                            <div className="mb-1">
                                                                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                                    {t("panels.wizard.producerSectionCatalog")}
                                                                </div>
                                                                {matchingCatalogProducers.map((prod) => (
                                                                    <button
                                                                        key={prod.id}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSelectedProducer({
                                                                                type: "catalog",
                                                                                id: prod.id,
                                                                                name: prod.name,
                                                                                claimStatus: prod.claimStatus,
                                                                            })
                                                                            setProducerQuery("")
                                                                            setIsProducerOpen(false)
                                                                        }}
                                                                        className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-all cursor-pointer"
                                                                    >
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                                                                            <span className="truncate">{prod.name}</span>
                                                                        </div>
                                                                        {prod.claimStatus === "UNCLAIMED" && (
                                                                            <span className="shrink-0 text-[10px] text-slate-400 font-medium">
                                                                                {t("panels.wizard.producerCatalogBadge")}
                                                                            </span>
                                                                        )}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Section: Create New Stub */}
                                                        {producerQuery.trim() && !matchingCatalogProducers.some((p) => p.name.toLowerCase() === producerQuery.trim().toLowerCase()) && (
                                                            <div className="border-t border-slate-100 pt-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedProducer({
                                                                            type: "new",
                                                                            name: producerQuery.trim(),
                                                                        })
                                                                        setProducerQuery("")
                                                                        setIsProducerOpen(false)
                                                                    }}
                                                                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                                                                >
                                                                    <div className="w-5 h-5 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                                                        <Plus className="w-3.5 h-3.5" />
                                                                    </div>
                                                                    <span className="truncate">
                                                                        {t("panels.wizard.producerCreateNew", { name: producerQuery.trim() })}
                                                                    </span>
                                                                </button>
                                                            </div>
                                                        )}

                                                        {!foundUser && matchingCatalogProducers.length === 0 && !producerQuery.trim() && (
                                                            <div className="py-3 px-3 text-center text-xs font-medium text-slate-400">
                                                                {t("panels.wizard.producerUnifiedPlaceholder")}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Proactive Producer Beverages if a producer is selected */}
                                        {selectedProducer && (
                                            isLoadingProducerBeverages ? (
                                                <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-500 animate-fade-in">
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                                                    <span className="text-[11px] font-medium">{t("common.loading")}</span>
                                                </div>
                                            ) : producerBeverages.length > 0 ? (
                                                <div className="p-3 bg-gradient-to-br from-indigo-50/60 to-purple-50/30 border border-indigo-100/80 rounded-2xl flex flex-col gap-2 animate-fade-in">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1.5">
                                                            <Wine className="w-3.5 h-3.5 text-indigo-600" />
                                                            {t("panels.wizard.existingBeveragesForProducer")} ({producerBeverages.length})
                                                        </span>
                                                        <span className="text-[10px] text-indigo-500 font-medium">
                                                            {t("panels.wizard.useExistingBeverage")}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                                                        {producerBeverages.map((bev) => (
                                                            <button
                                                                key={bev.id}
                                                                type="button"
                                                                onClick={() => handleSelectBeverage(bev)}
                                                                className="px-2.5 py-1.5 rounded-xl bg-white border border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50/50 shadow-2xs text-xs font-semibold text-slate-700 hover:text-indigo-700 flex items-center gap-1.5 transition-all text-left group cursor-pointer"
                                                                title={bev.name}
                                                            >
                                                                <Wine className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                                                                <span className="truncate max-w-[180px]">{bev.name}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : null
                                        )}
                                    </div>

                                    {/* Beverage Name */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                            {t("panels.wizard.beverageNameLabel")} <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={bevCreateName}
                                            onChange={(e) => setBevCreateName(e.target.value)}
                                            placeholder={t("panels.wizard.beverageNamePlaceholder")}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                        />
                                        {matchingProducerBeverages.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-500 animate-fade-in">
                                                <span className="font-semibold text-amber-700">{t("panels.wizard.existingBeveragesForProducer")}:</span>
                                                {matchingProducerBeverages.map((bev) => (
                                                    <button
                                                        key={bev.id}
                                                        type="button"
                                                        onClick={() => handleSelectBeverage(bev)}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-semibold hover:bg-amber-100 cursor-pointer transition-colors"
                                                    >
                                                        <span>{bev.name}</span>
                                                        <ChevronRight className="w-3 h-3 text-amber-600" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Beverage Type Selection */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                            {t("panels.wizard.beverageTypeLabel")} <span className="text-rose-500">*</span>
                                        </label>
                                        <WizardSelect
                                            value={bevCreateTypeId}
                                            options={beverageTypes.map((type) => ({
                                                value: type.id,
                                                label: formatBeverageType(type.code) || type.name,
                                                icon: <Wine className="w-3.5 h-3.5" />,
                                            }))}
                                            onChange={(val) => setBevCreateTypeId(val)}
                                            placeholder={t("panels.wizard.beverageTypeSelectPlaceholder")}
                                            loading={isLoadingBevMeta}
                                            loadingText={t("common.loading")}
                                            emptyMessage={t("panels.wizard.noOptions")}
                                            icon={<Wine className="w-4 h-4 text-indigo-500" />}
                                        />
                                    </div>

                                    {/* Role Selection */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                            {t("panels.wizard.roleLabel")}
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setBevRole("MAKER")}
                                                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                                    bevRole === "MAKER"
                                                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-700"
                                                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                                }`}
                                            >
                                                {t("panels.wizard.roleMaker")}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setBevRole("BOTTLER")}
                                                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                                    bevRole === "BOTTLER"
                                                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-700"
                                                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                                }`}
                                            >
                                                {t("panels.wizard.roleBottler")}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Dynamic Characteristics */}
                                    {isLoadingBevChars ? (
                                        <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                            <span>{t("panels.wizard.loadingCharacteristics")}</span>
                                        </div>
                                    ) : (
                                        renderCharacteristicInputs(
                                            bevCharacteristics,
                                            bevAttributes,
                                            setBevAttributes,
                                            "BEVERAGE",
                                            isCreatingBeverage
                                        )
                                    )}

                                    {bevCreateError && (
                                        <p className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold">
                                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                            <span>{bevCreateError}</span>
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: Batch Selection / Creation */}
                    {step === 2 && (
                        <div className="flex flex-col gap-4">
                            {/* Selected Beverage Banner */}
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

                            {batchMode === "select" ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                            {t("panels.wizard.selectBatchTitle")}
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={() => setBatchMode("create")}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-xs transition-colors cursor-pointer border border-indigo-100"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>{t("panels.wizard.createBatchBtn")}</span>
                                        </button>
                                    </div>

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
                                            <div className="flex items-center gap-2 mt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setBatchMode("create")}
                                                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    <span>{t("panels.wizard.createBatchBtn")}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setStep(1)}
                                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                                                >
                                                    {t("panels.wizard.selectDifferentBeverage")}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
                                                {batches.map((batch) => {
                                                    const isSelected = selectedBatch?.id === batch.id
                                                    let vintageVal: string | null = null
                                                    if (batch.attributes) {
                                                        if (typeof batch.attributes === "object" && batch.attributes !== null) {
                                                            vintageVal = (batch.attributes as any).vintage ? String((batch.attributes as any).vintage) : null
                                                        } else if (typeof batch.attributes === "string") {
                                                            try {
                                                                const parsed = JSON.parse(batch.attributes)
                                                                if (parsed && parsed.vintage) {
                                                                    vintageVal = String(parsed.vintage)
                                                                }
                                                            } catch {
                                                                // Malformed attributes JSON
                                                            }
                                                        }
                                                    }

                                                    return (
                                                        <div
                                                            key={batch.id}
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={() => handleSelectBatch(batch)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter" || e.key === " ") {
                                                                    e.preventDefault()
                                                                    handleSelectBatch(batch)
                                                                }
                                                            }}
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
                                </>
                            ) : (
                                /* CREATE BATCH FORM */
                                <div className="flex flex-col gap-4 animate-fade-in">
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800">
                                                {t("panels.wizard.createBatchTitle")}
                                            </h4>
                                            <p className="text-[11px] text-slate-400">
                                                {t("panels.wizard.createBatchDesc")}
                                            </p>
                                        </div>
                                        {batches.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setBatchMode("select")}
                                                className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                                            >
                                                {t("panels.wizard.backToList")}
                                            </button>
                                        )}
                                    </div>

                                    {/* Lot Number */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                            {t("panels.wizard.lotNumberLabel")}
                                        </label>
                                        <input
                                            type="text"
                                            value={batchLotNumber}
                                            onChange={(e) => setBatchLotNumber(e.target.value)}
                                            placeholder={t("panels.wizard.lotNumberPlaceholder")}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                            autoFocus
                                        />
                                    </div>

                                    {/* Batch Volume with presets */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                            {t("panels.wizard.batchVolumeLabel")}
                                        </label>
                                        <input
                                            type="number"
                                            value={batchVolumeMl}
                                            onChange={(e) => setBatchVolumeMl(e.target.value)}
                                            placeholder="750"
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                        />
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {BATCH_VOLUME_PRESETS.map((vol) => (
                                                <button
                                                    key={vol}
                                                    type="button"
                                                    onClick={() => setBatchVolumeMl(String(vol))}
                                                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                                                        batchVolumeMl === String(vol)
                                                            ? "bg-indigo-600 text-white border-indigo-600"
                                                            : "bg-white border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/40"
                                                    }`}
                                                >
                                                    {volumePresetLabel(vol)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Dynamic Characteristics for Batch */}
                                    {isLoadingBatchChars ? (
                                        <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                            <span>{t("panels.wizard.loadingCharacteristics")}</span>
                                        </div>
                                    ) : (
                                        renderCharacteristicInputs(
                                            batchCharacteristics,
                                            batchAttributes,
                                            setBatchAttributes,
                                            "BATCH",
                                            isCreatingBatch
                                        )
                                    )}

                                    {batchCreateError && (
                                        <p className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold">
                                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                            <span>{batchCreateError}</span>
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3: Sample Selection / Creation */}
                    {step === 3 && (
                        <div className="flex flex-col gap-4">
                            {/* Selected Beverage & Batch Banner */}
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

                            {sampleMode === "select" ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                            {t("panels.wizard.selectSampleTitle")}
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={() => setSampleMode("create")}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-xs transition-colors cursor-pointer border border-indigo-100"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>{t("panels.wizard.createSampleBtn")}</span>
                                        </button>
                                    </div>

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
                                            <div className="flex items-center gap-2 mt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setSampleMode("create")}
                                                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    <span>{t("panels.wizard.createSampleBtn")}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setStep(2)}
                                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                                                >
                                                    {t("panels.wizard.backToBatchSelect")}
                                                </button>
                                            </div>
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
                                </>
                            ) : (
                                /* CREATE SAMPLE FORM */
                                <div className="flex flex-col gap-4 animate-fade-in">
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800">
                                                {t("panels.wizard.createSampleTitle")}
                                            </h4>
                                            <p className="text-[11px] text-slate-400">
                                                {t("panels.wizard.createSampleDesc")}
                                            </p>
                                        </div>
                                        {samples.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setSampleMode("select")}
                                                className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                                            >
                                                {t("panels.wizard.backToList")}
                                            </button>
                                        )}
                                    </div>

                                    {/* Sample Volume with presets */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                            {t("panels.wizard.sampleVolumeLabel")}
                                        </label>
                                        <input
                                            type="number"
                                            value={sampleVolumeMl}
                                            onChange={(e) => setSampleVolumeMl(e.target.value)}
                                            placeholder="750"
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                            autoFocus
                                        />
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {SAMPLE_VOLUME_PRESETS.map((vol) => (
                                                <button
                                                    key={vol}
                                                    type="button"
                                                    onClick={() => setSampleVolumeMl(String(vol))}
                                                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                                                        sampleVolumeMl === String(vol)
                                                            ? "bg-indigo-600 text-white border-indigo-600"
                                                            : "bg-white border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/40"
                                                    }`}
                                                >
                                                    {volumePresetLabel(vol)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Sample Code */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                            {t("panels.wizard.sampleCodeLabel")}
                                        </label>
                                        <input
                                            type="text"
                                            value={sampleCode}
                                            onChange={(e) => setSampleCode(e.target.value)}
                                            placeholder={t("panels.wizard.sampleCodePlaceholder")}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                        />
                                    </div>

                                    {/* Dynamic Characteristics for Sample */}
                                    {isLoadingSampleChars ? (
                                        <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                            <span>{t("panels.wizard.loadingCharacteristics")}</span>
                                        </div>
                                    ) : (
                                        renderCharacteristicInputs(
                                            sampleCharacteristics,
                                            sampleAttributes,
                                            setSampleAttributes,
                                            "SAMPLE",
                                            isCreatingSample
                                        )
                                    )}

                                    {sampleCreateError && (
                                        <p className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold">
                                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                            <span>{sampleCreateError}</span>
                                        </p>
                                    )}
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
                                            {selectedSample?.volumeMl ? `${selectedSample.volumeMl} ml` : t("panels.wizard.selected")}
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
                    {/* Back / Cancel button */}
                    {step === 1 ? (
                        beverageMode === "create" ? (
                            <button
                                type="button"
                                onClick={() => setBeverageMode("select")}
                                disabled={isCreatingBeverage}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span>{t("panels.wizard.backToList")}</span>
                            </button>
                        ) : (
                            <div />
                        )
                    ) : step === 2 ? (
                        batchMode === "create" && batches.length > 0 ? (
                            <button
                                type="button"
                                onClick={() => setBatchMode("select")}
                                disabled={isCreatingBatch}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span>{t("panels.wizard.backToList")}</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    setStep(1)
                                    setBeverageMode("select")
                                }}
                                disabled={isCreatingBatch}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span>{t("panels.wizard.back")}</span>
                            </button>
                        )
                    ) : step === 3 ? (
                        sampleMode === "create" && samples.length > 0 ? (
                            <button
                                type="button"
                                onClick={() => setSampleMode("select")}
                                disabled={isCreatingSample}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span>{t("panels.wizard.backToList")}</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    setStep(2)
                                    setBatchMode("select")
                                }}
                                disabled={isCreatingSample}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span>{t("panels.wizard.back")}</span>
                            </button>
                        )
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                setStep(3)
                                setSampleMode("select")
                            }}
                            disabled={isSubmitting}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span>{t("panels.wizard.back")}</span>
                        </button>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            {t("panels.wizard.cancelBtn")}
                        </button>

                        {/* Step 1 Create submit */}
                        {step === 1 && beverageMode === "create" && (
                            <button
                                type="button"
                                onClick={handleCreateBeverage}
                                disabled={isCreatingBeverage}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/15 transition-all active:scale-95 cursor-pointer disabled:pointer-events-none"
                            >
                                {isCreatingBeverage ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <ChevronRight className="w-4 h-4" />
                                )}
                                <span>{t("panels.wizard.createAndContinue")}</span>
                            </button>
                        )}

                        {/* Step 2 Create submit */}
                        {step === 2 && batchMode === "create" && (
                            <button
                                type="button"
                                onClick={handleCreateBatch}
                                disabled={isCreatingBatch}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/15 transition-all active:scale-95 cursor-pointer disabled:pointer-events-none"
                            >
                                {isCreatingBatch ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <ChevronRight className="w-4 h-4" />
                                )}
                                <span>{t("panels.wizard.createAndContinue")}</span>
                            </button>
                        )}

                        {/* Step 3 Create submit */}
                        {step === 3 && sampleMode === "create" && (
                            <button
                                type="button"
                                onClick={handleCreateSample}
                                disabled={isCreatingSample}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/15 transition-all active:scale-95 cursor-pointer disabled:pointer-events-none"
                            >
                                {isCreatingSample ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <ChevronRight className="w-4 h-4" />
                                )}
                                <span>{t("panels.wizard.createAndContinue")}</span>
                            </button>
                        )}

                        {/* Step 4 Final submit */}
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
