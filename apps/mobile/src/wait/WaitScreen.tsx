import { useMemo, useState } from "react"
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Stack } from "expo-router"
import * as Haptics from "expo-haptics"
import { formatSignedDiff, hasEvaluationData } from "@winelore/core"
import { AdvancePanelError, type WaitRoomProgress, type WaitRoomState } from "@winelore/core/commission"
import { useTranslation } from "../i18n/LocaleProvider"
import { MemberEvaluation } from "../results/MemberEvaluation"
import { MONOSPACE, cardShadow, continuous, palette, radius, spacing, type } from "../theme"
import { Icon } from "../ui/Icon"
import { useDisplayNames } from "../users/useDisplayNames"
import { WineJumper } from "./WineJumper"
import { useWaitRoom } from "./useWaitRoom"

/**
 * The web's /commission/[id]/replica/[replicaId]/wait.
 *
 * One screen, two jobs. A judge sees that their scorecard is in, what they
 * submitted, and how much of the panel is left. The chair sees every member's
 * progress — with the scores as they land — and the control to move the panel
 * on, which stays disabled until everyone is in.
 *
 * Both views carry the Wine Jumper mini-game when the commission enables it,
 * as the web does.
 */
export function WaitScreen({ commissionId, replicaId }: { commissionId: string; replicaId: string }) {
    const { t } = useTranslation()
    const { room, isLoading, isAdvancing, advance, confirm } = useWaitRoom(commissionId, replicaId)

    return (
        <>
            <Stack.Screen
                options={{
                    title: room.isHead ? t("commission.headDashboard") : t("commission.nextBeverage"),
                    headerBackVisible: false,
                }}
            />
            {room.isHead ? (
                <HeadDashboard
                    room={room}
                    isAdvancing={isAdvancing}
                    onAdvance={advance}
                    onConfirm={confirm}
                />
            ) : (
                <ExpertView room={room} isLoading={isLoading} />
            )}
        </>
    )
}

// --- The chair ---------------------------------------------------------------

function HeadDashboard({
    room,
    isAdvancing,
    onAdvance,
    onConfirm,
}: {
    room: WaitRoomState
    isAdvancing: boolean
    onAdvance: () => Promise<void>
    onConfirm: (evaluationId: string) => Promise<void>
}) {
    const { t, tCount } = useTranslation()
    const names = useDisplayNames(useMemo(() => room.members.flatMap((member) => member.auids), [room.members]))
    const nameOf = (row: WaitRoomProgress) => row.member.auids.map((id) => names[id] || id).join(", ")

    const advance = async () => {
        if (!room.canAdvance || isAdvancing) return
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        try {
            await onAdvance()
        } catch (error) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert(
                t("commission.markEvaluatedErrorGeneric"),
                t(error instanceof AdvancePanelError ? error.key : "commission.markEvaluatedErrorGeneric"),
            )
        }
    }

    const disabled = !room.canAdvance || isAdvancing

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.content}
            contentInsetAdjustmentBehavior="automatic"
        >
            <View style={styles.card}>
                {room.currentPanelName ? (
                    <Text style={styles.kicker}>
                        {t("commission.panel")}: {room.currentPanelName}
                    </Text>
                ) : null}
                <View style={styles.candidateLine}>
                    <Text style={styles.candidateLabel}>{t("commission.currentCandidateLabel")}</Text>
                    <Text style={styles.candidateCode}>{room.currentCandidateCode || t("common.none")}</Text>
                </View>
                {room.currentCandidateBeverageName ? (
                    <View style={styles.beverageChip}>
                        <Icon name="beverage" size={12} color="#973c00" />
                        <Text style={styles.beverageName} numberOfLines={1}>
                            {room.currentCandidateBeverageName}
                        </Text>
                    </View>
                ) : null}
                {room.candidatesLeft > 0 ? (
                    <Text style={styles.leftLine}>
                        {tCount("commission.candidatesLeftToEvaluate", room.candidatesLeft)}
                    </Text>
                ) : null}
            </View>

            <Pressable
                accessibilityRole="button"
                disabled={disabled}
                onPress={advance}
                style={({ pressed }) => [styles.action, disabled && styles.actionDisabled, pressed && styles.pressed]}
            >
                {isAdvancing ? <ActivityIndicator color={palette.onAccent} /> : null}
                <Text style={styles.actionLabel}>
                    {room.isLastCandidateInPanel ? t("commission.finishPanel") : t("commission.nextBeverage")}
                </Text>
                {isAdvancing ? null : <Icon name="arrow" size={15} color={palette.onAccent} weight="semibold" />}
            </Pressable>

            <View style={styles.card}>
                <View style={styles.sectionHeader}>
                    <Icon name="people" size={15} color={palette.accent} />
                    <Text style={styles.sectionTitle}>
                        {tCount("commission.commissionMembers", room.members.length)}
                    </Text>
                </View>
                {room.progress.length === 0 ? (
                    <Text style={styles.placeholder}>{t("commission.loadingMembers")}</Text>
                ) : null}
                {room.progress.map((row, index) => (
                    <MemberRow
                        key={`${room.currentCandidateId}-${row.member.auids[0] ?? index}`}
                        row={row}
                        name={nameOf(row)}
                        room={room}
                        onConfirm={onConfirm}
                    />
                ))}
            </View>

            {room.flags.wineJumperMiniGameEnabled ? <GameCard /> : null}
        </ScrollView>
    )
}

function MemberRow({
    row,
    name,
    room,
    onConfirm,
}: {
    row: WaitRoomProgress
    name: string
    room: WaitRoomState
    onConfirm: (evaluationId: string) => Promise<void>
}) {
    const { t } = useTranslation()
    const { evaluation, isCompleted, outlier } = row
    const isOutlier = Boolean(outlier?.isOutlier)
    const isHead = row.member.isHead
    // The chair's own row always shows what they submitted; a judge's shows
    // only once complete, unless there is a draft to look at and confirm.
    const shows = isHead
        ? isCompleted && evaluation
        : evaluation && hasEvaluationData(evaluation, room.flags)

    return (
        <View style={[styles.memberRow, isHead && styles.memberRowHead, isOutlier && styles.memberRowOutlier]}>
            <View style={styles.memberTop}>
                <View style={styles.memberIdentity}>
                    <Text style={[styles.memberName, isHead && styles.memberNameHead]} numberOfLines={1}>
                        {name}
                        {row.member.isTrainee ? ` (${t("commission.roleTrainee")})` : ""}
                    </Text>
                    {isHead ? (
                        <View style={styles.roleChip}>
                            <Text style={styles.roleChipLabel}>{t("commission.headOfCommission")}</Text>
                        </View>
                    ) : null}
                </View>
                <View style={[styles.statusChip, isCompleted ? styles.statusDone : styles.statusPending]}>
                    <Text style={[styles.statusLabel, isCompleted ? styles.statusLabelDone : styles.statusLabelPending]}>
                        {isCompleted ? t("commission.completed") : t("commission.evaluating")}
                    </Text>
                </View>
            </View>

            {isOutlier ? (
                <View style={styles.outlierChip}>
                    <Icon name="warning" size={11} color="#bb4d00" />
                    <Text style={styles.outlierLabel}>{t("commission.results.outOfDelta")}</Text>
                    {outlier?.signedDiff != null ? (
                        <Text style={styles.outlierDiff}>({formatSignedDiff(outlier.signedDiff)})</Text>
                    ) : null}
                </View>
            ) : null}

            {shows && evaluation ? (
                <>
                    {evaluation.status ? (
                        <View style={styles.draftLine}>
                            <View
                                style={[
                                    styles.statusChip,
                                    evaluation.status === "DRAFT" ? styles.statusPending : styles.statusDone,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.statusLabel,
                                        evaluation.status === "DRAFT"
                                            ? styles.statusLabelPending
                                            : styles.statusLabelDone,
                                    ]}
                                >
                                    {evaluation.status === "DRAFT"
                                        ? t("evaluation.draftStatus")
                                        : t("evaluation.confirmedStatus")}
                                </Text>
                            </View>
                            {evaluation.status === "DRAFT" && evaluation.id ? (
                                <ConfirmButton id={evaluation.id} onConfirm={onConfirm} />
                            ) : null}
                        </View>
                    ) : null}
                    <MemberEvaluation
                        evaluation={evaluation}
                        propertyMap={room.propertyMap}
                        flags={room.flags}
                        tone={isHead ? "indigo" : "slate"}
                        forceShowAll={!isHead && !isCompleted}
                    />
                </>
            ) : null}
        </View>
    )
}

function ConfirmButton({ id, onConfirm }: { id: string; onConfirm: (id: string) => Promise<void> }) {
    const { t } = useTranslation()
    const [busy, setBusy] = useState(false)

    return (
        <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={async () => {
                setBusy(true)
                await Haptics.selectionAsync()
                try {
                    await onConfirm(id)
                } catch (error) {
                    Alert.alert(t("evaluation.submitError"), error instanceof Error ? error.message : "")
                } finally {
                    setBusy(false)
                }
            }}
            hitSlop={6}
            style={({ pressed }) => [styles.confirm, (busy || pressed) && styles.pressed]}
        >
            <Text style={styles.confirmLabel}>
                {busy ? t("evaluation.confirmingEvaluation") : t("evaluation.confirmEvaluation")}
            </Text>
        </Pressable>
    )
}

// --- A judge ------------------------------------------------------------------

function ExpertView({ room, isLoading }: { room: WaitRoomState; isLoading: boolean }) {
    const { t, tCount } = useTranslation()
    const myEvaluation = room.myEvaluation
    const showsEvaluation = myEvaluation && hasEvaluationData(myEvaluation, room.flags)

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.content}
            contentInsetAdjustmentBehavior="automatic"
        >
            <View style={styles.hero}>
                <View style={styles.heroBadge}>
                    <Icon name="beverage" size={28} color={palette.accent} />
                </View>
                <Text style={styles.heroTitle}>{t("commission.evaluationSubmitted")}</Text>
                <Text style={styles.heroBody}>
                    {t("commission.waitingNextRound")} {t("commission.autoRefreshNotice")}
                </Text>
                {room.candidatesLeftAfterCurrent > 0 ? (
                    <Text style={styles.heroCount}>
                        {tCount("commission.candidatesLeftToEvaluate", room.candidatesLeftAfterCurrent)}
                    </Text>
                ) : null}
            </View>

            {showsEvaluation ? (
                <View style={styles.card}>
                    {/* No kicker here: MemberEvaluation labels each group of
                        scores itself, and a second heading just repeated it. */}
                    <MemberEvaluation
                        evaluation={myEvaluation}
                        propertyMap={room.propertyMap}
                        flags={room.flags}
                        tone="slate"
                        forceShowAll
                    />
                </View>
            ) : null}

            {room.flags.wineJumperMiniGameEnabled ? <GameCard /> : null}

            <View style={styles.waitingLine}>
                <ActivityIndicator size="small" color={palette.accent} />
                <Text style={styles.waitingLabel}>
                    {isLoading ? t("common.loading") : t("commission.waitingOtherExperts")}
                </Text>
            </View>
        </ScrollView>
    )
}

/** The game in a card, titled as the web titles it. */
function GameCard() {
    const { t } = useTranslation()
    return (
        <View style={styles.card}>
            <Text style={[styles.kicker, styles.kickerCentred]}>{t("commission.boredPlay")}</Text>
            <WineJumper />
        </View>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
    card: {
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.card,
        backgroundColor: palette.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: palette.borderSoft,
        ...continuous,
        ...cardShadow,
    },
    kicker: {
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 0.5,
        textTransform: "uppercase",
        color: palette.textFaint,
    },
    kickerCentred: { textAlign: "center" },
    candidateLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.xs },
    candidateLabel: { ...type.body, color: palette.textMuted },
    candidateCode: { ...type.title, fontFamily: MONOSPACE, color: palette.accentText },
    // bg-amber-100 / text-amber-900 / border-amber-300
    beverageChip: {
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: "#ffd230",
        backgroundColor: "#fef3c6",
    },
    beverageName: { flexShrink: 1, fontSize: 12, fontWeight: "700", color: "#733e0a" },
    leftLine: { ...type.caption, color: palette.textMuted },

    action: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
        height: 52,
        borderRadius: radius.md,
        backgroundColor: palette.positive,
        ...continuous,
    },
    actionDisabled: { backgroundColor: palette.textGhost },
    actionLabel: { ...type.body, fontWeight: "700", color: palette.onAccent },
    pressed: { opacity: 0.85 },

    sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    sectionTitle: { ...type.title, color: palette.heading },
    placeholder: { ...type.caption, color: palette.textFaint },

    memberRow: {
        gap: spacing.xs,
        padding: spacing.sm,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.background,
        ...continuous,
    },
    memberRowHead: { borderColor: palette.accentBorder, backgroundColor: palette.accentSoft },
    // bg-amber-50 / border-amber-300
    memberRowOutlier: { borderWidth: 2, borderColor: "#ffd230", backgroundColor: "#fffbeb" },
    memberTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.xs },
    memberIdentity: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
    memberName: { flexShrink: 1, ...type.body, fontWeight: "600", color: palette.textStrong },
    memberNameHead: { fontWeight: "700", color: "#1e1a4d" },
    roleChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm, backgroundColor: palette.accentBorder },
    roleChipLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase", color: palette.accent },

    statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
    // bg-emerald-100 / bg-amber-100
    statusDone: { backgroundColor: "#d0fae5" },
    statusPending: { backgroundColor: "#fef3c6" },
    statusLabel: { fontSize: 11, fontWeight: "700" },
    statusLabelDone: { color: palette.positive },
    statusLabelPending: { color: palette.warning },

    // bg-amber-100 / text-amber-800
    outlierChip: {
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: "#ffd230",
        backgroundColor: "#fef3c6",
    },
    outlierLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase", color: "#973c00" },
    outlierDiff: { fontSize: 10, fontFamily: MONOSPACE, color: "#973c00" },

    draftLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.xs },
    confirm: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: radius.sm,
        backgroundColor: palette.positive,
        ...continuous,
    },
    confirmLabel: { fontSize: 11, fontWeight: "700", color: palette.onAccent },

    hero: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg },
    heroBadge: {
        width: 84,
        height: 84,
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: palette.accentSoft,
    },
    heroTitle: { ...type.largeTitle, color: palette.heading, textAlign: "center" },
    heroBody: { ...type.body, color: palette.textMuted, textAlign: "center" },
    heroCount: { ...type.caption, fontWeight: "700", color: palette.accentText, textAlign: "center" },

    waitingLine: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
    waitingLabel: { ...type.body, fontWeight: "500", color: palette.textMuted },
})
