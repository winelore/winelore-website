import { useEffect, useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native"
import { useRouter } from "expo-router"
import * as Haptics from "expo-haptics"
import {
    BATCH_VOLUME_PRESETS,
    createBatch,
    isInvalidVolume,
    loadBeverageChoices,
    loadBeverageForBatch,
    volumePresetLabel,
    type BeverageChoice,
    type BeverageForBatch,
} from "@winelore/core/beverage"
import { fetchGraphQLRaw, mutateGraphQLRaw } from "../api/client"
import { useAuth } from "../auth/AuthProvider"
import { useTranslation } from "../i18n/LocaleProvider"
import { notifyChanged } from "../navigation/changes"
import { destinations } from "../navigation/destinations"
import { palette } from "../theme"
import { FormError, FormField, FormInput, FormSection, formStyles } from "../ui/Form"
import { Icon } from "../ui/Icon"
import { MenuPicker } from "../ui/MenuPicker"
import { SheetBar } from "../ui/SheetBar"
import { CharacteristicFields } from "./CharacteristicFields"
import { SummaryRow, createSheetStyles as styles } from "./CreateBeverageSheet"
import { chipStyles, LockedChoice } from "./createParts"

/**
 * The web's /batch/create, as a page sheet: the beverage it belongs to — the
 * one it was opened from, or one of yours — the lot number and volume with
 * the web's presets, and the characteristics the beverage's type asks of a
 * batch, a vintage starting at this year. The beverage page behind reloads
 * onto the new batch.
 */
export function CreateBatchSheet({ beverageId: openedFor }: { beverageId?: string }) {
    const { t, locale, formatBeverageType, formatStatus } = useTranslation()
    const router = useRouter()
    const { session } = useAuth()
    const actor = session?.auid ?? ""
    const headers = actor ? { "x-actor": actor } : undefined
    const read = (query: string, variables: Record<string, unknown>) => fetchGraphQLRaw<any>(query, variables, headers)
    const write = (query: string, variables: Record<string, unknown>) => mutateGraphQLRaw<any>(query, variables, headers)

    const [locked, setLocked] = useState(!!openedFor)
    const [choices, setChoices] = useState<BeverageChoice[] | null>(null)
    const [beverageId, setBeverageId] = useState(openedFor ?? "")
    const [details, setDetails] = useState<BeverageForBatch | null | undefined>(undefined)
    const [lotNumber, setLotNumber] = useState("")
    const [volume, setVolume] = useState("")
    const [attributes, setAttributes] = useState<Record<string, string>>({})
    const [showErrors, setShowErrors] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)

    useEffect(() => {
        if (locked || choices || !actor) return
        let active = true
        loadBeverageChoices(read, Number(actor))
            .then((loaded) => {
                if (!active) return
                setChoices(loaded)
                if (!beverageId && loaded.length > 0) setBeverageId(loaded[0].id)
            })
            .catch(() => active && setChoices([]))
        return () => {
            active = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locked, actor])

    useEffect(() => {
        if (!beverageId) {
            setDetails(null)
            return
        }
        let active = true
        setDetails(undefined)
        loadBeverageForBatch(read, beverageId)
            .then((loaded) => {
                if (!active) return
                setDetails(loaded)
                // As the web: a vintage starts at this year.
                if (loaded?.characteristics.some((characteristic) => characteristic.code === "vintage")) {
                    setAttributes((current) => ({ ...current, vintage: current.vintage || String(new Date().getFullYear()) }))
                }
            })
            .catch(() => active && setDetails(null))
        return () => {
            active = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [beverageId])

    const invalid = { beverage: !beverageId, volume: isInvalidVolume(volume) }
    const beverage = details?.beverage
    const typeName = beverage?.typeName ? formatBeverageType(beverage.typeName) || beverage.typeName : null

    const submit = async () => {
        setShowErrors(true)
        setSubmitError(null)
        if (!actor) {
            setSubmitError(t("competition.createErrorAuth"))
            return
        }
        if (invalid.beverage || invalid.volume) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
            return
        }
        setSubmitting(true)
        try {
            await createBatch(write, { beverageId, lotNumber, volumeMl: volume, attributes })
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            notifyChanged(`beverage:${beverageId}`)
            router.back()
            // The web goes to the beverage's batches; opened from that beverage, it is already behind.
            if (beverageId !== openedFor) {
                const destination = destinations.beverage(beverageId)
                if (destination.kind === "app") setTimeout(() => router.push(`${destination.href}?tab=batches` as never), 350)
            }
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            setSubmitError((error instanceof Error && error.message) || t("batch.createErrorGeneric"))
            setSubmitting(false)
        }
    }

    return (
        <>
            <SheetBar
                title={t("batch.createTitle")}
                action={submitting ? t("batch.submitting") : t("batch.createButton")}
                actionDisabled={submitting || !actor}
                onAction={submit}
                hasChanges={!submitting && (lotNumber !== "" || volume !== "")}
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
                        <Icon name="barcode" size={26} color={palette.accent} />
                    </View>
                    <Text style={styles.introText}>{t("batch.createSubtitle")}</Text>
                </View>

                <View style={formStyles.card}>
                    <View style={formStyles.cardSection}>
                        <FormSection step={1} title={t("batch.sectionBeverage")} icon="beverage" hint={t("batch.sectionBeverageHint")} />
                        <FormField label={t("batch.beverageLabel")} error={showErrors && invalid.beverage ? t("batch.errorBeverageRequired") : null}>
                            {locked ? (
                                <LockedChoice
                                    icon="beverage"
                                    title={beverage?.name ?? null}
                                    detail={typeName}
                                    actionLabel={t("common.change")}
                                    onAction={() => setLocked(false)}
                                />
                            ) : (
                                <View style={styles.picker}>
                                    {choices === null ? (
                                        <ActivityIndicator size="small" color={palette.accent} style={styles.pickerSpinner} />
                                    ) : choices.length === 0 ? (
                                        <Text style={styles.loadingLabel}>{t("myBeverages.emptyTitle")}</Text>
                                    ) : (
                                        <MenuPicker
                                            accessibilityLabel={t("batch.beverageLabel")}
                                            options={choices.map((choice) => ({
                                                value: choice.id,
                                                label: [
                                                    choice.name,
                                                    choice.status ? formatStatus(choice.status) : null,
                                                    choice.isOwn ? null : t("batch.fromCatalog"),
                                                ]
                                                    .filter(Boolean)
                                                    .join(" · "),
                                            }))}
                                            value={beverageId}
                                            onChange={(value) => {
                                                Haptics.selectionAsync()
                                                setBeverageId(value)
                                                setAttributes({})
                                            }}
                                        />
                                    )}
                                </View>
                            )}
                        </FormField>
                    </View>

                    <View style={formStyles.rule} />
                    <View style={formStyles.cardSection}>
                        <FormSection step={2} title={t("batch.sectionBatchInfo")} icon="barcode" hint={t("batch.sectionBatchInfoHint")} />
                        <FormField label={t("batch.lotNumberLabel")} hint={t("batch.lotNumberHint")}>
                            <FormInput
                                value={lotNumber}
                                onChangeText={setLotNumber}
                                placeholder={t("batch.lotNumberPlaceholder")}
                                autoCapitalize="characters"
                                autoCorrect={false}
                                editable={!submitting}
                            />
                        </FormField>
                        <FormField label={t("batch.volumeLabel")} error={showErrors && invalid.volume ? t("batch.errorInvalidVolume") : null}>
                            <FormInput
                                value={volume}
                                onChangeText={setVolume}
                                keyboardType="number-pad"
                                placeholder="750"
                                editable={!submitting}
                                invalid={showErrors && invalid.volume}
                            />
                            <View style={chipStyles.row}>
                                {BATCH_VOLUME_PRESETS.map((preset) => {
                                    const selected = volume === String(preset)
                                    return (
                                        <Pressable
                                            key={preset}
                                            accessibilityRole="button"
                                            accessibilityState={{ selected }}
                                            onPress={() => {
                                                Haptics.selectionAsync()
                                                setVolume(String(preset))
                                            }}
                                            style={[chipStyles.chip, selected && chipStyles.chipSelected]}
                                        >
                                            <Text style={[chipStyles.label, selected && chipStyles.labelSelected]}>{volumePresetLabel(preset, locale)}</Text>
                                        </Pressable>
                                    )
                                })}
                            </View>
                        </FormField>
                    </View>

                    <View style={formStyles.rule} />
                    <View style={formStyles.cardSection}>
                        <FormSection
                            step={3}
                            title={t("batch.sectionCharacteristics")}
                            icon="tag"
                            badge={t("competition.createOptional")}
                            hint={t("batch.sectionCharacteristicsHint")}
                        />
                        {details === undefined && beverageId ? (
                            <View style={styles.loading}>
                                <ActivityIndicator size="small" color={palette.accent} />
                                <Text style={styles.loadingLabel}>{t("common.loading")}</Text>
                            </View>
                        ) : (details?.characteristics.length ?? 0) === 0 ? (
                            <Text style={styles.loadingLabel}>{t("batch.noSpecificCharacteristics")}</Text>
                        ) : (
                            <CharacteristicFields
                                characteristics={details!.characteristics}
                                values={attributes}
                                onChange={setAttributes}
                                presets
                                disabled={submitting}
                            />
                        )}
                    </View>
                </View>

                {submitError ? <FormError message={submitError} /> : null}

                <View style={styles.summary}>
                    <Text style={styles.summaryTitle}>{t("batch.summaryTitle")}</Text>
                    <SummaryRow label={t("batch.summaryBeverage")} value={beverage?.name || t("common.na")} muted={!beverage} />
                    {typeName ? <SummaryRow label={t("batch.summaryType")} value={typeName} /> : null}
                    <SummaryRow label={t("batch.summaryLot")} value={lotNumber.trim() || t("common.na")} muted={!lotNumber.trim()} />
                    <SummaryRow
                        label={t("batch.summaryVolume")}
                        value={volume && !invalid.volume ? `${Number(volume).toLocaleString(locale)} ml` : t("common.na")}
                        muted={!volume || invalid.volume}
                    />
                    {Object.entries(attributes).map(([code, value]) => (
                        <SummaryRow
                            key={code}
                            label={details?.characteristics.find((characteristic) => characteristic.code === code)?.name || code}
                            value={value}
                        />
                    ))}
                </View>
            </ScrollView>
        </>
    )
}
