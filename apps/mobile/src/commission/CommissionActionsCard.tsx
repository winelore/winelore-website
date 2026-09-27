import { useEffect, useRef } from "react"
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from "react-native"
import { currentCandidateCode, type CommissionPageView } from "@winelore/core/commission"
import { useTranslation } from "../i18n/LocaleProvider"
import { brandGradient, continuous, palette, radius } from "../theme"
import { Icon, type IconName } from "../ui/Icon"
import { PressableSurface } from "../ui/Pressable"
import { panelSurface } from "../ui/Surface"

interface CommissionActionsCardProps {
    view: CommissionPageView
    replicaName: string
    busy: "review" | "ready" | "start" | null
    onSubmitForReview: () => void
    onToggleReady: () => void
    onStart: () => void
    onEnterSession: () => void
    onViewResults: () => void
}

/**
 * The web's "Actions & Controls": what this user can do now. A holder
 * submits a draft for review; a judge marks themselves ready; the chair
 * starts the tasting once everyone is; then everyone enters the session, and
 * once it is over, the results.
 */
export function CommissionActionsCard({
    view,
    replicaName,
    busy,
    onSubmitForReview,
    onToggleReady,
    onStart,
    onEnterSession,
    onViewResults,
}: CommissionActionsCardProps) {
    const { t, tCount } = useTranslation()
    const { lobby, role, replica } = view
    const canStart = lobby.isEveryoneReady && view.hasCandidates

    return (
        <View style={[panelSurface, styles.card]}>
            <Text style={styles.heading}>{t("commission.actionsControls")}</Text>

            {view.isHolder && view.isDraft ? (
                <View style={[styles.block, styles.blockIndigo]}>
                    <View style={styles.blockText}>
                        <Text style={styles.blockTitle}>{t("commission.submitReviewTitle")}</Text>
                        <Text style={styles.blockBody}>{t("commission.submitReviewDescription")}</Text>
                    </View>
                    <Button
                        label={t("commission.submitReviewButton")}
                        icon="send"
                        busy={busy === "review"}
                        disabled={busy !== null}
                        onPress={onSubmitForReview}
                    />
                </View>
            ) : null}

            {lobby.isPreStart && role ? (
                <View style={[styles.block, styles.blockSlate]}>
                    <View style={styles.blockText}>
                        <Text style={styles.blockTitle}>{t("commission.yourReadiness")}</Text>
                        <Text style={styles.blockBody}>{t("commission.readinessDescription")}</Text>
                    </View>
                    <Button
                        label={lobby.amIReady ? t("commission.ready") : t("commission.markReady")}
                        icon={lobby.amIReady ? "check" : "play"}
                        tone={lobby.amIReady ? "positive" : "accent"}
                        busy={busy === "ready"}
                        disabled={busy !== null}
                        onPress={onToggleReady}
                    />
                </View>
            ) : null}

            {role === "HEAD" ? (
                <View style={styles.headTools}>
                    <Text style={styles.headToolsTitle}>{t("commission.headTools", { name: replicaName })}</Text>
                    {lobby.isPreStart ? (
                        <View style={styles.startBlock}>
                            <PressableSurface
                                onPress={onStart}
                                disabled={!canStart || busy !== null}
                                style={[styles.start, canStart ? styles.startReady : styles.startBlocked, busy !== null && styles.dimmed]}
                            >
                                {busy === "start" ? (
                                    <ActivityIndicator size="small" color={canStart ? palette.onAccent : palette.textFaint} />
                                ) : (
                                    <Icon name="play" size={20} color={canStart ? palette.onAccent : palette.textFaint} />
                                )}
                                <Text style={[styles.startLabel, !canStart && styles.startLabelBlocked]}>
                                    {t("commission.startTasting")}
                                </Text>
                            </PressableSurface>
                            {!view.hasCandidates ? (
                                <Hint text={t("commission.addSamplesBeforeStart")} />
                            ) : !view.hasMembers ? (
                                <Hint text={t("commission.addExpertsBeforeStart")} />
                            ) : !lobby.isEveryoneReady ? (
                                <Text style={styles.waiting}>{tCount("commission.waitingMembers", lobby.notReadyCount)}</Text>
                            ) : (
                                <EveryoneReady label={t("commission.everyoneReady")} />
                            )}
                        </View>
                    ) : null}
                </View>
            ) : null}

            {view.replicaStatus === "COMPLETED" ? (
                <View style={[styles.block, styles.blockDone]}>
                    <Icon name="check" size={20} color={palette.positive} />
                    <View style={styles.blockText}>
                        <Text style={[styles.blockTitle, styles.doneTitle]}>{t("commission.sessionCompleted")}</Text>
                        <Text style={[styles.blockBody, styles.doneBody]}>{t("commission.sessionCompletedDesc")}</Text>
                        {view.isHolder || view.isReplicaMember ? (
                            <View style={styles.inlineButton}>
                                <Button label={t("commission.viewResults")} icon="competition" tone="positive" onPress={onViewResults} />
                            </View>
                        ) : null}
                    </View>
                </View>
            ) : null}

            {view.replicaStatus === "STARTED" && role && replica ? (
                <View style={[styles.block, styles.blockActive]}>
                    <View style={styles.activeHead}>
                        <Icon name="commission" size={18} color={palette.accentBright} />
                        <View style={styles.blockText}>
                            <Text style={[styles.blockTitle, styles.activeTitle]}>{t("commission.tastingActive")}</Text>
                            <Text style={styles.blockBody}>{t("commission.tastingActiveDesc")}</Text>
                        </View>
                    </View>
                    {replica.currentCandidateId ? (
                        <Text style={styles.current}>
                            {t("commission.currentCandidate", { code: currentCandidateCode(replica, t("common.na")) })}
                        </Text>
                    ) : null}
                    <PressableSurface onPress={onEnterSession} style={styles.enter}>
                        <Text style={styles.enterLabel}>{t("commission.enterTastingSession")} →</Text>
                    </PressableSurface>
                </View>
            ) : null}

            {lobby.isPreStart && role !== "HEAD" ? (
                <View style={[styles.block, styles.blockSlate, styles.blockTop]}>
                    <View style={styles.amberDot} />
                    <View style={styles.blockText}>
                        <Text style={styles.blockTitle}>{t("commission.waitingStart")}</Text>
                        <Text style={styles.blockBody}>{t("commission.waitingStartDesc")}</Text>
                    </View>
                </View>
            ) : null}
        </View>
    )
}

function Button({
    label,
    icon,
    tone = "accent",
    busy,
    disabled,
    onPress,
}: {
    label: string
    icon: IconName
    tone?: "accent" | "positive"
    busy?: boolean
    disabled?: boolean
    onPress: () => void
}) {
    return (
        <View style={styles.buttonSlot}>
            <PressableSurface
                onPress={onPress}
                disabled={disabled}
                style={[styles.button, tone === "positive" ? styles.buttonPositive : styles.buttonAccent, disabled && !busy && styles.dimmed]}
            >
                {busy ? (
                    <ActivityIndicator size="small" color={palette.onAccent} />
                ) : (
                    <Icon name={icon} size={16} color={palette.onAccent} weight="semibold" />
                )}
                <Text style={styles.buttonLabel}>{label}</Text>
            </PressableSurface>
        </View>
    )
}

function Hint({ text }: { text: string }) {
    return (
        <View style={styles.hint}>
            <Icon name="alert" size={14} color={palette.warning} />
            <Text style={styles.hintText}>{text}</Text>
        </View>
    )
}

/** The web's pulsing "Everyone is ready". */
function EveryoneReady({ label }: { label: string }) {
    const pulse = useRef(new Animated.Value(1)).current
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 0.5, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ]),
        )
        loop.start()
        return () => loop.stop()
    }, [pulse])
    return (
        <Animated.View style={[styles.everyone, { opacity: pulse }]}>
            <Icon name="done" size={16} color={palette.positive} weight="bold" />
            <Text style={styles.everyoneLabel}>{label}</Text>
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    card: { gap: 20 },
    heading: { fontSize: 14, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: palette.textFaint },
    block: { gap: 12, padding: 16, borderRadius: radius.tile, borderWidth: 1, ...continuous },
    blockTop: { flexDirection: "row", alignItems: "flex-start" },
    blockIndigo: { borderColor: palette.accentBorder, backgroundColor: "rgba(238, 242, 255, 0.4)" },
    blockSlate: { borderColor: palette.borderSoft, backgroundColor: "rgba(248, 250, 252, 0.6)" },
    blockDone: {
        flexDirection: "row",
        alignItems: "flex-start",
        borderColor: "rgba(0, 188, 125, 0.2)",
        backgroundColor: "rgba(0, 188, 125, 0.1)",
    },
    blockActive: { borderColor: "rgba(224, 231, 255, 0.5)", backgroundColor: "rgba(238, 242, 255, 0.4)" },
    blockText: { flex: 1, gap: 2 },
    blockTitle: { fontSize: 14, fontWeight: "700", color: palette.heading },
    blockBody: { fontSize: 12, lineHeight: 17, color: palette.textMuted },
    doneTitle: { color: "#006045" },
    doneBody: { color: "rgba(0, 153, 102, 0.9)" },
    activeHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    activeTitle: { color: "#372aac" },
    current: { fontSize: 12, fontWeight: "500", color: palette.textMuted },
    inlineButton: { marginTop: 10 },
    buttonSlot: { alignSelf: "flex-start" },
    button: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: radius.md,
        ...continuous,
    },
    buttonAccent: { backgroundColor: palette.accent, boxShadow: "0 10px 15px -3px rgba(79, 57, 246, 0.15)" },
    buttonPositive: { backgroundColor: "#00bc7d", boxShadow: "0 10px 15px -3px rgba(0, 188, 125, 0.2)" },
    buttonLabel: { fontSize: 12, fontWeight: "600", color: palette.onAccent },
    dimmed: { opacity: 0.45 },
    headTools: { gap: 12, paddingTop: 20, borderTopWidth: 1, borderTopColor: palette.borderSoft },
    headToolsTitle: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: palette.textFaint },
    startBlock: { gap: 12 },
    start: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: radius.md,
        ...continuous,
    },
    startReady: {
        experimental_backgroundImage: brandGradient,
        boxShadow: "0 10px 15px -3px rgba(99, 102, 241, 0.25)",
    },
    startBlocked: { borderWidth: 1, borderColor: palette.border, backgroundColor: "#f1f5f9" },
    startLabel: { fontSize: 15, fontWeight: "600", color: palette.onAccent },
    startLabelBlocked: { color: palette.textFaint },
    hint: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: "rgba(254, 230, 133, 0.6)",
        backgroundColor: "#fffbeb",
    },
    hintText: { flex: 1, fontSize: 12, fontWeight: "500", color: palette.warning },
    waiting: { fontSize: 12, fontWeight: "500", color: palette.textMuted },
    everyone: { flexDirection: "row", alignItems: "center", gap: 6 },
    everyoneLabel: { fontSize: 12, fontWeight: "600", color: palette.positive },
    enter: { alignItems: "center", paddingVertical: 12, borderRadius: radius.md, backgroundColor: palette.accent, ...continuous },
    enterLabel: { fontSize: 14, fontWeight: "700", color: palette.onAccent },
    amberDot: { width: 10, height: 10, marginTop: 5, borderRadius: 5, backgroundColor: "#fe9a00" },
})
