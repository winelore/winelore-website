import { useState } from "react"
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from "react-native"
import * as Haptics from "expo-haptics"
import { batchFigures, parseAttributes, type BeverageBatch } from "@winelore/core/beverage"
import { useTranslation } from "../i18n/LocaleProvider"
import { MONOSPACE, continuous, palette, radius } from "../theme"
import { Icon, type IconName } from "../ui/Icon"
import { EmptyCard, PrimaryButton, SectionTitle, allocationColor } from "./parts"

export interface BatchDraft {
    vintage: string
    abv: string
    volumeMl: string
    lotNumber: string
}

interface BatchesTabProps {
    batches: BeverageBatch[]
    canEdit: boolean
    busyBatchId: string | null
    onSaveBatch: (batch: BeverageBatch, draft: BatchDraft) => Promise<boolean>
    onCreateBatch: () => void
    onAddSample: (batch: BeverageBatch) => void
    onShowSamples: (batch: BeverageBatch) => void
}

// iOS decimal pads have no minus key; ABV never needs one.
const DECIMAL_KEYBOARD: KeyboardTypeOptions = Platform.select({
    ios: "numbers-and-punctuation",
    default: "decimal-pad",
})

/** "Vintages & Batches": each batch with its figures and how much has gone to samples. */
export function BatchesTab({ batches, canEdit, busyBatchId, onSaveBatch, onCreateBatch, onAddSample, onShowSamples }: BatchesTabProps) {
    const { t } = useTranslation()
    return (
        <View style={styles.tab}>
            <View style={styles.head}>
                <SectionTitle title={t("beverage.batches.title")} subtitle={t("beverage.batches.subtitle")} />
                <PrimaryButton label={t("batch.createButton")} icon="plus" onPress={onCreateBatch} />
            </View>

            {batches.length > 0 ? (
                batches.map((batch) => (
                    <BatchCard
                        key={batch.id}
                        batch={batch}
                        canEdit={canEdit}
                        busy={busyBatchId === batch.id}
                        onSave={(draft) => onSaveBatch(batch, draft)}
                        onAddSample={() => onAddSample(batch)}
                        onShowSamples={() => onShowSamples(batch)}
                    />
                ))
            ) : (
                <EmptyCard
                    icon="barcode"
                    title={t("beverage.batches.emptyTitle")}
                    description={t("beverage.batches.emptyDesc")}
                >
                    <PrimaryButton label={t("batch.createFirstBatchButton")} icon="plus" onPress={onCreateBatch} large />
                </EmptyCard>
            )}
        </View>
    )
}

function BatchCard({
    batch,
    canEdit,
    busy,
    onSave,
    onAddSample,
    onShowSamples,
}: {
    batch: BeverageBatch
    canEdit: boolean
    busy: boolean
    onSave: (draft: BatchDraft) => Promise<boolean>
    onAddSample: () => void
    onShowSamples: () => void
}) {
    const { t, locale } = useTranslation()
    const figures = batchFigures(batch)
    const ml = t("common.milliliters")
    const amount = (value: number) => `${value.toLocaleString(locale)} ${ml}`

    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState<BatchDraft>({ vintage: "", abv: "", volumeMl: "", lotNumber: "" })

    const openEdit = () => {
        const attrs = parseAttributes(batch.attributes)
        setDraft({
            vintage: attrs.vintage ?? "",
            abv: figures.abv ? figures.abv.replace("%", "") : "",
            volumeMl: batch.volumeMl !== null && batch.volumeMl !== undefined ? String(batch.volumeMl) : "",
            lotNumber: batch.lotNumber || "",
        })
        Haptics.selectionAsync()
        setEditing(true)
    }

    const save = async () => {
        const vintage = draft.vintage.trim()
        if (vintage && (!/^\d{4}$/.test(vintage) || Number(vintage) < 1900 || Number(vintage) > 2100)) {
            Alert.alert(t("beverage.batches.title"), t("beverage.batches.invalidVintage"))
            return
        }
        const abvRaw = draft.abv.trim().replace(",", ".")
        if (abvRaw) {
            const abv = Number(abvRaw)
            if (Number.isNaN(abv) || abv <= 0 || abv > 100) {
                Alert.alert(t("beverage.batches.title"), t("beverage.batches.invalidAbv"))
                return
            }
        }
        const volumeRaw = draft.volumeMl.trim()
        if (volumeRaw) {
            const volume = Number.parseInt(volumeRaw, 10)
            if (Number.isNaN(volume) || volume <= 0) {
                Alert.alert(t("beverage.batches.title"), t("beverage.batches.generalError"))
                return
            }
        }
        if (await onSave({ vintage, abv: abvRaw, volumeMl: volumeRaw, lotNumber: draft.lotNumber.trim() })) {
            setEditing(false)
        }
    }

    return (
        <View style={styles.card}>
            <View style={styles.accentBar} />
            <View style={styles.cardHead}>
                <View style={styles.vintage}>
                    <Icon name="calendar" size={16} color={palette.accent} />
                    {editing ? (
                        <TextInput
                            value={draft.vintage}
                            onChangeText={(value) => setDraft({ ...draft, vintage: value })}
                            autoFocus
                            keyboardType="numeric"
                            returnKeyType="done"
                            onSubmitEditing={save}
                            editable={!busy}
                            style={styles.headInput}
                            placeholder={t("beverage.batches.vintage")}
                            placeholderTextColor={palette.textFaint}
                            accessibilityLabel={t("beverage.batches.vintage")}
                        />
                    ) : (
                        <Text style={styles.vintageLabel}>
                            {figures.vintage ? `${t("beverage.batches.vintage")} ${figures.vintage}` : t("beverage.batches.noVintage")}
                        </Text>
                    )}
                </View>
                <View style={styles.headRight}>
                    <Text style={styles.batchId}>ID: {batch.id.slice(-6).toUpperCase()}</Text>
                    {canEdit ? (
                        editing ? (
                            <View style={styles.editActions}>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={t("common.save")}
                                    onPress={save}
                                    disabled={busy}
                                    style={({ pressed }) => [styles.saveButton, (pressed || busy) && styles.dimmed]}
                                >
                                    {busy ? (
                                        <ActivityIndicator size="small" color={palette.onAccent} />
                                    ) : (
                                        <Icon name="done" size={14} color={palette.onAccent} weight="bold" />
                                    )}
                                </Pressable>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={t("competition.cancel")}
                                    onPress={() => setEditing(false)}
                                    disabled={busy}
                                    style={({ pressed }) => [styles.cancelButton, pressed && styles.dimmed]}
                                >
                                    <Icon name="close" size={14} color={palette.textMuted} weight="bold" />
                                </Pressable>
                            </View>
                        ) : (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t("common.edit")}
                                hitSlop={8}
                                onPress={openEdit}
                                style={({ pressed }) => [styles.pencil, pressed && styles.dimmed]}
                            >
                                <Icon name="edit" size={16} color={palette.textFaint} />
                            </Pressable>
                        )
                    ) : null}
                </View>
            </View>

            <View style={styles.stats}>
                <Stat
                    icon="percent"
                    label={t("beverage.batches.abv")}
                    value={figures.abv ?? t("common.na")}
                    editing={editing}
                    editValue={draft.abv}
                    onEditValue={(value) => setDraft({ ...draft, abv: value })}
                    onSave={save}
                    busy={busy}
                    keyboardType={DECIMAL_KEYBOARD}
                    placeholder="%"
                    accessibilityLabel={t("beverage.batches.abv")}
                />
                <Stat
                    icon="droplet"
                    label={t("beverage.batches.volume")}
                    value={batch.volumeMl !== undefined && batch.volumeMl !== null ? `${batch.volumeMl} ${ml}` : t("common.na")}
                    editing={editing}
                    editValue={draft.volumeMl}
                    onEditValue={(value) => setDraft({ ...draft, volumeMl: value })}
                    onSave={save}
                    busy={busy}
                    keyboardType="numeric"
                    placeholder="ml"
                    accessibilityLabel={t("beverage.batches.volume")}
                />
                <Stat
                    icon="barcode"
                    label={t("beverage.batches.lotNumber")}
                    value={batch.lotNumber || t("common.na")}
                    editing={editing}
                    editValue={draft.lotNumber}
                    onEditValue={(value) => setDraft({ ...draft, lotNumber: value })}
                    onSave={save}
                    busy={busy}
                    placeholder="Lot #"
                    accessibilityLabel={t("beverage.batches.lotNumber")}
                />
            </View>

            <View style={styles.samples}>
                <View style={styles.samplesHead}>
                    <View style={styles.samplesTitle}>
                        <Icon name="flask" size={14} color={palette.accent} />
                        <Text style={styles.samplesLabel}>{t("sample.samplesTitle")}</Text>
                        <View style={styles.samplesCount}>
                            <Text style={styles.samplesCountLabel}>{batch.samples.length}</Text>
                        </View>
                    </View>
                    <Pressable
                        accessibilityRole="link"
                        hitSlop={8}
                        onPress={onAddSample}
                        style={({ pressed }) => [styles.addSample, pressed && styles.dimmed]}
                    >
                        <Icon name="plus" size={12} color={palette.accent} weight="bold" />
                        <Text style={styles.addSampleLabel}>{t("sample.addSampleButton")}</Text>
                    </Pressable>
                </View>

                {batch.samples.length > 0 ? (
                    <View style={styles.samplesBody}>
                        <View style={styles.groups}>
                            {figures.sampleGroups.map((group) => (
                                <View key={group.volumeMl ?? "standard"} style={styles.group}>
                                    <Icon name="droplet" size={12} color={palette.accentBright} />
                                    <Text style={styles.groupLabel}>
                                        {group.count} × {group.volumeMl ? amount(group.volumeMl) : t("common.standard")}
                                    </Text>
                                </View>
                            ))}
                            <Pressable
                                accessibilityRole="button"
                                onPress={onShowSamples}
                                style={({ pressed }) => [styles.showAll, pressed && styles.showAllPressed]}
                            >
                                <Text style={styles.showAllLabel}>
                                    {t("sample.viewAllSamples")} ({batch.samples.length})
                                </Text>
                                <Icon name="chevron" size={10} color="#432dd7" weight="bold" />
                            </Pressable>
                        </View>

                        {figures.batchVolume !== null && figures.allocationTone ? (
                            <View style={styles.allocation}>
                                <View style={styles.allocationRow}>
                                    <Text style={styles.allocationText}>
                                        {t("sample.allocatedVolume", {
                                            used: figures.sampleVolume.toLocaleString(locale),
                                            total: figures.batchVolume.toLocaleString(locale),
                                        })}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.allocationPercent,
                                            figures.allocationTone === "over" && styles.allocationPercentOver,
                                        ]}
                                    >
                                        {figures.allocatedPercent}%
                                    </Text>
                                </View>
                                <View style={styles.track}>
                                    <View
                                        style={[
                                            styles.fill,
                                            {
                                                width: `${(figures.allocatedFraction ?? 0) * 100}%`,
                                                backgroundColor: allocationColor[figures.allocationTone],
                                            },
                                        ]}
                                    />
                                </View>
                            </View>
                        ) : null}
                    </View>
                ) : (
                    <Text style={styles.noSamples}>{t("sample.emptySamplesDesc")}</Text>
                )}
            </View>
        </View>
    )
}

function Stat({
    icon,
    label,
    value,
    editing,
    editValue,
    onEditValue,
    onSave,
    busy,
    keyboardType,
    placeholder,
    accessibilityLabel,
}: {
    icon: IconName
    label: string
    value: string
    editing: boolean
    editValue: string
    onEditValue: (value: string) => void
    onSave: () => void
    busy: boolean
    keyboardType?: KeyboardTypeOptions
    placeholder?: string
    accessibilityLabel?: string
}) {
    return (
        <View style={styles.stat}>
            <Icon name={icon} size={16} color="rgba(79, 57, 246, 0.8)" />
            <Text style={styles.statLabel}>{label}</Text>
            {editing ? (
                <TextInput
                    value={editValue}
                    onChangeText={onEditValue}
                    keyboardType={keyboardType}
                    returnKeyType="done"
                    onSubmitEditing={onSave}
                    editable={!busy}
                    style={styles.statInput}
                    placeholder={placeholder}
                    placeholderTextColor={palette.textFaint}
                    accessibilityLabel={accessibilityLabel}
                />
            ) : (
                <Text style={styles.statValue} numberOfLines={1}>
                    {value}
                </Text>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    tab: { gap: 24 },
    head: { gap: 16 },
    // bg-white border-slate-100 rounded-[24px] p-5 shadow-md
    card: {
        overflow: "hidden",
        padding: 20,
        paddingLeft: 24,
        borderRadius: radius.panel,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.surface,
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
        ...continuous,
    },
    accentBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: palette.accent, opacity: 0.6 },
    cardHead: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        paddingBottom: 12,
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: palette.background,
    },
    vintage: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
    vintageLabel: { flexShrink: 1, fontSize: 16, fontWeight: "700", color: palette.heading },
    headRight: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },
    headInput: {
        flex: 1,
        minWidth: 0,
        fontSize: 16,
        fontWeight: "700",
        color: palette.text,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: "#7c86ff", // indigo-400
        backgroundColor: palette.surface,
    },
    editActions: { flexDirection: "row", alignItems: "center", gap: 6 },
    saveButton: {
        width: 32,
        height: 32,
        borderRadius: radius.sm,
        backgroundColor: palette.accent,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelButton: {
        width: 32,
        height: 32,
        borderRadius: radius.sm,
        backgroundColor: palette.borderSoft,
        alignItems: "center",
        justifyContent: "center",
    },
    pencil: { padding: 6, borderRadius: radius.sm },
    batchId: { fontFamily: MONOSPACE, fontSize: 10, fontWeight: "700", color: palette.textFaint },
    stats: { flexDirection: "row", gap: 12, marginBottom: 16 },
    stat: {
        flex: 1,
        minWidth: 0,
        alignItems: "center",
        padding: 12,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: "rgba(241, 245, 249, 0.5)",
        backgroundColor: "rgba(248, 250, 252, 0.5)",
        ...continuous,
    },
    statLabel: { marginTop: 4, fontSize: 9, fontWeight: "700", textTransform: "uppercase", color: palette.textFaint },
    statValue: { marginTop: 2, fontSize: 12, fontWeight: "700", color: palette.textStrong },
    statInput: {
        marginTop: 2,
        width: "100%",
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: palette.text,
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: "#7c86ff", // indigo-400
        backgroundColor: palette.surface,
    },
    // mt-2 pt-3 border-t bg-slate-50/50 -mx-5 -mb-5 p-4
    samples: {
        marginTop: 8,
        marginLeft: -24,
        marginRight: -20,
        marginBottom: -20,
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: palette.borderSoft,
        backgroundColor: "rgba(248, 250, 252, 0.5)",
    },
    samplesHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    samplesTitle: { flexDirection: "row", alignItems: "center", gap: 6 },
    samplesLabel: { fontSize: 12, fontWeight: "700", color: palette.textStrong },
    samplesCount: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: palette.accentSoft,
    },
    samplesCountLabel: { fontSize: 10, fontWeight: "700", color: palette.accent },
    addSample: { flexDirection: "row", alignItems: "center", gap: 4 },
    addSampleLabel: { fontSize: 11, fontWeight: "700", color: palette.accent },
    dimmed: { opacity: 0.6 },
    samplesBody: { gap: 10 },
    groups: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
    group: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
    },
    groupLabel: { fontSize: 11, fontWeight: "700", color: palette.textStrong },
    showAll: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#c6d2ff", // indigo-200
        backgroundColor: "rgba(238, 242, 255, 0.7)",
    },
    showAllPressed: { backgroundColor: palette.accentBorder },
    showAllLabel: { fontSize: 11, fontWeight: "700", color: "#432dd7" }, // indigo-700
    allocation: {
        padding: 10,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: "rgba(255, 255, 255, 0.7)",
    },
    allocationRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    allocationText: { flexShrink: 1, fontSize: 10, fontWeight: "600", color: palette.textMuted },
    allocationPercent: { fontSize: 10, fontWeight: "700", color: palette.accent },
    allocationPercentOver: { color: palette.danger },
    track: { marginTop: 6, height: 6, borderRadius: 3, overflow: "hidden", backgroundColor: palette.borderSoft },
    fill: { height: "100%", borderRadius: 3 },
    noSamples: { fontSize: 11, fontStyle: "italic", color: palette.textFaint },
})
