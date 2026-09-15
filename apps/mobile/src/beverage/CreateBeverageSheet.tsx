import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import * as Haptics from "expo-haptics"
import {
    beverageCreateErrorKey,
    beverageTypeOptions,
    createBeverage,
    loadCharacteristics,
    type BeverageCharacteristic,
    type BeverageTypeOption,
    type ProducerRoleChoice,
} from "@winelore/core/beverage"
import { GET_BEVERAGE_TYPES } from "@winelore/core/dashboard"
import { fetchGraphQLRaw, mutateGraphQLRaw } from "../api/client"
import { useAuth } from "../auth/AuthProvider"
import { useTranslation } from "../i18n/LocaleProvider"
import { LocationPicker } from "../map/LocationPicker"
import { notifyChanged } from "../navigation/changes"
import { destinations } from "../navigation/destinations"
import { continuous, palette, radius } from "../theme"
import { FormError, FormField, FormInput, FormSection, formStyles } from "../ui/Form"
import { Icon } from "../ui/Icon"
import { MenuPicker } from "../ui/MenuPicker"
import { Segmented } from "../ui/Segmented"
import { SheetBar } from "../ui/SheetBar"
import { CharacteristicFields } from "./CharacteristicFields"

/**
 * The web's /beverage/create, as a page sheet: the name, type and your role
 * as its producer, the characteristics the type asks for, and its origin
 * picked on a map. Creating it opens the new beverage, as the web does. The
 * input — you as its producer, the retry without an attribute the backend
 * refuses — is core's, which the web's action uses too.
 */
export function CreateBeverageSheet() {
    const { t, formatBeverageType, formatStatus } = useTranslation()
    const router = useRouter()
    const { session } = useAuth()
    const actor = session?.auid ?? ""
    const read = (query: string, variables: Record<string, unknown>) => fetchGraphQLRaw<any>(query, variables, actor ? { "x-actor": actor } : undefined)
    const write = (query: string, variables: Record<string, unknown>) => mutateGraphQLRaw<any>(query, variables, actor ? { "x-actor": actor } : undefined)

    const [name, setName] = useState("")
    const [types, setTypes] = useState<BeverageTypeOption[] | null>(null)
    const [typeId, setTypeId] = useState("")
    const [role, setRole] = useState<ProducerRoleChoice>("MAKER")
    const [characteristics, setCharacteristics] = useState<BeverageCharacteristic[] | null>([])
    const [attributes, setAttributes] = useState<Record<string, string>>({})
    const [origin, setOrigin] = useState<{ latitude: number; longitude: number } | null>(null)
    const [showErrors, setShowErrors] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)

    useEffect(() => {
        let active = true
        read(GET_BEVERAGE_TYPES, {})
            .then((data) => {
                if (!active) return
                const options = beverageTypeOptions(data?.beverageTypes?.items)
                setTypes(options)
                // Wine, as the web picks it, or the first there is.
                if (options.length > 0) setTypeId(options[0].id)
            })
            .catch(() => active && setTypes([]))
        return () => {
            active = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (!typeId) return
        let active = true
        setCharacteristics(null)
        loadCharacteristics(read, typeId, "BEVERAGE")
            .then((loaded) => {
                if (!active) return
                setCharacteristics(loaded)
                setAttributes({})
            })
            .catch(() => active && setCharacteristics([]))
        return () => {
            active = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [typeId])

    const typeLabel = (type: BeverageTypeOption) => {
        const formatted = formatBeverageType(type.code)
        return formatted && formatted !== type.code ? formatted : type.name || type.code
    }
    const selectedType = useMemo(() => types?.find((type) => type.id === typeId) ?? null, [types, typeId])
    const trimmedName = name.trim()
    const invalid = { name: trimmedName.length === 0, type: !typeId }
    const hasCharacteristics = characteristics === null || characteristics.length > 0
    const roleLabel = (value: ProducerRoleChoice) => (value === "BOTTLER" ? t("beverage.roleBottler") : t("beverage.roleMaker"))

    const submit = async () => {
        setShowErrors(true)
        setSubmitError(null)
        if (!actor) {
            setSubmitError(t("competition.createErrorAuth"))
            return
        }
        if (invalid.name || invalid.type) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
            return
        }
        setSubmitting(true)
        try {
            const id = await createBeverage(write, { name: trimmedName, typeId, role, attributes, origin }, actor)
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            notifyChanged("beverages")
            router.back()
            const destination = destinations.beverage(id)
            if (destination.kind === "app") setTimeout(() => router.push(destination.href as never), 350)
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            const message = error instanceof Error ? error.message : ""
            const key = beverageCreateErrorKey(message)
            setSubmitError(key ? t(key) : message)
            setSubmitting(false)
        }
    }

    return (
        <>
            <SheetBar
                title={t("beverage.createTitle")}
                action={submitting ? t("beverage.creating") : t("beverage.createSubmitButton")}
                actionDisabled={submitting || !actor}
                onAction={submit}
                hasChanges={!submitting && (trimmedName !== "" || origin !== null || Object.keys(attributes).length > 0)}
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
                        <Icon name="beverage" size={26} color={palette.accent} />
                    </View>
                    <Text style={styles.introText}>{t("beverage.createSubtitle")}</Text>
                </View>

                {!actor ? <FormError message={t("competition.createErrorAuth")} /> : null}

                <View style={formStyles.card}>
                    <View style={formStyles.cardSection}>
                        <FormSection step={1} title={t("beverage.createSectionBasics")} icon="edit" />
                        <FormField
                            label={t("beverage.nameLabel")}
                            hint={t("beverage.nameHint")}
                            error={showErrors && invalid.name ? t("beverage.createErrorName") : null}
                        >
                            <FormInput
                                value={name}
                                onChangeText={setName}
                                placeholder={t("beverage.namePlaceholder")}
                                autoFocus
                                editable={!submitting}
                                invalid={showErrors && invalid.name}
                            />
                        </FormField>
                        <FormField label={t("beverage.typeLabel")} hint={types === null ? t("beverage.typesLoading") : t("beverage.typeHint")}>
                            <View style={styles.picker}>
                                {types === null ? (
                                    <ActivityIndicator size="small" color={palette.accent} style={styles.pickerSpinner} />
                                ) : (
                                    <MenuPicker
                                        accessibilityLabel={t("beverage.typeLabel")}
                                        options={types.map((type) => ({ value: type.id, label: typeLabel(type) }))}
                                        value={typeId}
                                        onChange={(value) => {
                                            Haptics.selectionAsync()
                                            setTypeId(value)
                                        }}
                                    />
                                )}
                            </View>
                        </FormField>
                        <FormField label={t("beverage.producerRoleLabel")} hint={t("beverage.roleHint")}>
                            <Segmented
                                accessibilityLabel={t("beverage.producerRoleLabel")}
                                options={[
                                    { value: "MAKER" as const, label: t("beverage.roleMaker") },
                                    { value: "BOTTLER" as const, label: t("beverage.roleBottler") },
                                ]}
                                value={role}
                                onChange={setRole}
                            />
                        </FormField>
                    </View>

                    {hasCharacteristics ? (
                        <>
                            <View style={formStyles.rule} />
                            <View style={formStyles.cardSection}>
                                <FormSection
                                    step={2}
                                    title={t("beverage.createSectionCharacteristics")}
                                    icon="tag"
                                    badge={t("competition.createOptional")}
                                    hint={t("beverage.characteristicsHint")}
                                />
                                {characteristics === null ? (
                                    <View style={styles.loading}>
                                        <ActivityIndicator size="small" color={palette.accent} />
                                        <Text style={styles.loadingLabel}>{t("common.loading")}</Text>
                                    </View>
                                ) : (
                                    <CharacteristicFields characteristics={characteristics} values={attributes} onChange={setAttributes} disabled={submitting} />
                                )}
                            </View>
                        </>
                    ) : null}

                    <View style={formStyles.rule} />
                    <View style={formStyles.cardSection}>
                        <FormSection
                            step={hasCharacteristics ? 3 : 2}
                            title={t("beverage.createSectionOrigin")}
                            icon="location"
                            badge={t("competition.createOptional")}
                            hint={t("beverage.originHint")}
                        />
                        <LocationPicker value={origin} onChange={setOrigin} disabled={submitting} />
                    </View>
                </View>

                {submitError ? <FormError message={submitError} /> : null}

                <View style={styles.summary}>
                    <Text style={styles.summaryTitle}>{t("beverage.summaryTitle")}</Text>
                    <View style={styles.summaryHead}>
                        <View style={styles.summaryTile}>
                            <Icon name="beverage" size={22} color={palette.accent} />
                        </View>
                        <View style={styles.summaryHeadText}>
                            <Text style={[styles.summaryName, !trimmedName && styles.muted]}>{trimmedName || t("beverage.summaryUntitled")}</Text>
                            <View style={styles.draft}>
                                <Text style={styles.draftLabel}>{formatStatus("DRAFT")}</Text>
                            </View>
                        </View>
                    </View>
                    <SummaryRow label={t("beverage.typeLabel")} value={selectedType ? typeLabel(selectedType) : t("common.na")} muted={!selectedType} />
                    <SummaryRow label={t("beverage.producerRoleLabel")} value={roleLabel(role)} />
                    {(characteristics ?? []).map((characteristic) => {
                        const value = attributes[characteristic.code]
                        const formatted = value ? formatBeverageType(value) : null
                        return (
                            <SummaryRow
                                key={characteristic.code}
                                label={characteristic.name || characteristic.code}
                                value={value ? (formatted && formatted !== value ? formatted : value) : t("common.na")}
                                muted={!value}
                            />
                        )
                    })}
                    <SummaryRow
                        label={t("beverage.originLabel")}
                        value={origin ? `${origin.latitude}, ${origin.longitude}` : t("common.na")}
                        muted={!origin}
                    />
                    <View style={styles.nextSteps}>
                        <Icon name="layers" size={14} color={palette.textFaint} />
                        <Text style={styles.nextStepsText}>{t("beverage.createNextSteps")}</Text>
                    </View>
                </View>
            </ScrollView>
        </>
    )
}

export function SummaryRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
    return (
        <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{label}</Text>
            <Text style={[styles.summaryValue, muted && styles.muted]}>{value}</Text>
        </View>
    )
}

export const createSheetStyles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    content: { padding: 16, paddingBottom: 40, gap: 16 },
    intro: { flexDirection: "row", alignItems: "center", gap: 14 },
    introTile: {
        width: 52,
        height: 52,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: palette.accentSoft,
        ...continuous,
    },
    introText: { flex: 1, fontSize: 13, lineHeight: 18, color: palette.textMuted },
    picker: {
        alignSelf: "stretch",
        alignItems: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: "rgba(248, 250, 252, 0.5)",
        ...continuous,
    },
    pickerSpinner: { margin: 6 },
    loading: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
    loadingLabel: { fontSize: 12, fontWeight: "600", color: palette.textFaint },
    summary: { padding: 20, borderRadius: radius.hero, borderWidth: 1, borderColor: palette.borderSoft, backgroundColor: palette.surface, ...continuous },
    summaryTitle: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", color: palette.textFaint },
    summaryHead: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: palette.borderSoft },
    summaryTile: {
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: palette.accentSoft,
    },
    summaryHeadText: { flex: 1, minWidth: 0, gap: 4, alignItems: "flex-start" },
    summaryName: { fontSize: 16, fontWeight: "700", color: palette.heading },
    draft: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, borderWidth: 1, borderColor: "#fef3c6", backgroundColor: "#fffbeb" },
    draftLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", color: "#bb4d00" },
    summaryRow: { gap: 2, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: palette.background },
    summaryLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: palette.textFaint },
    summaryValue: { fontSize: 12, fontWeight: "600", color: palette.textStrong },
    muted: { color: palette.textFaint },
    nextSteps: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 14, padding: 12, borderRadius: radius.tile, backgroundColor: palette.background },
    nextStepsText: { flex: 1, fontSize: 11, lineHeight: 16, fontWeight: "500", color: palette.textMuted },
})

const styles = createSheetStyles
