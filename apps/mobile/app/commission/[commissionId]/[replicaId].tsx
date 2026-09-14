import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native"
import { Stack, useLocalSearchParams } from "expo-router"
import * as Haptics from "expo-haptics"
import { useLobby } from "../../../src/commission/useLobby"
import { useTranslation } from "../../../src/i18n/LocaleProvider"
import { elevation, palette, radius, spacing, type } from "../../../src/theme"

/**
 * The lobby: who is here, who is ready, and — for the chair — the control to
 * begin.
 *
 * It polls, because readiness is other people changing state. When the chair
 * starts, every device is routed into the session from here rather than each
 * judge having to notice and tap.
 */
export default function LobbyRoute() {
    const { commissionId, replicaId } = useLocalSearchParams<{
        commissionId: string
        replicaId: string
    }>()
    const { t, tCount } = useTranslation()
    const { state, isMutating, setReady, start } = useLobby(commissionId, replicaId)

    if (state.status === "loading") {
        return (
            <View style={styles.centered}>
                <ActivityIndicator />
            </View>
        )
    }

    if (state.status === "error") {
        return (
            <View style={styles.centered}>
                <Text style={styles.error}>{t("myCommissions.errorTitle")}</Text>
            </View>
        )
    }

    const { view } = state
    const { lobby } = view

    return (
        <>
            <Stack.Screen options={{ title: view.commissionName }} />
            <ScrollView
                style={styles.screen}
                contentContainerStyle={styles.content}
                contentInsetAdjustmentBehavior="automatic"
            >
                <View style={styles.card}>
                    <Text style={styles.heading}>{t("commission.waitingStart")}</Text>
                    <Text style={styles.body}>{t("commission.waitingStartDesc")}</Text>
                    {view.competitionName ? (
                        <Text style={styles.meta}>{view.competitionName}</Text>
                    ) : null}
                </View>

                <Text style={styles.sectionTitle}>
                    {tCount("commission.commissionMembers", view.members.length)}
                </Text>

                <View style={styles.card}>
                    {view.members.map((member) => (
                        <View key={member.id} style={styles.memberRow}>
                            <View style={styles.memberMain}>
                                <Text style={styles.memberLabel} numberOfLines={1}>
                                    {member.label}
                                </Text>
                                {member.isHead ? (
                                    <Text style={styles.headBadge}>
                                        {t("commission.headOfCommission")}
                                    </Text>
                                ) : null}
                            </View>
                            <Text
                                style={[
                                    styles.readyLabel,
                                    member.isReady && styles.readyLabelDone,
                                ]}
                            >
                                {member.isReady ? t("commission.ready") : "—"}
                            </Text>
                        </View>
                    ))}
                </View>

                {lobby.isMember ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: lobby.amIReady, disabled: isMutating }}
                        disabled={isMutating}
                        onPress={async () => {
                            await Haptics.selectionAsync()
                            await setReady(!lobby.amIReady)
                        }}
                        style={({ pressed }) => [
                            styles.action,
                            lobby.amIReady && styles.actionActive,
                            pressed && styles.pressed,
                        ]}
                    >
                        <Text
                            style={[
                                styles.actionLabel,
                                lobby.amIReady && styles.actionLabelActive,
                            ]}
                        >
                            {lobby.amIReady ? t("commission.ready") : t("commission.markReady")}
                        </Text>
                    </Pressable>
                ) : null}

                {lobby.isHead ? (
                    <>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ disabled: !lobby.canStart || isMutating }}
                            disabled={!lobby.canStart || isMutating}
                            onPress={async () => {
                                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                                await start()
                            }}
                            style={({ pressed }) => [
                                styles.start,
                                (!lobby.canStart || isMutating) && styles.startDisabled,
                                pressed && styles.pressed,
                            ]}
                        >
                            {isMutating ? <ActivityIndicator color={palette.onAccent} /> : null}
                            <Text style={styles.startLabel}>{t("commission.startTasting")}</Text>
                        </Pressable>

                        {/* Say why, rather than leaving a dead button. */}
                        {lobby.blockedReason === "noCandidates" ? (
                            <Text style={styles.blocked}>
                                {t("commission.startTastingNoSamplesError")}
                            </Text>
                        ) : lobby.blockedReason === "noMembers" ? (
                            <Text style={styles.blocked}>
                                {t("commission.startTastingNoExpertsError")}
                            </Text>
                        ) : null}

                        {lobby.canStart && !lobby.isEveryoneReady ? (
                            <Text style={styles.blocked}>
                                {tCount("commission.waitingMembers", lobby.notReadyCount)}
                            </Text>
                        ) : null}
                    </>
                ) : null}
            </ScrollView>
        </>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.xl,
        backgroundColor: palette.background,
    },
    error: { ...type.body, color: palette.danger, textAlign: "center" },
    card: {
        gap: spacing.xs,
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: palette.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: palette.border,
        ...elevation(1),
    },
    heading: { ...type.title, color: palette.text },
    body: { ...type.body, color: palette.textMuted },
    meta: { ...type.caption, color: palette.textFaint },
    sectionTitle: { ...type.body, fontWeight: "700", color: palette.text, marginTop: spacing.sm },
    memberRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.md,
        paddingVertical: spacing.xs,
    },
    memberMain: { flex: 1, gap: 2 },
    memberLabel: { ...type.body, color: palette.text },
    headBadge: { ...type.caption, color: palette.accentText, fontWeight: "700" },
    readyLabel: { ...type.caption, color: palette.textFaint, fontWeight: "600" },
    readyLabelDone: { color: palette.positive },
    action: {
        height: 50,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.md,
        backgroundColor: palette.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: palette.border,
    },
    actionActive: { backgroundColor: palette.positive, borderColor: palette.positive },
    actionLabel: { ...type.body, fontWeight: "700", color: palette.text },
    actionLabelActive: { color: palette.onAccent },
    start: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
        height: 52,
        borderRadius: radius.md,
        backgroundColor: palette.accent,
        ...elevation(3),
    },
    startDisabled: { backgroundColor: palette.border, ...elevation(0) },
    startLabel: { ...type.body, fontWeight: "700", color: palette.onAccent },
    blocked: { ...type.caption, color: palette.textMuted, textAlign: "center" },
    pressed: { opacity: 0.8 },
})
