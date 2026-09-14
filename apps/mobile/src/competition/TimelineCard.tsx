import { useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { googleCalendarUrl, type CompetitionPageData } from "@winelore/core/competition"
import { useTranslation } from "../i18n/LocaleProvider"
import { openWebPage } from "../navigation/destinations"
import { palette, radius } from "../theme"
import { DateTimeField } from "../ui/DateTimeField"
import { Icon } from "../ui/Icon"
import { panelSurface } from "../ui/Surface"

interface TimelineCardProps {
    page: CompetitionPageData
    isHolder: boolean
    busy: boolean
    onSaveDates: (start: string | null, end: string | null) => Promise<boolean>
}

type Draft = { start: Date | null; end: Date | null }

/** The next full hour: "today" for a date being set now. */
function laterToday(): Date {
    const date = new Date()
    date.setHours(date.getHours() + 1, 0, 0, 0)
    return date
}

function tomorrowMorning(): Date {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    date.setHours(10, 0, 0, 0)
    return date
}

/**
 * The planned and actual dates on a line, as the web draws them. A holder
 * edits the planned pair in place with the system's own date pickers.
 */
export function TimelineCard({ page, isHolder, busy, onSaveDates }: TimelineCardProps) {
    const { t, formatDateTime } = useTranslation()
    const [draft, setDraft] = useState<Draft | null>(null)
    const editing = draft !== null

    const startEditing = () =>
        setDraft({
            start: page.plannedStartAt ? new Date(page.plannedStartAt) : null,
            end: page.plannedEndAt ? new Date(page.plannedEndAt) : null,
        })

    const save = async () => {
        if (!draft) return
        const saved = await onSaveDates(draft.start?.toISOString() ?? null, draft.end?.toISOString() ?? null)
        if (saved) setDraft(null)
    }

    const plannedEditor = (key: keyof Draft, label: string) => {
        const value = draft?.[key] ?? null
        const set = (next: Date | null) => setDraft((previous) => (previous ? { ...previous, [key]: next } : previous))
        return value ? (
            <View style={styles.editorRow}>
                <DateTimeField value={value} onChange={set} accessibilityLabel={label} />
                <Chip label={t("competition.createPresetClear")} onPress={() => set(null)} />
            </View>
        ) : (
            <View style={styles.editorRow}>
                <Chip label={t("competition.createPresetToday")} onPress={() => set(laterToday())} />
                <Chip label={t("competition.createPresetTomorrow")} onPress={() => set(tomorrowMorning())} />
            </View>
        )
    }

    const openCalendar = () =>
        page.plannedStartAt &&
        openWebPage(
            googleCalendarUrl(
                page.name,
                t("competition.calendarDetails", { name: page.name }),
                page.plannedStartAt,
                page.plannedEndAt,
            ),
        )

    return (
        <View style={panelSurface}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Icon name="calendar" size={20} color={palette.accentBright} />
                    <Text style={styles.title}>{t("competition.timelineDetails")}</Text>
                </View>
                {isHolder ? (
                    editing ? (
                        <View style={styles.editActions}>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t("common.saveDates")}
                                onPress={save}
                                disabled={busy}
                                style={({ pressed }) => [styles.saveButton, (pressed || busy) && styles.dimmed]}
                            >
                                {busy ? (
                                    <ActivityIndicator size="small" color={palette.onAccent} />
                                ) : (
                                    <Icon name="done" size={14} color={palette.onAccent} weight="bold" />
                                )}
                                <Text style={styles.saveLabel}>{t("common.save")}</Text>
                            </Pressable>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t("competition.cancel")}
                                onPress={() => setDraft(null)}
                                disabled={busy}
                                style={({ pressed }) => [styles.cancelButton, pressed && styles.dimmed]}
                            >
                                <Icon name="close" size={14} color={palette.textMuted} weight="bold" />
                            </Pressable>
                        </View>
                    ) : (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t("common.editPlannedDates")}
                            hitSlop={8}
                            onPress={startEditing}
                            style={({ pressed }) => [styles.pencil, pressed && styles.dimmed]}
                        >
                            <Icon name="edit" size={16} color={palette.textFaint} />
                        </Pressable>
                    )
                ) : null}
            </View>

            <View style={styles.line}>
                <Entry dot={palette.accentBright} label={t("competition.plannedStart")}>
                    {editing ? (
                        plannedEditor("start", t("competition.plannedStart"))
                    ) : (
                        <View style={styles.valueRow}>
                            <Text style={styles.value}>{formatDateTime(page.plannedStartAt)}</Text>
                            {page.status === "PLANNED" && page.plannedStartAt ? (
                                <Pressable
                                    accessibilityRole="link"
                                    onPress={openCalendar}
                                    style={({ pressed }) => [styles.calendarLink, pressed && styles.dimmed]}
                                >
                                    <Text style={styles.calendarLabel}>{t("common.addToCalendar")}</Text>
                                </Pressable>
                            ) : null}
                        </View>
                    )}
                </Entry>
                {page.plannedEndAt || editing ? (
                    <Entry dot="#7c86ff" label={t("competition.plannedEnd")}>
                        {editing ? (
                            plannedEditor("end", t("competition.plannedEnd"))
                        ) : (
                            <Text style={styles.value}>{formatDateTime(page.plannedEndAt)}</Text>
                        )}
                    </Entry>
                ) : null}
                <Entry dot={page.startedAt ? "#00bc7d" : palette.border} label={t("competition.actualStart")}>
                    <Text style={[styles.value, !page.startedAt && styles.valueMissing]}>
                        {page.startedAt ? formatDateTime(page.startedAt) : t("competition.notStartedYet")}
                    </Text>
                </Entry>
                <Entry dot={page.endedAt ? "#ff2056" : palette.border} label={t("competition.actualEnd")}>
                    <Text style={[styles.value, !page.endedAt && styles.valueMissing]}>
                        {page.endedAt ? formatDateTime(page.endedAt) : t("competition.notEndedYet")}
                    </Text>
                </Entry>
            </View>
        </View>
    )
}

/** One point on the line: a dot on the rule, a small-caps label, the value. */
function Entry({ dot, label, children }: { dot: string; label: string; children: React.ReactNode }) {
    return (
        <View style={styles.entry}>
            <View style={[styles.dot, { backgroundColor: dot }]} />
            <Text style={styles.entryLabel}>{label}</Text>
            <View style={styles.entryValue}>{children}</View>
        </View>
    )
}

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
    return (
        <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={({ pressed }) => [styles.chip, pressed && styles.dimmed]}
        >
            <Text style={styles.chipLabel}>{label}</Text>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    title: { fontSize: 14, fontWeight: "700", letterSpacing: -0.2, color: palette.heading },
    pencil: { padding: 6, borderRadius: radius.sm },
    editActions: { flexDirection: "row", alignItems: "center", gap: 6 },
    saveButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: radius.sm,
        backgroundColor: palette.accent,
    },
    saveLabel: { fontSize: 12, fontWeight: "600", color: palette.onAccent },
    cancelButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radius.sm,
        backgroundColor: palette.borderSoft,
    },
    dimmed: { opacity: 0.6 },
    // pl-4 border-l border-slate-100 ml-2.5
    line: { gap: 16, marginLeft: 10, paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: palette.borderSoft },
    entry: { position: "relative" },
    // w-3 h-3 border-2 border-white, centred on the rule.
    dot: {
        position: "absolute",
        left: -22.5,
        top: 3,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: palette.surface,
    },
    entryLabel: { fontSize: 9, lineHeight: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.textFaint },
    entryValue: { marginTop: 2 },
    valueRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
    value: { fontSize: 12, lineHeight: 16, fontWeight: "600", color: palette.heading },
    valueMissing: { color: palette.textFaint },
    calendarLink: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "rgba(224, 231, 255, 0.4)",
        backgroundColor: "rgba(238, 242, 255, 0.5)",
    },
    calendarLabel: { fontSize: 10, fontWeight: "700", color: palette.accentText },
    editorRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 2 },
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: palette.accentSoft,
    },
    chipLabel: { fontSize: 12, fontWeight: "600", color: palette.accentText },
})
