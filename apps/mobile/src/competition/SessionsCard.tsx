import { useEffect, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import {
    competitionTimingTicks,
    defaultCommissionName,
    formatCompetitionSessionTiming,
    type CompetitionPageCommission,
    type CompetitionPageData,
} from "@winelore/core/competition"
import { useTranslation } from "../i18n/LocaleProvider"
import { destinations, useOpenDestination } from "../navigation/destinations"
import { palette, radius } from "../theme"
import { Icon } from "../ui/Icon"
import { PressableSurface } from "../ui/Pressable"
import { panelSurface } from "../ui/Surface"
import { tileStyle } from "./parts"

interface SessionsCardProps {
    page: CompetitionPageData
    /** Commission id -> the replica this user judges. */
    replicaIds: Record<string, string>
    isHolder: boolean
    busy: boolean
    onAddCommission: (name: string) => Promise<boolean>
}

/**
 * The competition's commissions, with the web's results link and — for a
 * holder — its inline "Add commission" form.
 *
 * A commission the user sits on opens its lobby here; any other opens the
 * web's commission page, which is where organisers manage one.
 */
export function SessionsCard({ page, replicaIds, isHolder, busy, onAddCommission }: SessionsCardProps) {
    const { t } = useTranslation()
    const open = useOpenDestination()
    const [draft, setDraft] = useState<string | null>(null)

    const add = async () => {
        if (draft === null) return
        if (await onAddCommission(draft)) setDraft(null)
    }

    return (
        <View style={panelSurface}>
            <View style={styles.titleRow}>
                <Icon name="beverage" size={20} color={palette.accentBright} />
                <Text style={styles.title}>{t("competition.commissions")}</Text>
            </View>
            <Text style={styles.subtitle}>{t("competition.commissionsSubtitle")}</Text>

            <View style={styles.toolbar}>
                <View style={styles.chip}>
                    <Text style={styles.chipLabel}>
                        {t("common.total")}: {page.commissions.length}
                    </Text>
                </View>
                <Pressable
                    accessibilityRole="link"
                    onPress={() => open(destinations.competitionResults(page.id))}
                    style={({ pressed }) => [styles.outlineButton, pressed && styles.dimmed]}
                >
                    <Icon name="competition" size={14} color={palette.accent} />
                    <Text style={styles.outlineLabel}>{t("competition.resultsButton")}</Text>
                </Pressable>
                {isHolder ? (
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => setDraft(defaultCommissionName(page.commissions.length))}
                        disabled={busy}
                        style={({ pressed }) => [styles.addButton, (pressed || busy) && styles.dimmed]}
                    >
                        <Icon name="plus" size={14} color={palette.onAccent} weight="bold" />
                        <Text style={styles.addLabel}>{t("competition.addCommission")}</Text>
                    </Pressable>
                ) : null}
            </View>

            {draft !== null ? (
                <View style={styles.form}>
                    <View style={styles.formHead}>
                        <Text style={styles.formTitle}>{t("competition.addCommissionTitle")}</Text>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t("competition.cancel")}
                            hitSlop={8}
                            onPress={() => setDraft(null)}
                        >
                            <Icon name="close" size={16} color={palette.textFaint} />
                        </Pressable>
                    </View>
                    <Text style={styles.fieldLabel}>{t("competition.commissionName")}</Text>
                    <TextInput
                        value={draft}
                        onChangeText={setDraft}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={add}
                        editable={!busy}
                        placeholder={t("competition.commissionNamePlaceholder", { number: page.commissions.length + 1 })}
                        placeholderTextColor={palette.textFaint}
                        style={styles.input}
                    />
                    <View style={styles.formActions}>
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => setDraft(null)}
                            disabled={busy}
                            style={({ pressed }) => [styles.formCancel, pressed && styles.dimmed]}
                        >
                            <Text style={styles.formCancelLabel}>{t("competition.cancel")}</Text>
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            onPress={add}
                            disabled={busy}
                            style={({ pressed }) => [styles.addButton, (pressed || busy) && styles.dimmed]}
                        >
                            {busy ? (
                                <ActivityIndicator size="small" color={palette.onAccent} />
                            ) : (
                                <Icon name="plus" size={14} color={palette.onAccent} weight="bold" />
                            )}
                            <Text style={styles.addLabel}>
                                {busy ? t("competition.adding") : t("competition.addCommission")}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            ) : null}

            <View style={styles.list}>
                {page.commissions.map((commission) => (
                    <SessionCard
                        key={commission.id}
                        commission={commission}
                        onPress={() => open(destinations.commission(commission.id, replicaIds[commission.id] ?? null))}
                    />
                ))}
                {page.commissions.length === 0 ? (
                    <Text style={styles.empty}>{t("competition.noCommissions")}</Text>
                ) : null}
            </View>
        </View>
    )
}

/** One commission session: the web's card on the competition page. */
function SessionCard({ commission, onPress }: { commission: CompetitionPageCommission; onPress: () => void }) {
    const { t, locale, formatStatus } = useTranslation()
    const [now, setNow] = useState(() => Date.now())

    useEffect(() => {
        setNow(Date.now())
        if (!competitionTimingTicks(commission.status)) return
        const timer = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(timer)
    }, [commission.status])

    const timing = formatCompetitionSessionTiming(commission, t, locale, now)
    // text-emerald-500, text-slate-400, text-amber-500
    const statusColor =
        commission.status === "STARTED" ? "#00bc7d" : commission.status === "COMPLETED" ? palette.textFaint : "#fe9a00"

    return (
        <PressableSurface
            onPress={onPress}
            accessibilityLabel={[t("commission.session"), commission.name, formatStatus(commission.status)].join(", ")}
            style={styles.session}
        >
            <View style={tileStyle}>
                <Icon name="beverage" size={24} color={palette.accent} />
            </View>
            <View style={styles.sessionText}>
                <Text style={styles.sessionKicker}>{t("commission.session")}</Text>
                <Text style={styles.sessionName} numberOfLines={1}>
                    {commission.name}
                </Text>
                <View style={styles.sessionStatus}>
                    <Text style={[styles.sessionStatusLabel, { color: statusColor }]}>
                        {formatStatus(commission.status)}
                    </Text>
                    {timing ? (
                        <>
                            <Text style={styles.sessionSeparator}>|</Text>
                            <Icon name="timer" size={14} color={palette.textMuted} />
                            <Text style={styles.sessionTiming}>{timing}</Text>
                        </>
                    ) : null}
                </View>
            </View>
        </PressableSurface>
    )
}

const styles = StyleSheet.create({
    titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    title: { fontSize: 18, lineHeight: 24, fontWeight: "700", letterSpacing: -0.3, color: palette.heading },
    subtitle: { marginTop: 2, fontSize: 12, color: palette.textFaint },
    toolbar: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 12, marginBottom: 20 },
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.background,
    },
    chipLabel: { fontSize: 12, fontWeight: "600", color: palette.textMuted },
    outlineButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
    },
    outlineLabel: { fontSize: 12, fontWeight: "600", color: palette.textStrong },
    addButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: radius.md,
        backgroundColor: palette.accent,
        boxShadow: "0 4px 6px -1px rgba(97, 95, 255, 0.2)",
    },
    addLabel: { fontSize: 12, fontWeight: "600", color: palette.onAccent },
    dimmed: { opacity: 0.6 },
    form: {
        marginBottom: 16,
        padding: 16,
        gap: 6,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: "rgba(226, 232, 240, 0.8)",
        backgroundColor: palette.background,
    },
    formHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    formTitle: { fontSize: 12, fontWeight: "700", color: palette.heading },
    fieldLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.textFaint },
    input: {
        paddingVertical: 6,
        fontSize: 14,
        fontWeight: "600",
        color: palette.heading,
        borderBottomWidth: 1,
        borderBottomColor: "#cad5e2",
    },
    formActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 10 },
    formCancel: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
    },
    formCancelLabel: { fontSize: 12, fontWeight: "600", color: palette.textMuted },
    list: { gap: 16 },
    empty: { paddingVertical: 16, fontSize: 14, color: palette.textFaint, textAlign: "center" },
    // rounded-[24px] border-slate-100 bg-white p-5 shadow-md
    session: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        padding: 20,
        borderRadius: radius.panel,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.surface,
        boxShadow: "0 4px 6px -1px rgba(241, 245, 249, 0.5), 0 2px 4px -2px rgba(241, 245, 249, 0.5)",
    },
    sessionText: { flex: 1, minWidth: 0 },
    sessionKicker: { fontSize: 10, lineHeight: 14, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", color: palette.textFaint },
    sessionName: { fontSize: 16, lineHeight: 22, fontWeight: "700", color: palette.heading },
    sessionStatus: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 6 },
    sessionStatusLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
    sessionSeparator: { fontSize: 10, color: palette.textGhost },
    sessionTiming: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.textMuted },
})
