import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Stack, useRouter } from "expo-router"
import * as Haptics from "expo-haptics"
import {
    GET_COMPETITION_SERIES_LIST,
    applySchedulePreset,
    competitionCreateErrorKey,
    createCompetition,
    createCompetitionSeries,
    isScheduleInverted,
    ownedSeries,
    scheduleDuration,
    type SchedulePreset,
    type SeriesOption,
} from "@winelore/core/competition"
import { getDateLocale } from "@winelore/core/i18n"
import { fetchGraphQLRaw, mutateGraphQLRaw } from "../api/client"
import { useAuth } from "../auth/AuthProvider"
import { useTranslation } from "../i18n/LocaleProvider"
import { notifyChanged } from "../navigation/changes"
import { destinations } from "../navigation/destinations"
import { continuous, palette, radius } from "../theme"
import { DateTimeField } from "../ui/DateTimeField"
import { FormError, FormField, FormInput, FormSection, formStyles } from "../ui/Form"
import { Icon } from "../ui/Icon"
import { MenuPicker } from "../ui/MenuPicker"
import { SheetBar } from "../ui/SheetBar"
import { useDisplayNames } from "../users/useDisplayNames"

/** The series choice that means "file it for me". */
const AUTO = "__auto__"
/** The series choice that means "a new one, named here". */
const NEW_SERIES = "__new__"

// Queries go out as reads; the create sequence fails on any error, with the backend's message.
const send = (query: string, variables: Record<string, unknown>) =>
    query.trimStart().startsWith("mutation") ? mutateGraphQLRaw<any>(query, variables) : fetchGraphQLRaw<any>(query, variables)

/**
 * The web's /competition/create, as a page sheet: the name and series, an
 * optional schedule with its presets, and the web's live summary beneath.
 * Creating it opens the new competition, as the web does. The sequence —
 * which series it lands in, the dates it gets — is core's, which the web's
 * action runs too.
 */
export function CreateCompetitionSheet() {
    const { t, locale } = useTranslation()
    const router = useRouter()
    const { session } = useAuth()
    const auid = Number(session?.auid) || null

    const [name, setName] = useState("")
    const [series, setSeries] = useState<SeriesOption[] | null>(null)
    const [selection, setSelection] = useState(AUTO)
    const [newSeriesName, setNewSeriesName] = useState("")
    const [start, setStart] = useState<Date | null>(null)
    const [end, setEnd] = useState<Date | null>(null)
    const [showErrors, setShowErrors] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const names = useDisplayNames(auid ? [String(auid)] : [])

    useEffect(() => {
        if (!auid) return
        let active = true
        fetchGraphQLRaw<any>(GET_COMPETITION_SERIES_LIST)
            .then((data) => {
                if (!active) return
                const mine = ownedSeries(data?.competitionSeriesList?.items, auid)
                setSeries(mine)
                // As the web: the first of your own series, if you have one.
                if (mine.length > 0) setSelection(mine[0].id)
            })
            .catch(() => active && setSeries([]))
        return () => {
            active = false
        }
    }, [auid])

    const trimmedName = name.trim()
    const invalid = {
        name: trimmedName.length === 0,
        seriesName: selection === NEW_SERIES && newSeriesName.trim().length === 0,
        dates: isScheduleInverted(start, end),
    }
    const duration = scheduleDuration(start, end, t)
    const dateFormatter = useMemo(() => new Intl.DateTimeFormat(getDateLocale(locale), { dateStyle: "medium", timeStyle: "short" }), [locale])
    const seriesName =
        selection === NEW_SERIES
            ? newSeriesName.trim() || t("competition.createSeriesNewLabel")
            : (series?.find((option) => option.id === selection)?.name ?? null)

    const preset = (kind: SchedulePreset) => {
        Haptics.selectionAsync()
        const next = applySchedulePreset(kind, new Date(), end)
        setStart(next.start)
        setEnd(next.end)
    }

    const submit = async () => {
        setShowErrors(true)
        setSubmitError(null)
        if (!auid) {
            setSubmitError(t("competition.createErrorAuth"))
            return
        }
        if (invalid.name || invalid.seriesName || invalid.dates) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
            return
        }
        setSubmitting(true)
        try {
            const seriesId =
                selection === NEW_SERIES ? (await createCompetitionSeries(send, newSeriesName, auid)).id : selection === AUTO ? "" : selection
            const id = await createCompetition(send, { name: trimmedName, seriesId, plannedStart: start, plannedEnd: end, holder: auid })
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            notifyChanged("competitions")
            // The new competition, as the web goes to it.
            router.back()
            const destination = destinations.competition(id)
            if (destination.kind === "app") setTimeout(() => router.push(destination.href as never), 350)
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            setSubmitError(t(competitionCreateErrorKey(error instanceof Error ? error.message : "")))
            setSubmitting(false)
        }
    }

    const hasChanges = trimmedName !== "" || newSeriesName !== "" || start !== null || end !== null

    return (
        <>
            <SheetBar
                title={t("competition.createTitle")}
                action={submitting ? t("myCompetitions.creating") : t("myCompetitions.createButton")}
                actionDisabled={submitting || !auid}
                onAction={submit}
                hasChanges={hasChanges && !submitting}
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
                        <Icon name="competition" size={26} color={palette.accent} />
                    </View>
                    <Text style={styles.introText}>{t("competition.createSubtitle")}</Text>
                </View>

                {!auid ? <FormError message={t("competition.createErrorAuth")} /> : null}

                <View style={formStyles.card}>
                    <View style={formStyles.cardSection}>
                        <FormSection step={1} title={t("competition.createSectionBasics")} icon="edit" />
                        <FormField
                            label={t("myCompetitions.nameLabel")}
                            hint={t("competition.createNameHint")}
                            error={showErrors && invalid.name ? t("competition.createErrorName") : null}
                        >
                            <FormInput
                                value={name}
                                onChangeText={setName}
                                placeholder={t("myCompetitions.namePlaceholder")}
                                autoFocus
                                editable={!submitting}
                                invalid={showErrors && invalid.name}
                                returnKeyType="done"
                            />
                        </FormField>

                        <FormField
                            label={t("myCompetitions.seriesLabel")}
                            hint={
                                selection === NEW_SERIES
                                    ? null
                                    : series === null
                                      ? t("competition.createSeriesLoading")
                                      : series.length === 0
                                        ? t("competition.createSeriesEmpty")
                                        : t("competition.createSeriesHint")
                            }
                        >
                            <View style={styles.picker}>
                                {series === null && auid ? (
                                    <ActivityIndicator size="small" color={palette.accent} style={styles.pickerSpinner} />
                                ) : (
                                    <MenuPicker
                                        accessibilityLabel={t("myCompetitions.seriesLabel")}
                                        options={[
                                            ...(series ?? []).map((option) => ({ value: option.id, label: option.name })),
                                            { value: AUTO, label: t("myCompetitions.autoAssignSeries") },
                                            { value: NEW_SERIES, label: t("competition.createSeriesNew") },
                                        ]}
                                        value={selection}
                                        onChange={(value) => {
                                            Haptics.selectionAsync()
                                            setSelection(value)
                                        }}
                                    />
                                )}
                            </View>
                            {selection === NEW_SERIES ? (
                                <View style={styles.newSeries}>
                                    <Text style={styles.newSeriesLabel}>{t("competition.createSeriesNewLabel")}</Text>
                                    <FormInput
                                        value={newSeriesName}
                                        onChangeText={setNewSeriesName}
                                        placeholder={t("competition.createSeriesNewPlaceholder")}
                                        editable={!submitting}
                                        invalid={showErrors && invalid.seriesName}
                                        style={styles.newSeriesInput}
                                    />
                                    {showErrors && invalid.seriesName ? (
                                        <Text style={styles.inlineError}>{t("competition.createErrorSeriesName")}</Text>
                                    ) : null}
                                </View>
                            ) : null}
                        </FormField>
                    </View>

                    <View style={formStyles.rule} />

                    <View style={formStyles.cardSection}>
                        <FormSection
                            step={2}
                            title={t("competition.schedule")}
                            icon="calendar"
                            badge={t("competition.createOptional")}
                            hint={t("competition.createScheduleHint")}
                        />
                        <View style={styles.presets}>
                            {(["today", "tomorrow", "nextWeek"] as const).map((kind) => (
                                <Pressable
                                    key={kind}
                                    accessibilityRole="button"
                                    onPress={() => preset(kind)}
                                    disabled={submitting}
                                    style={({ pressed }) => [styles.preset, pressed && styles.presetPressed]}
                                >
                                    <Text style={styles.presetLabel}>
                                        {t(
                                            kind === "today"
                                                ? "competition.createPresetToday"
                                                : kind === "tomorrow"
                                                  ? "competition.createPresetTomorrow"
                                                  : "competition.createPresetNextWeek",
                                        )}
                                    </Text>
                                </Pressable>
                            ))}
                            {start || end ? (
                                <Pressable
                                    accessibilityRole="button"
                                    onPress={() => {
                                        setStart(null)
                                        setEnd(null)
                                    }}
                                    hitSlop={6}
                                    style={styles.clear}
                                >
                                    <Text style={styles.clearLabel}>{t("competition.createPresetClear")}</Text>
                                </Pressable>
                            ) : null}
                        </View>

                        <OptionalDate
                            label={t("competition.plannedStart")}
                            value={start}
                            onChange={setStart}
                            fallback={() => applySchedulePreset("today", new Date(), null).start}
                        />
                        <OptionalDate
                            label={t("competition.plannedEnd")}
                            value={end}
                            onChange={setEnd}
                            fallback={() => new Date((start ?? applySchedulePreset("today", new Date(), null).start).getTime() + 8 * 3_600_000)}
                        />

                        {invalid.dates ? (
                            <FormError message={t("competition.createErrorDates")} />
                        ) : duration ? (
                            <View style={styles.duration}>
                                <Icon name="clock" size={13} color={palette.positive} />
                                <Text style={styles.durationLabel}>
                                    {t("competition.createDuration")}: {duration}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </View>

                {submitError ? <FormError message={submitError} /> : null}

                {/* The web's live summary, beneath the form as a phone stacks it. */}
                <View style={styles.summary}>
                    <Text style={styles.summaryTitle}>{t("competition.createSummaryTitle")}</Text>
                    <View style={styles.summaryHead}>
                        <View style={styles.summaryTile}>
                            <Icon name="competition" size={20} color={palette.accent} />
                        </View>
                        <Text style={[styles.summaryName, !trimmedName && styles.muted]}>{trimmedName || t("competition.createSummaryUntitled")}</Text>
                    </View>
                    <SummaryRow label={t("competition.series")} value={seriesName || t("competition.createSummarySeriesAuto")} muted={!seriesName} />
                    <SummaryRow
                        label={t("competition.plannedStart")}
                        value={start ? dateFormatter.format(start) : t("competition.createNoSchedule")}
                        muted={!start}
                    />
                    <SummaryRow label={t("competition.plannedEnd")} value={end ? dateFormatter.format(end) : t("competition.createNoSchedule")} muted={!end} />
                    {duration ? <SummaryRow label={t("competition.createDuration")} value={duration} /> : null}
                    <SummaryRow
                        label={t("competition.createSummaryHolder")}
                        value={auid ? names[String(auid)] || t("competition.auid", { id: auid }) : t("common.na")}
                        muted={!auid}
                    />
                    <View style={styles.nextSteps}>
                        <Icon name="layers" size={14} color={palette.textFaint} />
                        <Text style={styles.nextStepsText}>{t("competition.createNextSteps")}</Text>
                    </View>
                </View>
            </ScrollView>
        </>
    )
}

/** A date the web's form may leave empty: "Not set" until chosen, then the system picker and a way back. */
function OptionalDate({ label, value, onChange, fallback }: { label: string; value: Date | null; onChange: (value: Date | null) => void; fallback: () => Date }) {
    const { t } = useTranslation()
    return (
        <FormField label={label}>
            <View style={styles.dateRow}>
                {value ? (
                    <>
                        <DateTimeField value={value} onChange={onChange} accessibilityLabel={label} />
                        <Pressable accessibilityRole="button" accessibilityLabel={t("competition.createPresetClear")} onPress={() => onChange(null)} hitSlop={8}>
                            <Icon name="close" size={14} color={palette.textFaint} />
                        </Pressable>
                    </>
                ) : (
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                            Haptics.selectionAsync()
                            onChange(fallback())
                        }}
                        style={styles.unset}
                    >
                        <Icon name="plus" size={13} color={palette.accent} weight="semibold" />
                        <Text style={styles.unsetLabel}>{t("competition.createNoSchedule")}</Text>
                    </Pressable>
                )}
            </View>
        </FormField>
    )
}

function SummaryRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
    return (
        <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{label}</Text>
            <Text style={[styles.summaryValue, muted && styles.muted]}>{value}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
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
    newSeries: { gap: 8, padding: 16, borderRadius: radius.tile, borderWidth: 1, borderColor: palette.accentBorder, backgroundColor: "rgba(238, 242, 255, 0.4)" },
    newSeriesLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: palette.accentBright },
    newSeriesInput: { backgroundColor: palette.surface },
    inlineError: { fontSize: 12, fontWeight: "600", color: palette.danger },
    presets: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
    preset: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
    presetPressed: { borderColor: palette.accentBorder, backgroundColor: palette.accentSoft },
    presetLabel: { fontSize: 12, fontWeight: "700", color: "#45556c" },
    clear: { paddingHorizontal: 8, paddingVertical: 7 },
    clearLabel: { fontSize: 12, fontWeight: "700", color: palette.textFaint },
    dateRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    unset: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: palette.accentMuted,
    },
    unsetLabel: { fontSize: 13, fontWeight: "600", color: palette.accent },
    duration: {
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: "#d0fae5",
        backgroundColor: "#ecfdf5",
    },
    durationLabel: { fontSize: 12, fontWeight: "700", color: palette.positive },
    summary: {
        padding: 20,
        borderRadius: radius.hero,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.surface,
        ...continuous,
    },
    summaryTitle: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", color: palette.textFaint },
    summaryHead: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: palette.borderSoft },
    summaryTile: {
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: palette.accentSoft,
    },
    summaryName: { flex: 1, fontSize: 16, fontWeight: "700", color: palette.heading },
    summaryRow: { gap: 2, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: palette.background },
    summaryLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: palette.textFaint },
    summaryValue: { fontSize: 12, fontWeight: "600", color: palette.textStrong },
    muted: { color: palette.textFaint },
    nextSteps: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 14, padding: 12, borderRadius: radius.tile, backgroundColor: palette.background },
    nextStepsText: { flex: 1, fontSize: 11, lineHeight: 16, fontWeight: "500", color: palette.textMuted },
})
