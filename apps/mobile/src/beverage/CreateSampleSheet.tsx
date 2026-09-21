import { useEffect, useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import * as Haptics from "expo-haptics"
import {
    GET_BATCHES_FOR_SAMPLE,
    SAMPLE_VOLUME_PRESETS,
    SampleExceedsBatchError,
    batchChoiceLabel,
    createSample,
    isInvalidVolume,
    loadBatchForSample,
    loadBeverageChoices,
    volumePresetLabel,
    type BatchForSample,
    type BeverageChoice,
} from "@winelore/core/beverage"
import { fetchGraphQLRaw, mutateGraphQLRaw } from "../api/client"
import { useAuth } from "../auth/AuthProvider"
import { useTranslation } from "../i18n/LocaleProvider"
import { notifyChanged } from "../navigation/changes"
import { destinations } from "../navigation/destinations"
import { continuous, palette, radius } from "../theme"
import { FormError, FormField, FormInput, FormSection, formStyles } from "../ui/Form"
import { Icon } from "../ui/Icon"
import { MenuPicker } from "../ui/MenuPicker"
import { SheetBar } from "../ui/SheetBar"
import { CharacteristicFields } from "./CharacteristicFields"
import { SummaryRow, createSheetStyles as styles } from "./CreateBeverageSheet"
import { chipStyles, LockedChoice } from "./createParts"
import { allocationColor } from "./parts"

type BatchOption = { id: string; lotNumber?: string | null; volumeMl?: number | null }

/**
 * The web's /sample/create, as a page sheet: the batch it comes from — the
 * one it was opened from, or a beverage's and batch of your choosing — how
 * much of the batch is left, the sample's volume with the web's presets,
 * and the characteristics its type asks of a sample. A volume past what the
 * batch has left is refused before it is sent, and core checks again when
 * it is. The beverage page behind reloads onto the new sample.
 */
export function CreateSampleSheet({ batchId: openedFor, beverageId: openedBeverage }: { batchId?: string; beverageId?: string }) {
    const { t, locale, formatBeverageType, formatStatus } = useTranslation()
    const router = useRouter()
    const { session } = useAuth()
    const actor = session?.auid ?? ""
    const headers = actor ? { "x-actor": actor } : undefined
    const read = (query: string, variables: Record<string, unknown>) => fetchGraphQLRaw<any>(query, variables, headers)
    const write = (query: string, variables: Record<string, unknown>) => mutateGraphQLRaw<any>(query, variables, headers)

    const [locked, setLocked] = useState(!!openedFor)
    const [beverages, setBeverages] = useState<BeverageChoice[] | null>(null)
    const [beverageId, setBeverageId] = useState(openedBeverage ?? "")
    const [batches, setBatches] = useState<BatchOption[] | null>(null)
    const [batchId, setBatchId] = useState(openedFor ?? "")
    const [details, setDetails] = useState<BatchForSample | null | undefined>(undefined)
    const [volume, setVolume] = useState("750")
    const [attributes, setAttributes] = useState<Record<string, string>>({})
    const [showErrors, setShowErrors] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)

    useEffect(() => {
        if (locked || beverages || !actor) return
        let active = true
        loadBeverageChoices(read, Number(actor))
            .then((loaded) => {
                if (!active) return
                setBeverages(loaded)
                if (!beverageId && loaded.length > 0) setBeverageId(loaded[0].id)
            })
            .catch(() => active && setBeverages([]))
        return () => {
            active = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locked, actor])

    useEffect(() => {
        if (locked || !beverageId) return
        let active = true
        setBatches(null)
        read(GET_BATCHES_FOR_SAMPLE, { beverageId })
            .then((data) => {
                if (!active) return
                const items: BatchOption[] = data?.batches?.items ?? []
                setBatches(items)
                setBatchId((current) => (items.some((batch) => batch.id === current) ? current : (items[0]?.id ?? "")))
            })
            .catch(() => active && setBatches([]))
        return () => {
            active = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locked, beverageId])

    useEffect(() => {
        if (!batchId) {
            setDetails(null)
            return
        }
        let active = true
        setDetails(undefined)
        loadBatchForSample(read, batchId)
            .then((loaded) => {
                if (!active) return
                setDetails(loaded)
                if (loaded?.batch.beverage?.id) setBeverageId((current) => current || loaded.batch.beverage!.id)
            })
            .catch(() => active && setDetails(null))
        return () => {
            active = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [batchId])

    const remaining = details?.remainingVolumeMl ?? null
    const volumeNumber = Number(volume)
    const invalid = {
        batch: !batchId,
        volume: isInvalidVolume(volume),
        exceeded: remaining !== null && !Number.isNaN(volumeNumber) && volumeNumber > remaining,
        exhausted: remaining !== null && remaining <= 0,
    }
    const batch = details?.batch
    const typeName = batch?.beverage?.typeName ? formatBeverageType(batch.beverage.typeName) || batch.beverage.typeName : null
    const targetBeverage = batch?.beverage?.id || beverageId
    const ml = (value: number) => `${value.toLocaleString(locale)} ml`

    const submit = async () => {
        setShowErrors(true)
        setSubmitError(null)
        if (!actor) {
            setSubmitError(t("competition.createErrorAuth"))
            return
        }
        if (invalid.batch || invalid.volume || invalid.exceeded || invalid.exhausted) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
            return
        }
        setSubmitting(true)
        try {
            await createSample(write, { batchId, volumeMl: volume, attributes })
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            if (targetBeverage) notifyChanged(`beverage:${targetBeverage}`)
            router.back()
            if (targetBeverage && targetBeverage !== openedBeverage) {
                const destination = destinations.beverage(targetBeverage)
                if (destination.kind === "app") setTimeout(() => router.push(`${destination.href}?tab=batches` as never), 350)
            }
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            setSubmitError(
                error instanceof SampleExceedsBatchError
                    ? t("sample.errorVolumeExceedsRemaining", { max: error.remainingMl.toLocaleString(locale) })
                    : (error instanceof Error && error.message) || t("sample.createErrorGeneric"),
            )
            setSubmitting(false)
        }
    }

    const volumeError = !showErrors
        ? null
        : invalid.exhausted
          ? t("sample.batchVolumeExhausted")
          : invalid.exceeded
            ? t("sample.errorVolumeExceedsRemaining", { max: (remaining ?? 0).toLocaleString(locale) })
            : invalid.volume
              ? t("sample.errorInvalidVolume")
              : null

    return (
        <>
            <SheetBar
                title={t("sample.createTitle")}
                action={submitting ? t("sample.submitting") : t("sample.createButton")}
                actionDisabled={submitting || !actor}
                onAction={submit}
                hasChanges={!submitting && (volume !== "750" || Object.keys(attributes).length > 0)}
            />
            <ScrollView
                style={styles.screen}
                contentContainerStyle={styles.content}
                contentInsetAdjustmentBehavior="automatic"
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                automaticallyAdjustKeyboardInsets
            >
                <View style={styles.intro}>
                    <View style={styles.introTile}>
                        <Icon name="flask" size={26} color={palette.accent} />
                    </View>
                    <Text style={styles.introText}>{t("sample.createSubtitle")}</Text>
                </View>

                <View style={formStyles.card}>
                    <View style={formStyles.cardSection}>
                        <FormSection step={1} title={t("sample.sectionAssociation")} icon="barcode" hint={t("sample.sectionAssociationHint")} />
                        {locked ? (
                            <LockedChoice
                                icon="beverage"
                                title={details === undefined ? null : (batch?.beverage?.name ?? "—")}
                                detail={[typeName, batch ? `${t("sample.batchLabel")}: ${batchChoiceLabel(batch)}` : null].filter(Boolean).join(" · ")}
                                actionLabel={t("common.change")}
                                onAction={() => setLocked(false)}
                            />
                        ) : (
                            <>
                                <FormField label={t("batch.beverageLabel")}>
                                    <View style={styles.picker}>
                                        {beverages === null ? (
                                            <ActivityIndicator size="small" color={palette.accent} style={styles.pickerSpinner} />
                                        ) : (
                                            <MenuPicker
                                                accessibilityLabel={t("batch.beverageLabel")}
                                                options={beverages.map((choice) => ({
                                                    value: choice.id,
                                                    label: [choice.name, choice.status ? formatStatus(choice.status) : null, choice.isOwn ? null : t("batch.fromCatalog")]
                                                        .filter(Boolean)
                                                        .join(" · "),
                                                }))}
                                                value={beverageId}
                                                onChange={(value) => {
                                                    Haptics.selectionAsync()
                                                    setBeverageId(value)
                                                    setBatchId("")
                                                }}
                                            />
                                        )}
                                    </View>
                                </FormField>
                                <FormField label={t("sample.batchLabel")} error={showErrors && invalid.batch ? t("sample.errorBatchRequired") : null}>
                                    <View style={styles.picker}>
                                        {batches === null ? (
                                            <ActivityIndicator size="small" color={palette.accent} style={styles.pickerSpinner} />
                                        ) : batches.length === 0 ? (
                                            <Text style={styles.loadingLabel}>{t("sample.noBatchesFound")}</Text>
                                        ) : (
                                            <MenuPicker
                                                accessibilityLabel={t("sample.batchLabel")}
                                                options={batches.map((option) => ({
                                                    value: option.id,
                                                    label: [batchChoiceLabel(option), option.volumeMl ? ml(option.volumeMl) : null].filter(Boolean).join(" · "),
                                                }))}
                                                value={batchId}
                                                onChange={(value) => {
                                                    Haptics.selectionAsync()
                                                    setBatchId(value)
                                                }}
                                            />
                                        )}
                                    </View>
                                </FormField>
                            </>
                        )}
                    </View>

                    <View style={formStyles.rule} />
                    <View style={formStyles.cardSection}>
                        <FormSection step={2} title={t("sample.sectionVolume")} icon="droplet" hint={t("sample.sectionVolumeHint")} />
                        {details ? (
                            <View style={local.allocation}>
                                <View style={local.figures}>
                                    <Figure label={t("sample.batchVolumeTotal")} value={typeof batch?.volumeMl === "number" ? ml(batch.volumeMl) : "—"} />
                                    <Figure label={t("sample.batchVolumeUsed")} value={ml(details.usedVolumeMl)} />
                                    <Figure
                                        label={t("sample.batchVolumeRemaining")}
                                        value={remaining !== null ? ml(remaining) : "—"}
                                        tone={invalid.exhausted ? "danger" : "accent"}
                                    />
                                </View>
                                {typeof batch?.volumeMl === "number" && batch.volumeMl > 0 ? (
                                    <View style={local.track}>
                                        <View
                                            style={[
                                                local.fill,
                                                {
                                                    width: `${Math.min(100, (details.usedVolumeMl / batch.volumeMl) * 100)}%`,
                                                    backgroundColor:
                                                        details.usedVolumeMl >= batch.volumeMl
                                                            ? allocationColor.over
                                                            : details.usedVolumeMl / batch.volumeMl > 0.8
                                                              ? allocationColor.high
                                                              : allocationColor.normal,
                                                },
                                            ]}
                                        />
                                    </View>
                                ) : null}
                            </View>
                        ) : null}
                        <FormField label={t("sample.volumeLabel")} error={volumeError}>
                            <FormInput
                                value={volume}
                                onChangeText={setVolume}
                                keyboardType="number-pad"
                                editable={!submitting && !invalid.exhausted}
                                invalid={!!volumeError}
                            />
                            <View style={chipStyles.row}>
                                {SAMPLE_VOLUME_PRESETS.map((preset) => {
                                    const selected = volume === String(preset)
                                    const tooMuch = remaining !== null && preset > remaining
                                    return (
                                        <Pressable
                                            key={preset}
                                            accessibilityRole="button"
                                            accessibilityState={{ selected, disabled: tooMuch }}
                                            disabled={tooMuch || submitting}
                                            onPress={() => {
                                                Haptics.selectionAsync()
                                                setVolume(String(preset))
                                            }}
                                            style={[chipStyles.chip, selected && chipStyles.chipSelected, tooMuch && chipStyles.chipDisabled]}
                                        >
                                            <Text style={[chipStyles.label, selected && chipStyles.labelSelected]}>{volumePresetLabel(preset, locale)}</Text>
                                        </Pressable>
                                    )
                                })}
                            </View>
                        </FormField>
                    </View>

                    {(details?.characteristics.length ?? 0) > 0 ? (
                        <>
                            <View style={formStyles.rule} />
                            <View style={formStyles.cardSection}>
                                <FormSection
                                    step={3}
                                    title={t("sample.sectionCharacteristics")}
                                    icon="tag"
                                    badge={t("competition.createOptional")}
                                    hint={t("sample.sectionCharacteristicsHint")}
                                />
                                <CharacteristicFields characteristics={details!.characteristics} values={attributes} onChange={setAttributes} disabled={submitting} />
                            </View>
                        </>
                    ) : null}
                </View>

                {submitError ? <FormError message={submitError} /> : null}

                <View style={styles.summary}>
                    <Text style={styles.summaryTitle}>{t("sample.summaryTitle")}</Text>
                    <SummaryRow label={t("batch.summaryBeverage")} value={batch?.beverage?.name || t("common.na")} muted={!batch?.beverage} />
                    <SummaryRow label={t("sample.batchLabel")} value={batch ? batchChoiceLabel(batch) : t("common.na")} muted={!batch} />
                    <SummaryRow
                        label={t("sample.volumeLabel")}
                        value={volume && !invalid.volume ? ml(volumeNumber) : t("common.na")}
                        muted={!volume || invalid.volume}
                    />
                </View>
            </ScrollView>
        </>
    )
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: "accent" | "danger" }) {
    return (
        <View style={local.figure}>
            <Text style={local.figureLabel}>{label}</Text>
            <Text style={[local.figureValue, tone === "accent" && local.accent, tone === "danger" && local.danger]}>{value}</Text>
        </View>
    )
}

const local = StyleSheet.create({
    allocation: { gap: 10, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: palette.borderSoft, backgroundColor: palette.background, ...continuous },
    figures: { flexDirection: "row", gap: 8 },
    figure: { flex: 1, gap: 2 },
    figureLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: palette.textFaint },
    figureValue: { fontSize: 14, fontWeight: "800", color: palette.heading },
    accent: { color: palette.accent },
    danger: { color: palette.danger },
    track: { height: 6, borderRadius: 3, backgroundColor: palette.border, overflow: "hidden" },
    fill: { height: 6, borderRadius: 3 },
})
