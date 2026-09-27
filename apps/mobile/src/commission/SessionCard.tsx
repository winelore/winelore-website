import { useEffect, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from "react-native"
import {
    commissionHolderNames,
    formatCommissionTiming,
    type CommissionPageData,
    type CommissionReplica,
} from "@winelore/core/commission"
import { StatusPill } from "../competition/parts"
import { useTranslation } from "../i18n/LocaleProvider"
import { continuous, palette, radius, type } from "../theme"
import { Icon } from "../ui/Icon"
import { panelSurface } from "../ui/Surface"

interface SessionCardProps {
    page: CommissionPageData
    replica: CommissionReplica | null
    replicaStatus: string
    names: Record<string, string>
    canRename: boolean
    busy: boolean
    onRename: (name: string) => Promise<boolean>
    onNameLayout: (event: LayoutChangeEvent) => void
}

/**
 * The session's own card, first on a phone as on the web: the wine tile, the
 * name (a holder renames a draft), the selected replica's status with the
 * session's timer, the competition and its holders, and how many beverages
 * the replica tastes.
 */
export function SessionCard({ page, replica, replicaStatus, names, canRename, busy, onRename, onNameLayout }: SessionCardProps) {
    const { t, tCount } = useTranslation()
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState("")
    const [now, setNow] = useState(() => Date.now())

    useEffect(() => {
        setNow(Date.now())
        if (page.status !== "STARTED") return
        const timer = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(timer)
    }, [page.status])

    const timing = formatCommissionTiming(page, t, now)
    const holders = commissionHolderNames(page.competition.holders, names, t("common.unknownCreator"))

    const save = async () => {
        if (!draft.trim()) return
        if (await onRename(draft.trim())) setEditing(false)
    }

    return (
        <View style={panelSurface}>
            <View style={styles.head} onLayout={onNameLayout}>
                <View style={styles.tile}>
                    <Icon name="beverage" size={30} color={palette.accent} />
                </View>
                <View style={styles.headText}>
                    <Text style={styles.kicker}>{t("commission.session")}</Text>
                    {editing ? (
                        <View style={styles.editRow}>
                            <TextInput
                                value={draft}
                                onChangeText={setDraft}
                                autoFocus
                                returnKeyType="done"
                                onSubmitEditing={save}
                                editable={!busy}
                                style={styles.nameInput}
                                accessibilityLabel={t("commission.editCommissionName")}
                            />
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
                                    <Icon name="done" size={16} color={palette.onAccent} weight="bold" />
                                )}
                            </Pressable>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t("competition.cancel")}
                                onPress={() => setEditing(false)}
                                disabled={busy}
                                style={({ pressed }) => [styles.cancelButton, pressed && styles.dimmed]}
                            >
                                <Icon name="close" size={16} color={palette.textMuted} weight="bold" />
                            </Pressable>
                        </View>
                    ) : (
                        <View style={styles.nameRow}>
                            <Text style={styles.name} accessibilityRole="header">
                                {page.name}
                            </Text>
                            {canRename ? (
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={t("commission.editCommissionName")}
                                    hitSlop={8}
                                    onPress={() => {
                                        setDraft(page.name)
                                        setEditing(true)
                                    }}
                                    style={({ pressed }) => [styles.pencil, pressed && styles.dimmed]}
                                >
                                    <Icon name="edit" size={16} color={palette.textFaint} />
                                </Pressable>
                            ) : null}
                        </View>
                    )}
                    <View style={styles.statusRow}>
                        <StatusPill status={replicaStatus} />
                        {timing ? (
                            <>
                                <Text style={styles.divider}>|</Text>
                                <Icon name="timer" size={14} color={palette.accentBright} />
                                <Text style={styles.timing}>{timing}</Text>
                            </>
                        ) : null}
                    </View>
                </View>
            </View>

            <View style={styles.facts}>
                <Fact icon="competition" iconColor="#fe9a00" label={t("commission.competition")} value={page.competition.name} />
                <Fact icon="person" iconColor={palette.accentBright} label={t("commission.holders")} value={holders} />
            </View>

            <View style={styles.count}>
                <Icon name="layers" size={20} color={palette.accentBright} />
                <Text style={styles.countLabel}>
                    {tCount("commission.replicaBeverages", replica?.candidateCount || page.candidateCount || 0)}
                </Text>
            </View>
        </View>
    )
}

function Fact({ icon, iconColor, label, value }: { icon: "competition" | "person"; iconColor: string; label: string; value: string }) {
    return (
        <View style={styles.fact}>
            <Icon name={icon} size={20} color={iconColor} />
            <View style={styles.factText}>
                <Text style={styles.factLabel}>{label}</Text>
                <Text style={styles.factValue} numberOfLines={1}>
                    {value}
                </Text>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    head: { flexDirection: "row", alignItems: "flex-start", gap: 16, marginBottom: 20 },
    // h-16 w-16 rounded-2xl bg-indigo-50 border-indigo-100
    tile: {
        width: 64,
        height: 64,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: palette.accentSoft,
        ...continuous,
    },
    headText: { flex: 1, minWidth: 0 },
    kicker: { ...type.kicker, fontSize: 12, color: palette.textFaint },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
    name: { flexShrink: 1, fontSize: 24, lineHeight: 30, fontWeight: "800", letterSpacing: -0.4, color: palette.heading },
    pencil: { padding: 6, borderRadius: radius.sm },
    editRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
    nameInput: {
        flex: 1,
        minWidth: 0,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: "#7c86ff",
        backgroundColor: palette.surface,
        fontSize: 20,
        fontWeight: "800",
        color: palette.text,
    },
    saveButton: { padding: 8, borderRadius: radius.md, backgroundColor: palette.accent },
    cancelButton: { padding: 8, borderRadius: radius.md, backgroundColor: palette.borderSoft },
    dimmed: { opacity: 0.5 },
    statusRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 8 },
    divider: { fontSize: 14, color: palette.textGhost },
    timing: { fontSize: 12, fontWeight: "600", color: palette.textMuted, fontVariant: ["tabular-nums"] },
    facts: { gap: 12, paddingTop: 20, borderTopWidth: 1, borderTopColor: palette.borderSoft },
    // bg-slate-50/60 border-slate-100 rounded-2xl p-4
    fact: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        padding: 16,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: "rgba(248, 250, 252, 0.6)",
        ...continuous,
    },
    factText: { flex: 1, minWidth: 0 },
    factLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.textFaint },
    factValue: { marginTop: 2, fontSize: 14, fontWeight: "600", color: palette.heading },
    count: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginTop: 16,
        padding: 16,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: "rgba(224, 231, 255, 0.5)",
        backgroundColor: "rgba(238, 242, 255, 0.4)",
        ...continuous,
    },
    countLabel: { flex: 1, fontSize: 14, fontWeight: "500", color: palette.textMuted },
})
