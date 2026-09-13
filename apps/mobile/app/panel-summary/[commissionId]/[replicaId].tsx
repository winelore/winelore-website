import { useCallback } from "react"
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import * as Haptics from "expo-haptics"
import { useTranslation } from "../../../src/i18n/LocaleProvider"
import { usePanelSummary } from "../../../src/commission/usePanelSummary"
import { completeReplica, startNextPanel } from "../../../src/commission/mutations"
import { elevation, palette, radius, spacing, type } from "../../../src/theme"

/**
 * Shown when a panel finishes: what the panel scored, and — for the chair —
 * the control to move the session on.
 *
 * Everyone else sees the same summary and a note that they are waiting. The
 * screen polls, so when the chair acts every device follows without anyone
 * refreshing.
 */
export default function PanelSummaryRoute() {
    const { commissionId, replicaId } = useLocalSearchParams<{
        commissionId: string
        replicaId: string
    }>()
    const { t } = useTranslation()
    const router = useRouter()
    const { state, isAdvancing, setIsAdvancing, markLeaving } = usePanelSummary(
        commissionId,
        replicaId,
    )

    const view = state.status === "ready" ? state.view : null
    const hasNextPanel = Boolean(view?.nextPanelId && view?.nextPanelFirstCandidateId)

    const advance = useCallback(async () => {
        if (!view || isAdvancing) return
        setIsAdvancing(true)
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        try {
            if (view.nextPanelId && view.nextPanelFirstCandidateId) {
                await startNextPanel(replicaId, view.nextPanelId, view.nextPanelFirstCandidateId)
                markLeaving()
                router.replace(`/evaluation/${view.nextPanelFirstCandidateId}`)
            } else {
                await completeReplica(replicaId)
                markLeaving()
                router.replace(`/results/${commissionId}`)
            }
        } catch {
            // Leave the chair on the summary so they can try again; the poll
            // will move everyone on if the mutation actually landed.
            setIsAdvancing(false)
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        }
    }, [view, isAdvancing, setIsAdvancing, markLeaving, router, replicaId, commissionId])

    if (state.status === "loading") {
        return (
            <View style={styles.centered}>
                <ActivityIndicator />
            </View>
        )
    }

    if (state.status === "error" || !view) {
        return (
            <View style={styles.centered}>
                <Text style={styles.error}>{t("commission.panelSummaryLoadError")}</Text>
            </View>
        )
    }

    const evaluated = view.candidates.filter((c) => c.isFinished).length

    return (
        <>
            <Stack.Screen
                options={{ title: t("commission.panelSummaryTitle"), headerBackVisible: false }}
            />
            <ScrollView
                style={styles.screen}
                contentContainerStyle={styles.content}
                contentInsetAdjustmentBehavior="automatic"
            >
                <View style={styles.card}>
                    <Text style={styles.panelName}>{view.panelName}</Text>
                    <Text style={styles.description}>
                        {hasNextPanel
                            ? t("commission.panelCompletedDesc")
                            : t("commission.finalPanelCompletedDesc")}
                    </Text>
                    <Text style={styles.count}>
                        {evaluated}/{view.candidates.length}
                    </Text>
                </View>

                <View style={styles.card}>
                    {view.candidates.map((candidate) => (
                        <View key={candidate.id} style={styles.candidateRow}>
                            <Text style={styles.candidateCode}>{candidate.code}</Text>
                            <View
                                style={[
                                    styles.statusDot,
                                    candidate.isFinished && styles.statusDotDone,
                                ]}
                            />
                        </View>
                    ))}
                </View>

                {view.isHead ? (
                    <Pressable
                        accessibilityRole="button"
                        disabled={isAdvancing}
                        onPress={advance}
                        style={({ pressed }) => [
                            styles.action,
                            isAdvancing && styles.actionDisabled,
                            pressed && styles.actionPressed,
                        ]}
                    >
                        {isAdvancing ? <ActivityIndicator color={palette.onAccent} /> : null}
                        <Text style={styles.actionLabel}>
                            {hasNextPanel
                                ? t("commission.startNextPanel")
                                : t("commission.endReplica")}
                        </Text>
                    </Pressable>
                ) : (
                    <Text style={styles.waiting}>
                        {hasNextPanel
                            ? t("commission.waitingForNextPanel")
                            : t("commission.waitingForReplicaEnd")}
                    </Text>
                )}
            </ScrollView>
        </>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
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
    panelName: { ...type.title, color: palette.text },
    description: { ...type.body, color: palette.textMuted },
    count: { ...type.largeTitle, color: palette.accentText },
    candidateRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: spacing.xs,
    },
    candidateCode: { ...type.body, fontWeight: "600", color: palette.text },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: radius.pill,
        backgroundColor: palette.border,
    },
    statusDotDone: { backgroundColor: palette.positive },
    action: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
        height: 52,
        borderRadius: radius.md,
        backgroundColor: palette.accent,
        ...elevation(3),
    },
    actionDisabled: { backgroundColor: palette.border },
    actionPressed: { opacity: 0.85 },
    actionLabel: { ...type.body, fontWeight: "700", color: palette.onAccent },
    waiting: { ...type.body, color: palette.textMuted, textAlign: "center" },
})
