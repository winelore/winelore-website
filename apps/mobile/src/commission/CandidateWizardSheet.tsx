import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import * as Haptics from "expo-haptics"
import { parseAttributes } from "@winelore/core/evaluation"
import type { WizardBatch, WizardPage, WizardSample } from "@winelore/core/commission"
import { useTranslation } from "../i18n/LocaleProvider"
import { MONOSPACE, continuous, palette, radius } from "../theme"
import { Icon, type IconName } from "../ui/Icon"
import { PressableSurface } from "../ui/Pressable"
import { batchesPage, beveragesPage, samplesPage } from "./mutations"

interface CandidateWizardSheetProps {
    visible: boolean
    panelName: string
    auid: string
    onClose: () => void
    /** Add the chosen sample; resolves to an error message, or null once added. */
    onAdd: (sampleId: string, code: string) => Promise<string | null>
}

type Beverage = { id: string; name: string }
type Step = 1 | 2 | 3 | 4

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
 * The web's "Add Sample to Panel" wizard, as a page sheet: choose the
 * beverage, then its batch, then the sample, then give it a code. Each list
 * loads more as it scrolls.
 */
export function CandidateWizardSheet({ visible, panelName, auid, onClose, onAdd }: CandidateWizardSheetProps) {
    const { t } = useTranslation()
    const [step, setStep] = useState<Step>(1)
    const [search, setSearch] = useState("")
    const [debounced, setDebounced] = useState("")
    const [beverage, setBeverage] = useState<Beverage | null>(null)
    const [batch, setBatch] = useState<WizardBatch | null>(null)
    const [sample, setSample] = useState<WizardSample | null>(null)
    const [code, setCode] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!visible) return
        setStep(1)
        setSearch("")
        setDebounced("")
        setBeverage(null)
        setBatch(null)
        setSample(null)
        setCode("")
        setError(null)
    }, [visible])

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(search), 250)
        return () => clearTimeout(timer)
    }, [search])

    // Each list loads once there is something to list: beverages while the sheet is open, then
    // the chosen beverage's batches, then the chosen batch's samples.
    const beverages = usePaged<Beverage>(
        useMemo(() => (visible ? (page: number) => beveragesPage(debounced, page, auid) : null), [visible, debounced, auid]),
    )
    const batches = usePaged<WizardBatch>(
        useMemo(() => (beverage ? (page: number) => batchesPage(beverage.id, page, auid) : null), [beverage, auid]),
    )
    const samples = usePaged<WizardSample>(
        useMemo(() => (batch ? (page: number) => samplesPage(batch.id, page, auid) : null), [batch, auid]),
    )

    const choose = <T,>(set: (value: T) => void, next: Step) => (value: T) => {
        Haptics.selectionAsync()
        set(value)
        setStep(next)
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

                <View style={styles.body}>
                    {step === 1 ? (
                        <>
                            <View style={styles.search}>
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
                            <ChoiceList
                                items={beverages.items}
                                loading={beverages.loading}
                                loadingLabel={t("panels.wizard.loadingBeverages")}
                                emptyTitle={debounced.trim() ? t("panels.wizard.noBeveragesFound") : t("panels.wizard.noBeveragesAvailable")}
                                onEndReached={beverages.loadMore}
                                render={(item) => ({ key: item.id, icon: "beverage", title: item.name, selected: beverage?.id === item.id })}
                                onChoose={choose(setBeverage, 2)}
                            />
                        </>
                    ) : step === 2 ? (
                        <>
                            <Chosen label={beverage?.name ?? ""} action={t("panels.wizard.change")} onPress={() => setStep(1)} />
                            <Text style={styles.stepTitle}>{t("panels.wizard.selectBatchTitle")}</Text>
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
                                onChoose={choose(setBatch, 3)}
                            />
                        </>
                    ) : step === 3 ? (
                        <>
                            <Chosen
                                label={`${beverage?.name ?? ""} — ${batch?.lotNumber ? t("panels.lotNo", { lot: batch.lotNumber }) : t("panels.wizard.batchStep")}`}
                                action={t("panels.wizard.change")}
                                onPress={() => setStep(2)}
                            />
                            <Text style={styles.stepTitle}>{t("panels.wizard.selectSampleTitle")}</Text>
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
                                onChoose={choose(setSample, 4)}
                            />
                        </>
                    ) : (
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

                <View style={styles.footer}>
                    {step > 1 ? (
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => setStep((step - 1) as Step)}
                            disabled={submitting}
                            style={({ pressed }) => [styles.back, pressed && styles.dimmed]}
                        >
                            <Icon name="chevronLeft" size={14} color={palette.textMuted} weight="semibold" />
                            <Text style={styles.backLabel}>{t("panels.wizard.back")}</Text>
                        </Pressable>
                    ) : (
                        <View />
                    )}
                    {step === 4 ? (
                        <PressableSurface onPress={submit} disabled={submitting} style={[styles.submit, submitting && styles.dimmed]}>
                            {submitting ? (
                                <ActivityIndicator size="small" color={palette.onAccent} />
                            ) : (
                                <Icon name="plus" size={16} color={palette.onAccent} weight="semibold" />
                            )}
                            <Text style={styles.submitLabel}>{t("panels.wizard.addCandidate")}</Text>
                        </PressableSurface>
                    ) : null}
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
})
