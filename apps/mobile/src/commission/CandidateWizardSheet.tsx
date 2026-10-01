import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native"
import * as Haptics from "expo-haptics"
import { parseAttributes } from "@winelore/core/evaluation"
import type { WizardBatch, WizardPage, WizardSample } from "@winelore/core/commission"
import {
    BATCH_VOLUME_PRESETS,
    SAMPLE_VOLUME_PRESETS,
    volumePresetLabel,
    type BeverageCharacteristic,
    type BeverageTypeOption,
    type ProducerOption,
} from "@winelore/core/beverage"
import { useTranslation } from "../i18n/LocaleProvider"
import { MONOSPACE, continuous, palette, radius } from "../theme"
import { Icon, type IconName } from "../ui/Icon"
import { PressableSurface } from "../ui/Pressable"
import { FormInput } from "../ui/Form"
import { CharacteristicFields } from "../beverage/CharacteristicFields"
import {
    batchesPage,
    beveragesPage,
    samplesPage,
    loadBeverageTypesList,
    loadProducersList,
    createProducerStub,
    loadCharacteristicsList,
    getBeverageTypeId,
    createBeverageForPanel,
    createBatchForPanel,
    createSampleForPanel,
} from "./mutations"

interface CandidateWizardSheetProps {
    visible: boolean
    panelName: string
    auid: string
    onClose: () => void
    /** Add the chosen sample; resolves to an error message, or null once added. */
    onAdd: (sampleId: string, code: string) => Promise<string | null>
}

type Beverage = { id: string; name: string; typeId?: string }
type Step = 1 | 2 | 3 | 4
type Mode = "select" | "create"

/** Pages of a list, loaded as it scrolls: the web's numbered pages, as a phone scrolls them. */
function usePaged<T>(load: ((page: number) => Promise<WizardPage<T>>) | null) {
    const [items, setItems] = useState<T[]>([])
    const [loading, setLoading] = useState(false)
    const state = useRef({ page: 0, hasMore: true, busy: false, generation: 0 })

    const loadMore = useCallback(async () => {
        const current = state.current
        if (!load || current.busy || !current.hasMore) return
        current.busy = true
        const generation = current.generation
        setLoading(true)
        try {
            const result = await load(current.page + 1)
            if (generation !== state.current.generation) return
            current.page = result.page
            current.hasMore = result.hasMore
            setItems((previous) => (result.page === 1 ? result.items : [...previous, ...result.items]))
        } catch {
            current.hasMore = false
        } finally {
            if (generation === state.current.generation) {
                current.busy = false
                setLoading(false)
            }
        }
    }, [load])

    useEffect(() => {
        state.current = { page: 0, hasMore: true, busy: false, generation: state.current.generation + 1 }
        setItems([])
        if (load) loadMore()
    }, [load, loadMore])

    return { items, loading, loadMore }
}

/**
 * The "Add Sample to Panel" wizard as a page sheet: choose the beverage,
 * batch, sample, and anonymized code — with full inline creation for Beverage
 * (including catalog producer stubs and dynamic characteristics), Batch, and Sample.
 */
export function CandidateWizardSheet({ visible, panelName, auid, onClose, onAdd }: CandidateWizardSheetProps) {
    const { t, formatBeverageType } = useTranslation()
    const [step, setStep] = useState<Step>(1)
    const [search, setSearch] = useState("")
    const [debounced, setDebounced] = useState("")
    const [beverage, setBeverage] = useState<Beverage | null>(null)
    const [batch, setBatch] = useState<WizardBatch | null>(null)
    const [sample, setSample] = useState<WizardSample | null>(null)
    const [code, setCode] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Modes for each step
    const [beverageMode, setBeverageMode] = useState<Mode>("select")
    const [batchMode, setBatchMode] = useState<Mode>("select")
    const [sampleMode, setSampleMode] = useState<Mode>("select")

    // Create Beverage State
    const [bevName, setBevName] = useState("")
    const [bevTypeId, setBevTypeId] = useState("")
    const [bevProducerTab, setBevProducerTab] = useState<"new" | "existing">("new")
    const [bevProducerId, setBevProducerId] = useState("")
    const [bevNewProducerName, setBevNewProducerName] = useState("")
    const [bevRole, setBevRole] = useState<"MAKER" | "BOTTLER">("MAKER")
    const [bevAttributes, setBevAttributes] = useState<Record<string, string>>({})
    const [beverageTypes, setBeverageTypes] = useState<BeverageTypeOption[]>([])
    const [producers, setProducers] = useState<ProducerOption[]>([])
    const [bevCharacteristics, setBevCharacteristics] = useState<BeverageCharacteristic[]>([])
    const [isLoadingMeta, setIsLoadingMeta] = useState(false)
    const [isLoadingBevChars, setIsLoadingBevChars] = useState(false)
    const [isCreatingBev, setIsCreatingBev] = useState(false)
    const [bevError, setBevError] = useState<string | null>(null)

    // Create Batch State
    const [batchLotNumber, setBatchLotNumber] = useState("")
    const [batchVolumeMl, setBatchVolumeMl] = useState("")
    const [batchAttributes, setBatchAttributes] = useState<Record<string, string>>({})
    const [batchCharacteristics, setBatchCharacteristics] = useState<BeverageCharacteristic[]>([])
    const [isLoadingBatchChars, setIsLoadingBatchChars] = useState(false)
    const [isCreatingBatch, setIsCreatingBatch] = useState(false)
    const [batchError, setBatchError] = useState<string | null>(null)

    // Create Sample State
    const [sampleVolumeMl, setSampleVolumeMl] = useState("")
    const [sampleCode, setSampleCode] = useState("")
    const [sampleAttributes, setSampleAttributes] = useState<Record<string, string>>({})
    const [sampleCharacteristics, setSampleCharacteristics] = useState<BeverageCharacteristic[]>([])
    const [isLoadingSampleChars, setIsLoadingSampleChars] = useState(false)
    const [isCreatingSample, setIsCreatingSample] = useState(false)
    const [sampleError, setSampleError] = useState<string | null>(null)

    useEffect(() => {
        if (!visible) return
        setStep(1)
        setBeverageMode("select")
        setBatchMode("select")
        setSampleMode("select")
        setSearch("")
        setDebounced("")
        setBeverage(null)
        setBatch(null)
        setSample(null)
        setCode("")
        setError(null)

        // Reset create states
        setBevName("")
        setBevTypeId("")
        setBevProducerTab("new")
        setBevProducerId("")
        setBevNewProducerName("")
        setBevRole("MAKER")
        setBevAttributes({})
        setBevError(null)

        setBatchLotNumber("")
        setBatchVolumeMl("")
        setBatchAttributes({})
        setBatchError(null)

        setSampleVolumeMl("")
        setSampleCode("")
        setSampleAttributes({})
        setSampleError(null)
    }, [visible])

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(search), 250)
        return () => clearTimeout(timer)
    }, [search])

    // Load beverage types and producers when opening beverage create mode
    useEffect(() => {
        if (beverageMode === "create" && beverageTypes.length === 0) {
            let active = true
            setIsLoadingMeta(true)
            Promise.all([loadBeverageTypesList(), loadProducersList(auid)])
                .then(([types, prods]) => {
                    if (!active) return
                    setBeverageTypes(types)
                    setProducers(prods)
                    if (types.length > 0 && !bevTypeId) {
                        setBevTypeId(types[0].id)
                    }
                })
                .catch(() => {})
                .finally(() => {
                    if (active) setIsLoadingMeta(false)
                })
            return () => {
                active = false
            }
        }
    }, [beverageMode, beverageTypes.length, bevTypeId, auid])

    // Load beverage characteristics when typeId changes
    useEffect(() => {
        if (bevTypeId) {
            let active = true
            setIsLoadingBevChars(true)
            loadCharacteristicsList(bevTypeId, "BEVERAGE", auid)
                .then((chars) => {
                    if (active) {
                        setBevCharacteristics(chars)
                        setBevAttributes({})
                    }
                })
                .catch(() => {
                    if (active) setBevCharacteristics([])
                })
                .finally(() => {
                    if (active) setIsLoadingBevChars(false)
                })
            return () => {
                active = false
            }
        } else {
            setBevCharacteristics([])
        }
    }, [bevTypeId, auid])

    // Load batch characteristics when switching to batch create mode
    useEffect(() => {
        if (batchMode === "create" && beverage) {
            let active = true
            setIsLoadingBatchChars(true)
            ;(async () => {
                try {
                    let typeId = beverage.typeId
                    if (!typeId) {
                        typeId = (await getBeverageTypeId(beverage.id, auid)) || undefined
                        if (typeId && active) {
                            setBeverage((prev) => (prev ? { ...prev, typeId } : prev))
                        }
                    }
                    if (typeId && active) {
                        const chars = await loadCharacteristicsList(typeId, "BATCH", auid)
                        if (active) setBatchCharacteristics(chars)
                    }
                } catch {
                    if (active) setBatchCharacteristics([])
                } finally {
                    if (active) setIsLoadingBatchChars(false)
                }
            })()
            return () => {
                active = false
            }
        }
    }, [batchMode, beverage, auid])

    // Load sample characteristics when switching to sample create mode
    useEffect(() => {
        if (sampleMode === "create" && beverage) {
            let active = true
            setIsLoadingSampleChars(true)
            ;(async () => {
                try {
                    let typeId = beverage.typeId
                    if (!typeId) {
                        typeId = (await getBeverageTypeId(beverage.id, auid)) || undefined
                        if (typeId && active) {
                            setBeverage((prev) => (prev ? { ...prev, typeId } : prev))
                        }
                    }
                    if (typeId && active) {
                        const chars = await loadCharacteristicsList(typeId, "SAMPLE", auid)
                        if (active) setSampleCharacteristics(chars)
                    }
                } catch {
                    if (active) setSampleCharacteristics([])
                } finally {
                    if (active) setIsLoadingSampleChars(false)
                }
            })()
            return () => {
                active = false
            }
        }
    }, [sampleMode, beverage, auid])

    // Each list loads once there is something to list
    const beverages = usePaged<Beverage>(
        useMemo(() => (visible ? (page: number) => beveragesPage(debounced, page, auid) : null), [visible, debounced, auid]),
    )
    const batches = usePaged<WizardBatch>(
        useMemo(() => (beverage ? (page: number) => batchesPage(beverage.id, page, auid) : null), [beverage, auid]),
    )
    const samples = usePaged<WizardSample>(
        useMemo(() => (batch ? (page: number) => samplesPage(batch.id, page, auid) : null), [batch, auid]),
    )

    const chooseBeverage = (item: Beverage) => {
        Haptics.selectionAsync()
        setBeverage(item)
        setBatch(null)
        setSample(null)
        setBatchMode("select")
        setStep(2)

        if (!item.typeId) {
            getBeverageTypeId(item.id, auid).then((tId) => {
                if (tId) setBeverage((prev) => (prev?.id === item.id ? { ...prev, typeId: tId } : prev))
            })
        }
    }

    const chooseBatch = (item: WizardBatch) => {
        Haptics.selectionAsync()
        setBatch(item)
        setSample(null)
        setSampleMode("select")
        setStep(3)
    }

    const chooseSample = (item: WizardSample) => {
        Haptics.selectionAsync()
        setSample(item)
        setStep(4)
    }

    // Beverage creation
    const handleCreateBeverage = async () => {
        setBevError(null)
        const trimmedName = bevName.trim()
        if (!trimmedName) {
            setBevError(t("panels.wizard.fillRequiredFields"))
            return
        }
        if (!bevTypeId) {
            setBevError(t("panels.wizard.beverageTypeSelectPlaceholder"))
            return
        }

        setIsCreatingBev(true)
        try {
            let producerId = bevProducerId
            if (bevProducerTab === "new") {
                const stubName = bevNewProducerName.trim() || trimmedName
                const prod = await createProducerStub(stubName, auid)
                producerId = prod.id
            }

            const bevId = await createBeverageForPanel(
                {
                    name: trimmedName,
                    typeId: bevTypeId,
                    producerId: producerId || undefined,
                    role: bevRole,
                    attributes: bevAttributes,
                },
                auid,
            )

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            const newBev: Beverage = { id: bevId, name: trimmedName, typeId: bevTypeId }
            setBeverage(newBev)
            setBatch(null)
            setSample(null)
            setBatchMode("create")
            setStep(2)
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            setBevError(err?.message || t("panels.wizard.createBeverageError"))
        } finally {
            setIsCreatingBev(false)
        }
    }

    // Batch creation
    const handleCreateBatch = async () => {
        if (!beverage) return
        setBatchError(null)

        setIsCreatingBatch(true)
        try {
            const bId = await createBatchForPanel(
                {
                    beverageId: beverage.id,
                    lotNumber: batchLotNumber.trim() || undefined,
                    volumeMl: batchVolumeMl ? Number(batchVolumeMl) : undefined,
                    attributes: batchAttributes,
                },
                auid,
            )

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            const newBatch: WizardBatch = {
                id: bId,
                lotNumber: batchLotNumber.trim() || null,
                volumeMl: batchVolumeMl ? Number(batchVolumeMl) : null,
            }
            setBatch(newBatch)
            setSample(null)
            setSampleMode("create")
            setStep(3)
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            setBatchError(err?.message || t("panels.wizard.createBatchError"))
        } finally {
            setIsCreatingBatch(false)
        }
    }

    // Sample creation
    const handleCreateSample = async () => {
        if (!batch) return
        setSampleError(null)

        setIsCreatingSample(true)
        try {
            const sId = await createSampleForPanel(
                {
                    batchId: batch.id,
                    volumeMl: sampleVolumeMl ? Number(sampleVolumeMl) : undefined,
                    code: sampleCode.trim() || undefined,
                    attributes: sampleAttributes,
                },
                auid,
            )

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            const newSample: WizardSample = {
                id: sId,
                volumeMl: sampleVolumeMl ? Number(sampleVolumeMl) : null,
            }
            setSample(newSample)
            setStep(4)
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            setSampleError(err?.message || t("panels.wizard.createSampleError"))
        } finally {
            setIsCreatingSample(false)
        }
    }

    const submit = async () => {
        if (!sample) return
        setSubmitting(true)
        setError(null)
        const failure = await onAdd(sample.id, code)
        setSubmitting(false)
        if (failure) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            setError(failure)
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            onClose()
        }
    }

    const steps: Array<{ label: string; icon: IconName }> = [
        { label: t("panels.wizard.beverageStep"), icon: "beverage" },
        { label: t("panels.wizard.batchStep"), icon: "barcode" },
        { label: t("panels.wizard.sampleStep"), icon: "flask" },
        { label: t("panels.wizard.codeStep"), icon: "tag" },
    ]

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={styles.sheet}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerText}>
                        <Text style={styles.title}>{t("panels.wizard.addSampleToPanel")}</Text>
                        <Text style={styles.subtitle}>
                            {t("panels.wizard.panelLabel")}: <Text style={styles.subtitleStrong}>{panelName}</Text>
                        </Text>
                    </View>
                    <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} hitSlop={8} onPress={onClose} style={styles.close}>
                        <Icon name="close" size={20} color={palette.textFaint} />
                    </Pressable>
                </View>

                {/* Progress Stepper */}
                <View style={styles.steps}>
                    {steps.map((item, index) => {
                        const number = (index + 1) as Step
                        const done = number < step
                        const active = number === step
                        return (
                            <View key={item.label} style={styles.step}>
                                <View style={[styles.stepDot, done && styles.stepDotDone, active && styles.stepDotActive]}>
                                    {done ? (
                                        <Icon name="done" size={12} color={palette.onAccent} weight="bold" />
                                    ) : (
                                        <Icon name={item.icon} size={12} color={active ? palette.onAccent : palette.textFaint} />
                                    )}
                                </View>
                                <Text style={[styles.stepLabel, (active || done) && styles.stepLabelActive]} numberOfLines={1}>
                                    {item.label}
                                </Text>
                            </View>
                        )
                    })}
                </View>

                {/* Body */}
                <View style={styles.body}>
                    {/* STEP 1: Beverage */}
                    {step === 1 ? (
                        beverageMode === "select" ? (
                            <>
                                <View style={styles.actionRow}>
                                    <View style={[styles.search, { flex: 1 }]}>
                                        <Icon name="search" size={16} color={palette.textFaint} />
                                        <TextInput
                                            value={search}
                                            onChangeText={setSearch}
                                            placeholder={t("panels.wizard.searchBeveragePlaceholder")}
                                            placeholderTextColor={palette.textFaint}
                                            autoCorrect={false}
                                            clearButtonMode="while-editing"
                                            style={styles.searchInput}
                                        />
                                    </View>
                                    <Pressable
                                        accessibilityRole="button"
                                        onPress={() => setBeverageMode("create")}
                                        style={styles.actionButton}
                                    >
                                        <Icon name="plus" size={14} color={palette.accent} weight="bold" />
                                        <Text style={styles.actionButtonLabel}>{t("panels.wizard.createBeverageBtn")}</Text>
                                    </Pressable>
                                </View>
                                <ChoiceList
                                    items={beverages.items}
                                    loading={beverages.loading}
                                    loadingLabel={t("panels.wizard.loadingBeverages")}
                                    emptyTitle={debounced.trim() ? t("panels.wizard.noBeveragesFound") : t("panels.wizard.noBeveragesAvailable")}
                                    onEndReached={beverages.loadMore}
                                    render={(item) => ({ key: item.id, icon: "beverage", title: item.name, selected: beverage?.id === item.id })}
                                    onChoose={chooseBeverage}
                                />
                            </>
                        ) : (
                            /* CREATE BEVERAGE */
                            <ScrollView
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={styles.formScroll}
                                showsVerticalScrollIndicator={false}
                            >
                                <View style={styles.formHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.formTitle}>{t("panels.wizard.createBeverageTitle")}</Text>
                                        <Text style={styles.formSubtitle}>{t("panels.wizard.createBeverageDesc")}</Text>
                                    </View>
                                    <Pressable accessibilityRole="button" onPress={() => setBeverageMode("select")} hitSlop={8}>
                                        <Text style={styles.linkText}>{t("panels.wizard.backToList")}</Text>
                                    </Pressable>
                                </View>

                                {/* Beverage Name */}
                                <View style={styles.field}>
                                    <Text style={styles.fieldLabel}>
                                        {t("panels.wizard.beverageNameLabel")} <Text style={styles.required}>*</Text>
                                    </Text>
                                    <FormInput
                                        value={bevName}
                                        onChangeText={setBevName}
                                        placeholder={t("panels.wizard.beverageNamePlaceholder")}
                                        autoFocus
                                    />
                                </View>

                                {/* Beverage Type */}
                                <View style={styles.field}>
                                    <Text style={styles.fieldLabel}>
                                        {t("panels.wizard.beverageTypeLabel")} <Text style={styles.required}>*</Text>
                                    </Text>
                                    {isLoadingMeta ? (
                                        <ActivityIndicator color={palette.accent} />
                                    ) : (
                                        <View style={styles.chipsWrap}>
                                            {beverageTypes.map((type) => {
                                                const selected = bevTypeId === type.id
                                                return (
                                                    <Pressable
                                                        key={type.id}
                                                        accessibilityRole="button"
                                                        onPress={() => {
                                                            Haptics.selectionAsync()
                                                            setBevTypeId(type.id)
                                                        }}
                                                        style={[styles.chip, selected && styles.chipChosen]}
                                                    >
                                                        <Text style={[styles.chipLabel, selected && styles.chipLabelChosen]}>
                                                            {formatBeverageType(type.code) || type.name}
                                                        </Text>
                                                    </Pressable>
                                                )
                                            })}
                                        </View>
                                    )}
                                </View>

                                {/* Producer */}
                                <View style={styles.field}>
                                    <View style={styles.labelRow}>
                                        <Text style={styles.fieldLabel}>{t("panels.wizard.producerLabel")}</Text>
                                        <View style={styles.tabsWrap}>
                                            <Pressable
                                                accessibilityRole="button"
                                                onPress={() => setBevProducerTab("new")}
                                                style={[styles.tab, bevProducerTab === "new" && styles.tabActive]}
                                            >
                                                <Text style={[styles.tabLabel, bevProducerTab === "new" && styles.tabLabelActive]}>
                                                    {t("panels.wizard.producerNewTab")}
                                                </Text>
                                            </Pressable>
                                            <Pressable
                                                accessibilityRole="button"
                                                onPress={() => setBevProducerTab("existing")}
                                                style={[styles.tab, bevProducerTab === "existing" && styles.tabActive]}
                                            >
                                                <Text style={[styles.tabLabel, bevProducerTab === "existing" && styles.tabLabelActive]}>
                                                    {t("panels.wizard.producerExistingTab")}
                                                </Text>
                                            </Pressable>
                                        </View>
                                    </View>

                                    {bevProducerTab === "new" ? (
                                        <View style={{ gap: 8 }}>
                                            <FormInput
                                                value={bevNewProducerName}
                                                onChangeText={setBevNewProducerName}
                                                placeholder={t("panels.wizard.producerNewPlaceholder")}
                                            />
                                            <View style={styles.noticeBox}>
                                                <Icon name="specs" size={14} color="#b45309" />
                                                <Text style={styles.noticeText}>
                                                    {t("panels.wizard.producerStubNotice")}
                                                </Text>
                                            </View>
                                        </View>
                                    ) : (
                                        <View style={styles.chipsWrap}>
                                            {producers.length === 0 ? (
                                                <Text style={styles.emptyNotice}>{t("beverage.edit.noProducers")}</Text>
                                            ) : (
                                                producers.map((prod) => {
                                                    const selected = bevProducerId === prod.id
                                                    return (
                                                        <Pressable
                                                            key={prod.id}
                                                            accessibilityRole="button"
                                                            onPress={() => {
                                                                Haptics.selectionAsync()
                                                                setBevProducerId(selected ? "" : prod.id)
                                                            }}
                                                            style={[styles.chip, selected && styles.chipChosen]}
                                                        >
                                                            <Text style={[styles.chipLabel, selected && styles.chipLabelChosen]}>
                                                                {prod.name}
                                                                {prod.claimStatus === "UNCLAIMED" ? ` (${t("panels.wizard.producerCatalogBadge")})` : ""}
                                                            </Text>
                                                        </Pressable>
                                                    )
                                                })
                                            )}
                                        </View>
                                    )}
                                </View>

                                {/* Role */}
                                <View style={styles.field}>
                                    <Text style={styles.fieldLabel}>{t("panels.wizard.roleLabel")}</Text>
                                    <View style={styles.roleGrid}>
                                        <Pressable
                                            accessibilityRole="button"
                                            onPress={() => {
                                                Haptics.selectionAsync()
                                                setBevRole("MAKER")
                                            }}
                                            style={[styles.roleButton, bevRole === "MAKER" && styles.roleButtonActive]}
                                        >
                                            <Text style={[styles.roleButtonText, bevRole === "MAKER" && styles.roleButtonTextActive]}>
                                                {t("panels.wizard.roleMaker")}
                                            </Text>
                                        </Pressable>
                                        <Pressable
                                            accessibilityRole="button"
                                            onPress={() => {
                                                Haptics.selectionAsync()
                                                setBevRole("BOTTLER")
                                            }}
                                            style={[styles.roleButton, bevRole === "BOTTLER" && styles.roleButtonActive]}
                                        >
                                            <Text style={[styles.roleButtonText, bevRole === "BOTTLER" && styles.roleButtonTextActive]}>
                                                {t("panels.wizard.roleBottler")}
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>

                                {/* Dynamic Characteristics */}
                                {isLoadingBevChars ? (
                                    <View style={styles.loadingBox}>
                                        <ActivityIndicator color={palette.accent} />
                                        <Text style={styles.loadingText}>{t("panels.wizard.loadingCharacteristics")}</Text>
                                    </View>
                                ) : bevCharacteristics.length > 0 ? (
                                    <View style={styles.sectionWrap}>
                                        <Text style={styles.sectionHeader}>{t("panels.wizard.characteristicsSection")}</Text>
                                        <CharacteristicFields
                                            characteristics={bevCharacteristics}
                                            values={bevAttributes}
                                            onChange={setBevAttributes}
                                            disabled={isCreatingBev}
                                        />
                                    </View>
                                ) : null}

                                {bevError ? (
                                    <View style={styles.error}>
                                        <Icon name="alert" size={14} color={palette.danger} />
                                        <Text style={styles.errorText}>{bevError}</Text>
                                    </View>
                                ) : null}
                            </ScrollView>
                        )
                    ) : step === 2 ? (
                        /* STEP 2: Batch */
                        batchMode === "select" ? (
                            <>
                                <Chosen label={beverage?.name ?? ""} action={t("panels.wizard.change")} onPress={() => setStep(1)} />
                                <View style={styles.headerRow}>
                                    <Text style={styles.stepTitle}>{t("panels.wizard.selectBatchTitle")}</Text>
                                    <Pressable
                                        accessibilityRole="button"
                                        onPress={() => setBatchMode("create")}
                                        style={styles.actionButton}
                                    >
                                        <Icon name="plus" size={14} color={palette.accent} weight="bold" />
                                        <Text style={styles.actionButtonLabel}>{t("panels.wizard.createBatchBtn")}</Text>
                                    </Pressable>
                                </View>
                                <ChoiceList
                                    items={batches.items}
                                    loading={batches.loading}
                                    loadingLabel={t("panels.wizard.loadingBatches")}
                                    emptyTitle={t("panels.wizard.noBatchesTitle")}
                                    emptyBody={t("panels.wizard.noBatchesDesc")}
                                    onEndReached={batches.loadMore}
                                    render={(item) => {
                                        const vintage = parseAttributes(item.attributes).vintage
                                        return {
                                            key: item.id,
                                            icon: "barcode",
                                            title: item.lotNumber ? t("panels.wizard.batchNo", { number: item.lotNumber }) : t("panels.wizard.batchNoNumber"),
                                            detail: [vintage, item.volumeMl ? `${item.volumeMl} ml` : null, `${item.id.slice(0, 8)}…`].filter(Boolean).join("  ·  "),
                                            selected: batch?.id === item.id,
                                        }
                                    }}
                                    onChoose={chooseBatch}
                                />
                            </>
                        ) : (
                            /* CREATE BATCH */
                            <ScrollView
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={styles.formScroll}
                                showsVerticalScrollIndicator={false}
                            >
                                <Chosen label={beverage?.name ?? ""} action={t("panels.wizard.change")} onPress={() => setStep(1)} />
                                <View style={styles.formHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.formTitle}>{t("panels.wizard.createBatchTitle")}</Text>
                                        <Text style={styles.formSubtitle}>{t("panels.wizard.createBatchDesc")}</Text>
                                    </View>
                                    {batches.items.length > 0 && (
                                        <Pressable accessibilityRole="button" onPress={() => setBatchMode("select")} hitSlop={8}>
                                            <Text style={styles.linkText}>{t("panels.wizard.backToList")}</Text>
                                        </Pressable>
                                    )}
                                </View>

                                {/* Lot Number */}
                                <View style={styles.field}>
                                    <Text style={styles.fieldLabel}>{t("panels.wizard.lotNumberLabel")}</Text>
                                    <FormInput
                                        value={batchLotNumber}
                                        onChangeText={setBatchLotNumber}
                                        placeholder={t("panels.wizard.lotNumberPlaceholder")}
                                        autoFocus
                                    />
                                </View>

                                {/* Batch Volume with presets */}
                                <View style={styles.field}>
                                    <Text style={styles.fieldLabel}>{t("panels.wizard.batchVolumeLabel")}</Text>
                                    <FormInput
                                        value={batchVolumeMl}
                                        onChangeText={setBatchVolumeMl}
                                        keyboardType="number-pad"
                                        placeholder="750"
                                    />
                                    <View style={styles.chipsWrap}>
                                        {BATCH_VOLUME_PRESETS.map((vol) => {
                                            const selected = batchVolumeMl === String(vol)
                                            return (
                                                <Pressable
                                                    key={vol}
                                                    accessibilityRole="button"
                                                    onPress={() => {
                                                        Haptics.selectionAsync()
                                                        setBatchVolumeMl(String(vol))
                                                    }}
                                                    style={[styles.chip, selected && styles.chipChosen]}
                                                >
                                                    <Text style={[styles.chipLabel, selected && styles.chipLabelChosen]}>
                                                        {volumePresetLabel(vol)}
                                                    </Text>
                                                </Pressable>
                                            )
                                        })}
                                    </View>
                                </View>

                                {/* Dynamic Characteristics for Batch */}
                                {isLoadingBatchChars ? (
                                    <View style={styles.loadingBox}>
                                        <ActivityIndicator color={palette.accent} />
                                        <Text style={styles.loadingText}>{t("panels.wizard.loadingCharacteristics")}</Text>
                                    </View>
                                ) : batchCharacteristics.length > 0 ? (
                                    <View style={styles.sectionWrap}>
                                        <Text style={styles.sectionHeader}>{t("panels.wizard.characteristicsSection")}</Text>
                                        <CharacteristicFields
                                            characteristics={batchCharacteristics}
                                            values={batchAttributes}
                                            onChange={setBatchAttributes}
                                            presets={true}
                                            disabled={isCreatingBatch}
                                        />
                                    </View>
                                ) : null}

                                {batchError ? (
                                    <View style={styles.error}>
                                        <Icon name="alert" size={14} color={palette.danger} />
                                        <Text style={styles.errorText}>{batchError}</Text>
                                    </View>
                                ) : null}
                            </ScrollView>
                        )
                    ) : step === 3 ? (
                        /* STEP 3: Sample */
                        sampleMode === "select" ? (
                            <>
                                <Chosen
                                    label={`${beverage?.name ?? ""} — ${batch?.lotNumber ? t("panels.lotNo", { lot: batch.lotNumber }) : t("panels.wizard.batchStep")}`}
                                    action={t("panels.wizard.change")}
                                    onPress={() => setStep(2)}
                                />
                                <View style={styles.headerRow}>
                                    <Text style={styles.stepTitle}>{t("panels.wizard.selectSampleTitle")}</Text>
                                    <Pressable
                                        accessibilityRole="button"
                                        onPress={() => setSampleMode("create")}
                                        style={styles.actionButton}
                                    >
                                        <Icon name="plus" size={14} color={palette.accent} weight="bold" />
                                        <Text style={styles.actionButtonLabel}>{t("panels.wizard.createSampleBtn")}</Text>
                                    </Pressable>
                                </View>
                                <ChoiceList
                                    items={samples.items}
                                    loading={samples.loading}
                                    loadingLabel={t("panels.wizard.loadingSamples")}
                                    emptyTitle={t("panels.wizard.noSamplesTitle")}
                                    emptyBody={t("panels.wizard.noSamplesDesc")}
                                    onEndReached={samples.loadMore}
                                    render={(item) => ({
                                        key: item.id,
                                        icon: "flask",
                                        title: `${t("panels.wizard.sampleLabel")}: ${item.volumeMl ? `${item.volumeMl} ml` : t("panels.wizard.volumeNotSpecified")}`,
                                        detail: `ID: ${item.id}`,
                                        mono: true,
                                        selected: sample?.id === item.id,
                                    })}
                                    onChoose={chooseSample}
                                />
                            </>
                        ) : (
                            /* CREATE SAMPLE */
                            <ScrollView
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={styles.formScroll}
                                showsVerticalScrollIndicator={false}
                            >
                                <Chosen
                                    label={`${beverage?.name ?? ""} — ${batch?.lotNumber ? t("panels.lotNo", { lot: batch.lotNumber }) : t("panels.wizard.batchStep")}`}
                                    action={t("panels.wizard.change")}
                                    onPress={() => setStep(2)}
                                />
                                <View style={styles.formHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.formTitle}>{t("panels.wizard.createSampleTitle")}</Text>
                                        <Text style={styles.formSubtitle}>{t("panels.wizard.createSampleDesc")}</Text>
                                    </View>
                                    {samples.items.length > 0 && (
                                        <Pressable accessibilityRole="button" onPress={() => setSampleMode("select")} hitSlop={8}>
                                            <Text style={styles.linkText}>{t("panels.wizard.backToList")}</Text>
                                        </Pressable>
                                    )}
                                </View>

                                {/* Sample Volume with presets */}
                                <View style={styles.field}>
                                    <Text style={styles.fieldLabel}>{t("panels.wizard.sampleVolumeLabel")}</Text>
                                    <FormInput
                                        value={sampleVolumeMl}
                                        onChangeText={setSampleVolumeMl}
                                        keyboardType="number-pad"
                                        placeholder="750"
                                        autoFocus
                                    />
                                    <View style={styles.chipsWrap}>
                                        {SAMPLE_VOLUME_PRESETS.map((vol) => {
                                            const selected = sampleVolumeMl === String(vol)
                                            return (
                                                <Pressable
                                                    key={vol}
                                                    accessibilityRole="button"
                                                    onPress={() => {
                                                        Haptics.selectionAsync()
                                                        setSampleVolumeMl(String(vol))
                                                    }}
                                                    style={[styles.chip, selected && styles.chipChosen]}
                                                >
                                                    <Text style={[styles.chipLabel, selected && styles.chipLabelChosen]}>
                                                        {volumePresetLabel(vol)}
                                                    </Text>
                                                </Pressable>
                                            )
                                        })}
                                    </View>
                                </View>

                                {/* Sample Code */}
                                <View style={styles.field}>
                                    <Text style={styles.fieldLabel}>{t("panels.wizard.sampleCodeLabel")}</Text>
                                    <FormInput
                                        value={sampleCode}
                                        onChangeText={setSampleCode}
                                        placeholder={t("panels.wizard.sampleCodePlaceholder")}
                                    />
                                </View>

                                {/* Dynamic Characteristics for Sample */}
                                {isLoadingSampleChars ? (
                                    <View style={styles.loadingBox}>
                                        <ActivityIndicator color={palette.accent} />
                                        <Text style={styles.loadingText}>{t("panels.wizard.loadingCharacteristics")}</Text>
                                    </View>
                                ) : sampleCharacteristics.length > 0 ? (
                                    <View style={styles.sectionWrap}>
                                        <Text style={styles.sectionHeader}>{t("panels.wizard.characteristicsSection")}</Text>
                                        <CharacteristicFields
                                            characteristics={sampleCharacteristics}
                                            values={sampleAttributes}
                                            onChange={setSampleAttributes}
                                            disabled={isCreatingSample}
                                        />
                                    </View>
                                ) : null}

                                {sampleError ? (
                                    <View style={styles.error}>
                                        <Icon name="alert" size={14} color={palette.danger} />
                                        <Text style={styles.errorText}>{sampleError}</Text>
                                    </View>
                                ) : null}
                            </ScrollView>
                        )
                    ) : (
                        /* STEP 4: Code & Submit */
                        <View style={styles.summaryStep}>
                            <View style={styles.summary}>
                                <Text style={styles.summaryTitle}>{t("panels.wizard.summaryTitle")}</Text>
                                <View style={styles.summaryGrid}>
                                    <SummaryCell label={t("panels.wizard.beverageStep")} value={beverage?.name ?? ""} />
                                    <SummaryCell label={t("panels.wizard.batchLotLabel")} value={batch?.lotNumber || "—"} />
                                    <SummaryCell
                                        label={t("panels.wizard.sampleStep")}
                                        value={sample?.volumeMl ? `${sample.volumeMl} ml` : t("panels.wizard.selected")}
                                    />
                                    <SummaryCell label={t("panels.wizard.panelLabel")} value={panelName} />
                                </View>
                            </View>
                            <View style={styles.field}>
                                <Text style={styles.fieldLabel}>{t("panels.wizard.anonymizedCodeLabel")}</Text>
                                <View style={styles.search}>
                                    <Icon name="tag" size={16} color={palette.textFaint} />
                                    <TextInput
                                        value={code}
                                        onChangeText={setCode}
                                        autoFocus
                                        autoCapitalize="characters"
                                        autoCorrect={false}
                                        returnKeyType="done"
                                        onSubmitEditing={submit}
                                        placeholder={t("panels.wizard.anonymizedCodePlaceholder")}
                                        placeholderTextColor={palette.textFaint}
                                        style={styles.searchInput}
                                    />
                                </View>
                                <Text style={styles.fieldHint}>{t("panels.wizard.anonymizedCodeDesc")}</Text>
                            </View>
                            {error ? (
                                <View style={styles.error}>
                                    <Icon name="alert" size={14} color={palette.danger} />
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            ) : null}
                        </View>
                    )}
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    {/* Back button */}
                    {step === 1 ? (
                        beverageMode === "create" ? (
                            <Pressable
                                accessibilityRole="button"
                                onPress={() => setBeverageMode("select")}
                                disabled={isCreatingBev}
                                style={({ pressed }) => [styles.back, pressed && styles.dimmed]}
                            >
                                <Icon name="chevronLeft" size={14} color={palette.textMuted} weight="semibold" />
                                <Text style={styles.backLabel}>{t("panels.wizard.backToList")}</Text>
                            </Pressable>
                        ) : (
                            <View />
                        )
                    ) : step === 2 ? (
                        batchMode === "create" && batches.items.length > 0 ? (
                            <Pressable
                                accessibilityRole="button"
                                onPress={() => setBatchMode("select")}
                                disabled={isCreatingBatch}
                                style={({ pressed }) => [styles.back, pressed && styles.dimmed]}
                            >
                                <Icon name="chevronLeft" size={14} color={palette.textMuted} weight="semibold" />
                                <Text style={styles.backLabel}>{t("panels.wizard.backToList")}</Text>
                            </Pressable>
                        ) : (
                            <Pressable
                                accessibilityRole="button"
                                onPress={() => {
                                    setStep(1)
                                    setBeverageMode("select")
                                }}
                                disabled={isCreatingBatch}
                                style={({ pressed }) => [styles.back, pressed && styles.dimmed]}
                            >
                                <Icon name="chevronLeft" size={14} color={palette.textMuted} weight="semibold" />
                                <Text style={styles.backLabel}>{t("panels.wizard.back")}</Text>
                            </Pressable>
                        )
                    ) : step === 3 ? (
                        sampleMode === "create" && samples.items.length > 0 ? (
                            <Pressable
                                accessibilityRole="button"
                                onPress={() => setSampleMode("select")}
                                disabled={isCreatingSample}
                                style={({ pressed }) => [styles.back, pressed && styles.dimmed]}
                            >
                                <Icon name="chevronLeft" size={14} color={palette.textMuted} weight="semibold" />
                                <Text style={styles.backLabel}>{t("panels.wizard.backToList")}</Text>
                            </Pressable>
                        ) : (
                            <Pressable
                                accessibilityRole="button"
                                onPress={() => {
                                    setStep(2)
                                    setBatchMode("select")
                                }}
                                disabled={isCreatingSample}
                                style={({ pressed }) => [styles.back, pressed && styles.dimmed]}
                            >
                                <Icon name="chevronLeft" size={14} color={palette.textMuted} weight="semibold" />
                                <Text style={styles.backLabel}>{t("panels.wizard.back")}</Text>
                            </Pressable>
                        )
                    ) : (
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => {
                                setStep(3)
                                setSampleMode("select")
                            }}
                            disabled={submitting}
                            style={({ pressed }) => [styles.back, pressed && styles.dimmed]}
                        >
                            <Icon name="chevronLeft" size={14} color={palette.textMuted} weight="semibold" />
                            <Text style={styles.backLabel}>{t("panels.wizard.back")}</Text>
                        </Pressable>
                    )}

                    {/* Action buttons */}
                    <View style={styles.footerActions}>
                        {step === 1 && beverageMode === "create" && (
                            <PressableSurface
                                onPress={handleCreateBeverage}
                                disabled={isCreatingBev}
                                style={[styles.submit, isCreatingBev && styles.dimmed]}
                            >
                                {isCreatingBev ? (
                                    <ActivityIndicator size="small" color={palette.onAccent} />
                                ) : (
                                    <Icon name="arrow" size={16} color={palette.onAccent} weight="semibold" />
                                )}
                                <Text style={styles.submitLabel}>{t("panels.wizard.createAndContinue")}</Text>
                            </PressableSurface>
                        )}

                        {step === 2 && batchMode === "create" && (
                            <PressableSurface
                                onPress={handleCreateBatch}
                                disabled={isCreatingBatch}
                                style={[styles.submit, isCreatingBatch && styles.dimmed]}
                            >
                                {isCreatingBatch ? (
                                    <ActivityIndicator size="small" color={palette.onAccent} />
                                ) : (
                                    <Icon name="arrow" size={16} color={palette.onAccent} weight="semibold" />
                                )}
                                <Text style={styles.submitLabel}>{t("panels.wizard.createAndContinue")}</Text>
                            </PressableSurface>
                        )}

                        {step === 3 && sampleMode === "create" && (
                            <PressableSurface
                                onPress={handleCreateSample}
                                disabled={isCreatingSample}
                                style={[styles.submit, isCreatingSample && styles.dimmed]}
                            >
                                {isCreatingSample ? (
                                    <ActivityIndicator size="small" color={palette.onAccent} />
                                ) : (
                                    <Icon name="arrow" size={16} color={palette.onAccent} weight="semibold" />
                                )}
                                <Text style={styles.submitLabel}>{t("panels.wizard.createAndContinue")}</Text>
                            </PressableSurface>
                        )}

                        {step === 4 && (
                            <PressableSurface onPress={submit} disabled={submitting} style={[styles.submit, submitting && styles.dimmed]}>
                                {submitting ? (
                                    <ActivityIndicator size="small" color={palette.onAccent} />
                                ) : (
                                    <Icon name="plus" size={16} color={palette.onAccent} weight="semibold" />
                                )}
                                <Text style={styles.submitLabel}>{t("panels.wizard.addCandidate")}</Text>
                            </PressableSurface>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    )
}

function ChoiceList<T>({
    items,
    loading,
    loadingLabel,
    emptyTitle,
    emptyBody,
    onEndReached,
    render,
    onChoose,
}: {
    items: T[]
    loading: boolean
    loadingLabel: string
    emptyTitle: string
    emptyBody?: string
    onEndReached: () => void
    render: (item: T) => { key: string; icon: IconName; title: string; detail?: string; mono?: boolean; selected: boolean }
    onChoose: (item: T) => void
}) {
    return (
        <FlatList
            data={items}
            keyExtractor={(item) => render(item).key}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
                loading ? null : (
                    <View style={styles.empty}>
                        <Text style={styles.emptyTitle}>{emptyTitle}</Text>
                        {emptyBody ? <Text style={styles.emptyBody}>{emptyBody}</Text> : null}
                    </View>
                )
            }
            ListFooterComponent={
                loading ? (
                    <View style={styles.loading}>
                        <ActivityIndicator color={palette.accent} />
                        {items.length === 0 ? <Text style={styles.loadingLabel}>{loadingLabel}</Text> : null}
                    </View>
                ) : null
            }
            renderItem={({ item }) => {
                const row = render(item)
                return (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: row.selected }}
                        onPress={() => onChoose(item)}
                        style={({ pressed }) => [styles.choice, row.selected && styles.choiceSelected, pressed && styles.choicePressed]}
                    >
                        <View style={[styles.choiceTile, row.selected && styles.choiceTileSelected]}>
                            <Icon name={row.icon} size={16} color={row.selected ? palette.onAccent : palette.accent} />
                        </View>
                        <View style={styles.choiceText}>
                            <Text style={styles.choiceTitle} numberOfLines={1}>
                                {row.title}
                            </Text>
                            {row.detail ? (
                                <Text style={[styles.choiceDetail, row.mono && styles.mono]} numberOfLines={1}>
                                    {row.detail}
                                </Text>
                            ) : null}
                        </View>
                        <Icon name="chevron" size={14} color={palette.textGhost} weight="semibold" />
                    </Pressable>
                )
            }}
        />
    )
}

function Chosen({ label, action, onPress }: { label: string; action: string; onPress: () => void }) {
    return (
        <View style={styles.chosen}>
            <Icon name="done" size={14} color={palette.accent} weight="bold" />
            <Text style={styles.chosenLabel} numberOfLines={1}>
                {label}
            </Text>
            <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
                <Text style={styles.chosenAction}>{action}</Text>
            </Pressable>
        </View>
    )
}

function SummaryCell({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>{label}</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>
                {value}
            </Text>
        </View>
    )
}

const styles = StyleSheet.create({
    sheet: { flex: 1, backgroundColor: palette.surface },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: palette.borderSoft,
        backgroundColor: "rgba(248, 250, 252, 0.5)",
    },
    headerText: { flex: 1, minWidth: 0 },
    title: { fontSize: 16, fontWeight: "700", color: palette.heading },
    subtitle: { fontSize: 12, color: palette.textFaint },
    subtitleStrong: { fontWeight: "600", color: "#45556c" },
    close: { padding: 8 },
    steps: { flexDirection: "row", gap: 4, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: palette.borderSoft },
    step: { flex: 1, alignItems: "center", gap: 4 },
    stepDot: {
        width: 26,
        height: 26,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 13,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.background,
    },
    stepDotDone: { borderColor: "#00bc7d", backgroundColor: "#00bc7d" },
    stepDotActive: { borderColor: palette.accent, backgroundColor: palette.accent },
    stepLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3, textTransform: "uppercase", color: palette.textFaint },
    stepLabelActive: { color: palette.heading },
    body: { flex: 1, paddingHorizontal: 20, paddingTop: 16, gap: 12 },
    actionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: radius.md,
        backgroundColor: palette.accentSoft,
        borderWidth: 1,
        borderColor: palette.accentBorder,
    },
    actionButtonLabel: { fontSize: 12, fontWeight: "700", color: palette.accent },
    search: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 14,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.background,
        ...continuous,
    },
    searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, fontWeight: "500", color: palette.heading },
    stepTitle: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.textMuted },
    list: { paddingBottom: 24 },
    separator: { height: 8 },
    choice: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.surface,
        ...continuous,
    },
    choiceSelected: { borderColor: "#a3b3ff", backgroundColor: "rgba(238, 242, 255, 0.5)" },
    choicePressed: { backgroundColor: palette.background },
    choiceTile: {
        width: 34,
        height: 34,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: palette.accentSoft,
    },
    choiceTileSelected: { borderColor: palette.accent, backgroundColor: palette.accent },
    choiceText: { flex: 1, minWidth: 0, gap: 2 },
    choiceTitle: { fontSize: 14, fontWeight: "600", color: palette.heading },
    choiceDetail: { fontSize: 11, color: palette.textFaint },
    mono: { fontFamily: MONOSPACE, fontSize: 10 },
    empty: { alignItems: "center", gap: 6, paddingVertical: 32, paddingHorizontal: 16 },
    emptyTitle: { fontSize: 13, fontWeight: "700", color: palette.textStrong, textAlign: "center" },
    emptyBody: { fontSize: 12, color: palette.textFaint, textAlign: "center" },
    loading: { alignItems: "center", gap: 8, paddingVertical: 24 },
    loadingLabel: { fontSize: 12, fontWeight: "600", color: palette.textFaint },
    chosen: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: "rgba(238, 242, 255, 0.4)",
        ...continuous,
    },
    chosenLabel: { flex: 1, fontSize: 13, fontWeight: "700", color: palette.heading },
    chosenAction: { fontSize: 12, fontWeight: "700", color: palette.accent },
    summaryStep: { gap: 16 },
    summary: {
        gap: 12,
        padding: 16,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: "rgba(238, 242, 255, 0.4)",
        ...continuous,
    },
    summaryTitle: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.accent },
    summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    summaryCell: {
        width: "47%",
        flexGrow: 1,
        padding: 10,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.accentSoft,
        backgroundColor: "rgba(255, 255, 255, 0.8)",
    },
    summaryLabel: { fontSize: 10, color: palette.textFaint },
    summaryValue: { fontSize: 12, fontWeight: "700", color: palette.heading },
    field: { gap: 8 },
    fieldLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: "#45556c" },
    required: { color: palette.danger },
    fieldHint: { fontSize: 11, color: palette.textFaint },
    error: { flexDirection: "row", alignItems: "center", gap: 6 },
    errorText: { flex: 1, fontSize: 12, fontWeight: "600", color: palette.danger },
    footer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 28,
        borderTopWidth: 1,
        borderTopColor: palette.borderSoft,
        backgroundColor: "rgba(248, 250, 252, 0.5)",
    },
    footerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    back: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8 },
    backLabel: { fontSize: 13, fontWeight: "700", color: palette.textMuted },
    submit: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 11,
        borderRadius: radius.md,
        backgroundColor: palette.accent,
        ...continuous,
    },
    submitLabel: { fontSize: 13, fontWeight: "700", color: palette.onAccent },
    dimmed: { opacity: 0.5 },
    // Forms styling
    formScroll: { gap: 18, paddingBottom: 32 },
    formHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: palette.borderSoft },
    formTitle: { fontSize: 15, fontWeight: "700", color: palette.heading },
    formSubtitle: { fontSize: 11, color: palette.textFaint },
    linkText: { fontSize: 12, fontWeight: "700", color: palette.accent },
    labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
    chipChosen: { borderColor: palette.accent, backgroundColor: palette.accent },
    chipLabel: { fontSize: 12, fontWeight: "700", color: "#45556c" },
    chipLabelChosen: { color: palette.onAccent },
    tabsWrap: { flexDirection: "row", backgroundColor: palette.background, borderRadius: radius.md, padding: 2, borderWidth: 1, borderColor: palette.borderSoft },
    tab: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm },
    tabActive: { backgroundColor: palette.surface },
    tabLabel: { fontSize: 11, fontWeight: "700", color: palette.textFaint },
    tabLabelActive: { color: palette.accent },
    noticeBox: { flexDirection: "row", gap: 8, padding: 10, borderRadius: radius.md, backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fef3c7" },
    noticeText: { flex: 1, fontSize: 11, color: "#92400e", lineHeight: 16 },
    emptyNotice: { fontSize: 12, color: palette.textFaint, fontStyle: "italic" },
    roleGrid: { flexDirection: "row", gap: 10 },
    roleButton: { flex: 1, paddingVertical: 10, alignItems: "center", justifyContent: "center", borderRadius: radius.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
    roleButtonActive: { borderColor: palette.accent, backgroundColor: palette.accentSoft },
    roleButtonText: { fontSize: 12, fontWeight: "700", color: palette.textMuted },
    roleButtonTextActive: { color: palette.accent },
    sectionWrap: { gap: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: palette.borderSoft },
    sectionHeader: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: palette.textFaint },
    loadingBox: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
    loadingText: { fontSize: 12, color: palette.textFaint },
})
