import { useEffect, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from "react-native"
import {
    competitionTimingTicks,
    formatCompetitionPageTiming,
    type CompetitionPageData,
} from "@winelore/core/competition"
import { useTranslation } from "../i18n/LocaleProvider"
import { useAvatarUrls } from "../users/useAvatarUrls"
import { continuous, palette, radius, type } from "../theme"
import { Icon } from "../ui/Icon"
import { panelSurface } from "../ui/Surface"
import { HolderAvatar, StatusPill } from "./parts"

interface HeroCardProps {
    page: CompetitionPageData
    usernames: Record<string, string>
    isHolder: boolean
    busy: boolean
    onRename: (name: string) => Promise<boolean>
    /** Where the name row ends, so the screen can show the title once it scrolls away. */
    onNameLayout: (event: LayoutChangeEvent) => void
}

/**
 * The competition's own card, first on a phone as on the web: the trophy
 * tile, the name (editable by a holder), the status with its live timer, and
 * who holds it.
 */
export function HeroCard({ page, usernames, isHolder, busy, onRename, onNameLayout }: HeroCardProps) {
    const { t, locale } = useTranslation()
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState("")
    const [now, setNow] = useState(() => Date.now())

    useEffect(() => {
        setNow(Date.now())
        if (!competitionTimingTicks(page.status)) return
        const timer = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(timer)
    }, [page.status])

    const timing = formatCompetitionPageTiming(page, t, locale, now)
    const avatarUrls = useAvatarUrls(page.holders.map(String))

    const save = async () => {
        if (await onRename(draft)) setEditing(false)
    }

    return (
        <View style={[panelSurface, styles.card]}>
            <View style={styles.head} onLayout={onNameLayout}>
                <View style={styles.tile}>
                    <Icon name="competition" size={32} color={palette.accent} />
                </View>
                <View style={styles.headText}>
                    <Text style={styles.kicker}>{t("competition.panel")}</Text>
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
                                accessibilityLabel={t("competition.editCompetitionName")}
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
                            {isHolder ? (
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={t("competition.editCompetitionName")}
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
                        <StatusPill status={page.status} />
                        {timing ? (
                            <>
                                <Text style={styles.separator}>|</Text>
                                <View style={styles.timer}>
                                    <Icon name="timer" size={14} color={palette.accentBright} />
                                    <Text style={styles.timerText}>{timing}</Text>
                                </View>
                            </>
                        ) : null}
                    </View>
                </View>
            </View>

            <View style={styles.holders}>
                <Text style={styles.sectionKicker}>{t("competition.holders")}</Text>
                <View style={styles.chips}>
                    {page.holders.length > 0 ? (
                        page.holders.map((auid) => (
                            <View key={auid} style={styles.chip}>
                                <HolderAvatar
                                    auid={auid}
                                    username={usernames[auid]}
                                    imageUrl={avatarUrls[String(auid)]}
                                />
                                <Text style={styles.chipName}>{usernames[auid] || String(auid)}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.noHolders}>{t("competition.noHolders")}</Text>
                    )}
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    card: {
        overflow: "hidden",
        // The web's blurred indigo-50 blob, top right.
        experimental_backgroundImage:
            "radial-gradient(circle at 100% 0%, rgba(238, 242, 255, 0.9) 0%, rgba(238, 242, 255, 0) 40%)",
    },
    head: { flexDirection: "row", alignItems: "flex-start", gap: 16, marginBottom: 24 },
    tile: {
        width: 64,
        height: 64,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: palette.accentSoft,
        alignItems: "center",
        justifyContent: "center",
        ...continuous,
    },
    headText: { flex: 1, minWidth: 0 },
    kicker: { fontSize: 12, lineHeight: 16, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", color: palette.textFaint },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
    name: { flexShrink: 1, fontSize: 24, lineHeight: 30, fontWeight: "800", letterSpacing: -0.5, color: palette.heading },
    pencil: { padding: 6, borderRadius: radius.sm },
    editRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
    nameInput: {
        flex: 1,
        minWidth: 0,
        fontSize: 20,
        fontWeight: "800",
        color: palette.text,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: "#7c86ff", // indigo-400
        backgroundColor: palette.surface,
    },
    saveButton: {
        width: 36,
        height: 36,
        borderRadius: radius.md,
        backgroundColor: palette.accent,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelButton: {
        width: 36,
        height: 36,
        borderRadius: radius.md,
        backgroundColor: palette.borderSoft,
        alignItems: "center",
        justifyContent: "center",
    },
    dimmed: { opacity: 0.6 },
    statusRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 8 },
    separator: { fontSize: 14, color: palette.textGhost },
    timer: { flexDirection: "row", alignItems: "center", gap: 4 },
    timerText: { fontSize: 12, fontWeight: "600", color: palette.textMuted, fontVariant: ["tabular-nums"] },
    holders: { borderTopWidth: 1, borderTopColor: palette.borderSoft, paddingTop: 24 },
    sectionKicker: { ...type.kicker, color: palette.textFaint, marginBottom: 12 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: "rgba(248, 250, 252, 0.6)",
    },
    chipName: { fontSize: 12, fontWeight: "700", color: palette.textStrong },
    noHolders: { fontSize: 12, color: palette.textFaint },
})
