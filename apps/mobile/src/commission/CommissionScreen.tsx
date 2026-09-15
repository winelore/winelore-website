import { useEffect, useMemo, useRef, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
    type LayoutChangeEvent,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
} from "react-native"
import { Stack, useRouter } from "expo-router"
import { useHeaderHeight } from "expo-router/react-navigation"
import * as Haptics from "expo-haptics"
import {
    NO_CANDIDATES_TO_START,
    commissionPageView,
    commissionPeopleAuids,
    commissionStepIndex,
    defaultCommissionReplica,
    type CommissionPageData,
    type CommissionSetting,
} from "@winelore/core/commission"
import { StepsCard } from "../competition/parts"
import { TimelineCard } from "../competition/TimelineCard"
import { useTranslation } from "../i18n/LocaleProvider"
import { destinations, useOpenDestination } from "../navigation/destinations"
import { continuous, palette, radius } from "../theme"
import { Icon } from "../ui/Icon"
import { PressableSurface } from "../ui/Pressable"
import { panelSurface } from "../ui/Surface"
import { useDisplayNames } from "../users/useDisplayNames"
import { AddExpertSheet } from "./AddExpertSheet"
import { CommissionActionsCard } from "./CommissionActionsCard"
import {
    addReplicaMember,
    createReplica,
    removeReplicaMember,
    renameCommission,
    renameReplica,
    setChaoticCandidateChanges,
    setChaoticPanelChanges,
    setCommissionSetting,
    setMemberReady,
    startTasting,
    submitCommissionForReview,
    updateCommissionDates,
} from "./mutations"
import { ReplicasCard } from "./ReplicasCard"
import { SessionCard } from "./SessionCard"
import { EvaluationSettingsCard, ReplicaSettingsCard } from "./SettingsCards"
import { TastingPanelCard } from "./TastingPanelCard"
import { useCommissionPage } from "./useCommissionPage"

/**
 * The web's /commission/[id], stacked as its phone layout stacks it: the
 * banners to a finished session's results, the session's card, its timeline,
 * the replicas, the selected replica's steps and judges, the holder's
 * settings, and the actions — readiness, the chair's start, entering the
 * session. It polls every three seconds, as the web does, and when the
 * selected replica starts a judge on it is taken into the session.
 *
 * `replicaId`, when given, is the replica to open on.
 */
export function CommissionScreen({ id, replicaId }: { id: string; replicaId?: string }) {
    const { t } = useTranslation()
    const { state, reload, patch } = useCommissionPage(id)
    const header = <Stack.Screen options={{ title: "", headerLargeTitle: false }} />

    if (state.status === "loading") {
        return (
            <>
                {header}
                <View style={styles.centered}>
                    <ActivityIndicator color={palette.accent} />
                </View>
            </>
        )
    }

    if (state.status !== "ready") {
        const failed = state.status === "error"
        return (
            <>
                {header}
                <ScrollView style={styles.screen} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
                    <View style={[panelSurface, styles.missing]}>
                        <View style={[styles.missingTile, failed && styles.missingTileError]}>
                            <Icon name={failed ? "alert" : "commission"} size={40} color={failed ? palette.danger : palette.textFaint} />
                        </View>
                        <Text style={styles.missingTitle}>{failed ? t("myCommissions.errorTitle") : t("commission.notFoundTitle")}</Text>
                        <Text style={styles.missingBody}>{failed ? t("myCommissions.errorDescription") : t("commission.notFoundDescription")}</Text>
                        {failed ? (
                            <PressableSurface onPress={reload} style={styles.missingButton}>
                                <Text style={styles.missingButtonLabel}>{t("errors.retry")}</Text>
                            </PressableSurface>
                        ) : null}
                    </View>
                </ScrollView>
            </>
        )
    }

    return <Loaded page={state.page} auid={state.auid} initialReplicaId={replicaId} reload={reload} patch={patch} />
}

type Busy = "name" | "dates" | "replica" | "setting" | "review" | "ready" | "start" | null

function Loaded({
    page,
    auid,
    initialReplicaId,
    reload,
    patch,
}: {
    page: CommissionPageData
    auid: string | null
    initialReplicaId?: string
    reload: () => Promise<void>
    patch: (update: (page: CommissionPageData) => CommissionPageData) => void
}) {
    const { t } = useTranslation()
    const router = useRouter()
    const open = useOpenDestination()
    const headerHeight = useHeaderHeight()
    const [selectedId, setSelectedId] = useState<string | null>(
        () => initialReplicaId ?? defaultCommissionReplica(page.replicas, auid)?.id ?? null,
    )
    const [busy, setBusy] = useState<Busy>(null)
    const [removingId, setRemovingId] = useState<string | null>(null)
    const [addingExpert, setAddingExpert] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [titleShown, setTitleShown] = useState(false)
    const cardY = useRef(0)
    const nameBottom = useRef(0)

    const view = commissionPageView(page, selectedId, auid)
    const replica = view.replica
    const replicaName = replica?.name || t("common.standard")
    const people = useMemo(() => commissionPeopleAuids(page, view.members).map(String), [page, view.members])
    const names = useDisplayNames(people)
    const me = auid ?? ""

    // The selected replica has just started: a judge on it goes in, as the web sends them.
    const previousStatus = useRef(replica?.status)
    useEffect(() => {
        const before = previousStatus.current
        previousStatus.current = replica?.status
        if (replica && before !== undefined && before !== "STARTED" && replica.status === "STARTED" && view.isReplicaMember) {
            router.push(`/wait/${page.id}/${replica.id}`)
        }
    }, [replica?.status, replica, view.isReplicaMember, page.id, router])

    /** A mutation, then a fresh page; a failure says why and changes nothing. */
    const run = async (kind: Busy, work: () => Promise<unknown>, errorTitle: string): Promise<boolean> => {
        setBusy(kind)
        try {
            await work()
            await reload()
            return true
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert(errorTitle, error instanceof Error ? error.message : String(error))
            return false
        } finally {
            setBusy(null)
        }
    }

    const toggleSetting = (key: CommissionSetting, value: boolean) => {
        patch((current) => ({ ...current, [key]: value }))
        run("setting", () => setCommissionSetting(page.id, key, value, me), t("commission.addMemberError")).then((saved) => {
            if (!saved) patch((current) => ({ ...current, [key]: !value }))
        })
    }

    const patchReplica = (replicaId: string, update: (replica: CommissionPageData["replicas"][number]) => CommissionPageData["replicas"][number]) =>
        patch((current) => ({ ...current, replicas: current.replicas.map((item) => (item.id === replicaId ? update(item) : item)) }))

    const toggleReady = () => {
        if (!replica || !view.memberId) return
        const ready = !view.lobby.amIReady
        const memberId = view.memberId
        run("ready", () => setMemberReady(replica.id, memberId, ready, me), t("commission.markReady")).then((saved) => {
            if (saved) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        })
        patchReplica(replica.id, (item) => ({
            ...item,
            members: item.members.map((member) => (member.id === memberId ? { ...member, isReady: ready } : member)),
        }))
    }

    /**
     * Starting cannot be undone and takes everyone in, so it asks first —
     * where the web does not — as starting a competition does here.
     */
    const start = () => {
        if (!replica) return
        Alert.alert(t("commission.startTasting"), t("commission.startTastingConfirm"), [
            { text: t("competition.cancel"), style: "cancel" },
            {
                text: t("commission.startTasting"),
                onPress: async () => {
                    setBusy("start")
                    try {
                        await startTasting(replica.id, page.id, me)
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                        router.push(`/wait/${page.id}/${replica.id}`)
                        reload()
                    } catch (error) {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
                        const message = error instanceof Error ? error.message : ""
                        Alert.alert(
                            t("commission.startTasting"),
                            message === NO_CANDIDATES_TO_START
                                ? t("commission.startTastingNoSamplesError")
                                : t("commission.startTastingErrorGeneric"),
                        )
                    } finally {
                        setBusy(null)
                    }
                },
            },
        ])
    }

    const submit = () =>
        Alert.alert(t("commission.submitReviewTitle"), t("commission.submitReviewDescription"), [
            { text: t("competition.cancel"), style: "cancel" },
            {
                text: t("commission.submitReviewButton"),
                onPress: () => run("review", () => submitCommissionForReview(page.id, me), t("commission.submitReviewError")),
            },
        ])

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const shown = event.nativeEvent.contentOffset.y + headerHeight > cardY.current + nameBottom.current
        if (shown !== titleShown) setTitleShown(shown)
    }

    const onRefresh = async () => {
        setRefreshing(true)
        await reload()
        setRefreshing(false)
    }

    const results = () => open(destinations.competitionResults(page.competition.id, page.id))

    return (
        <>
            <Stack.Screen options={{ title: titleShown ? page.name : "", headerLargeTitle: false }} />
            <ScrollView
                style={styles.screen}
                contentContainerStyle={styles.content}
                contentInsetAdjustmentBehavior="automatic"
                keyboardShouldPersistTaps="handled"
                onScroll={onScroll}
                scrollEventThrottle={16}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} colors={[palette.accent]} />}
            >
                {view.summaryReplica ? (
                    <Banner
                        tone="indigo"
                        icon="beverage"
                        title={t("commission.myRankingTitle")}
                        body={t("commission.myRankingDesc")}
                        action={t("commission.viewMyTastingSummary")}
                        actionIcon="beverage"
                        onPress={() => open(destinations.tastingSummary(page.id, view.summaryReplica!.id))}
                    />
                ) : null}
                {view.showResultsBanner ? (
                    <Banner
                        tone={view.isCompleted ? "emerald" : "indigo"}
                        icon={view.isCompleted ? "check" : "competition"}
                        title={view.isCompleted ? t("commission.sessionCompleted") : t("commission.resultsBannerTitle")}
                        body={view.isCompleted ? t("commission.allCandidatesEvaluatedDesc") : t("commission.resultsBannerDesc")}
                        action={t("commission.continueToResults")}
                        actionIcon="competition"
                        onPress={results}
                    />
                ) : null}

                <View onLayout={(event: LayoutChangeEvent) => (cardY.current = event.nativeEvent.layout.y)}>
                    <SessionCard
                        page={page}
                        replica={replica}
                        replicaStatus={view.replicaStatus}
                        names={names}
                        canRename={view.isHolder && view.isDraft}
                        busy={busy === "name"}
                        onRename={(name) => run("name", () => renameCommission(page.id, name, me), t("commission.editCommissionName"))}
                        onNameLayout={(event) => {
                            const { y, height } = event.nativeEvent.layout
                            nameBottom.current = y + height
                        }}
                    />
                </View>

                <TimelineCard
                    page={page}
                    labels={{
                        title: t("commission.timelineDetails"),
                        plannedStart: t("commission.plannedStart"),
                        plannedEnd: t("commission.plannedEnd"),
                        actualStart: t("commission.actualStart"),
                        actualEnd: t("commission.actualEnd"),
                        notStarted: t("commission.notStartedYet"),
                        notEnded: t("commission.notCompletedYet"),
                    }}
                    canEdit={view.isHolder && view.isDraft && !page.startedAt}
                    showCalendar={replica?.status === "PLANNED"}
                    calendarDetails=""
                    busy={busy === "dates"}
                    onSaveDates={(startAt, endAt) =>
                        run("dates", () => updateCommissionDates(page.id, startAt, endAt, me), t("common.editPlannedDates"))
                    }
                />

                {page.replicas.length > 0 || view.isHolder ? (
                    <ReplicasCard
                        replicas={page.replicas}
                        selectedId={replica?.id ?? null}
                        auid={auid}
                        canEdit={view.isHolder && view.isDraft}
                        busy={busy === "replica"}
                        onSelect={setSelectedId}
                        onAdd={(name, type) => run("replica", () => createReplica(page.id, name, type, me), t("commission.addReplica"))}
                        onRename={(replicaId, name) => run("replica", () => renameReplica(replicaId, name, me), t("commission.renameReplica"))}
                    />
                ) : null}

                <StepsCard
                    current={commissionStepIndex(view.replicaStatus)}
                    steps={[
                        { label: t("commission.stepReadying"), description: t("commission.stepReadyingDesc") },
                        { label: t("commission.stepTasting"), description: t("commission.stepTastingDesc") },
                        { label: t("commission.stepCompleted"), description: t("commission.stepCompletedDesc") },
                    ]}
                />

                <TastingPanelCard
                    replicaName={replicaName}
                    members={view.members}
                    readyCount={view.readyCount}
                    names={names}
                    auid={auid}
                    canManage={view.isHolder && view.isDraft && view.isReplicaDraft && replica !== null}
                    removingId={removingId}
                    onAdd={() => setAddingExpert(true)}
                    onRemove={async (memberId) => {
                        if (!replica) return
                        setRemovingId(memberId)
                        await run(null, () => removeReplicaMember(replica.id, memberId, me), t("commission.removeMemberErrorGeneric"))
                        setRemovingId(null)
                    }}
                />

                {view.isHolder ? <EvaluationSettingsCard page={page} busy={busy === "setting"} onChange={toggleSetting} /> : null}

                {view.isHolder && replica ? (
                    <ReplicaSettingsCard
                        replica={replica}
                        activePanel={view.activePanel}
                        busy={busy === "setting"}
                        onChaoticCandidates={(value) => {
                            const panel = view.activePanel
                            if (!panel) return
                            patchReplica(replica.id, (item) => ({
                                ...item,
                                replicaPanels: item.replicaPanels.map((entry) =>
                                    entry.id === panel.id ? { ...entry, chaoticCurrentCandidateChangesEnabled: value } : entry,
                                ),
                            }))
                            run("setting", () => setChaoticCandidateChanges(replica.id, panel.id, value, me), t("commission.addMemberError"))
                        }}
                        onChaoticPanels={(value) => {
                            patchReplica(replica.id, (item) => ({ ...item, chaoticCurrentPanelChangesEnabled: value }))
                            run("setting", () => setChaoticPanelChanges(replica.id, value, me), t("commission.addMemberError"))
                        }}
                    />
                ) : null}

                <CommissionActionsCard
                    view={view}
                    replicaName={replicaName}
                    busy={busy === "review" || busy === "ready" || busy === "start" ? busy : null}
                    onSubmitForReview={submit}
                    onToggleReady={toggleReady}
                    onStart={start}
                    onEnterSession={() => replica && router.push(`/wait/${page.id}/${replica.id}`)}
                    onViewResults={results}
                />
            </ScrollView>

            <AddExpertSheet
                visible={addingExpert}
                replicaName={replicaName}
                onClose={() => setAddingExpert(false)}
                onAdd={async (memberAuid, role) => {
                    if (!replica) return t("commission.failedToAddMember")
                    try {
                        await addReplicaMember(replica.id, memberAuid, role, me)
                        await reload()
                        return null
                    } catch (error) {
                        return error instanceof Error && error.message ? error.message : t("commission.failedToAddMember")
                    }
                }}
            />
        </>
    )
}

const BANNER = {
    indigo: { background: palette.accentSoft, border: "#c6d2ff", title: "#312c85", body: palette.accent, button: palette.accent, icon: palette.accent },
    emerald: { background: "#ecfdf5", border: "#a4f4cf", title: "#006045", body: palette.positive, button: palette.positive, icon: palette.positive },
} as const

/** The web's banners over the page: a finished session's results, and a judge's own ranking. */
function Banner({
    tone,
    icon,
    title,
    body,
    action,
    actionIcon,
    onPress,
}: {
    tone: keyof typeof BANNER
    icon: "beverage" | "check" | "competition"
    title: string
    body: string
    action: string
    actionIcon: "beverage" | "competition"
    onPress: () => void
}) {
    const look = BANNER[tone]
    return (
        <View style={[styles.banner, { backgroundColor: look.background, borderColor: look.border }]}>
            <View style={styles.bannerHead}>
                <Icon name={icon} size={20} color={look.icon} />
                <View style={styles.bannerText}>
                    <Text style={[styles.bannerTitle, { color: look.title }]}>{title}</Text>
                    <Text style={[styles.bannerBody, { color: look.body }]}>{body}</Text>
                </View>
            </View>
            <PressableSurface onPress={onPress} style={[styles.bannerButton, { backgroundColor: look.button }]}>
                <Icon name={actionIcon} size={16} color={palette.onAccent} />
                <Text style={styles.bannerButtonLabel}>{action}</Text>
            </PressableSurface>
        </View>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32, gap: 24 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.background },
    missing: { alignItems: "center", paddingVertical: 48, gap: 8 },
    missingTile: {
        width: 80,
        height: 80,
        marginBottom: 16,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.background,
    },
    missingTileError: { borderColor: palette.dangerBorder, backgroundColor: palette.dangerSoft },
    missingTitle: { fontSize: 22, fontWeight: "800", color: palette.heading, textAlign: "center" },
    missingBody: { fontSize: 14, lineHeight: 20, color: palette.textMuted, textAlign: "center" },
    missingButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.md, backgroundColor: palette.accent },
    missingButtonLabel: { fontSize: 14, fontWeight: "700", color: palette.onAccent },
    // rounded-2xl px-4 py-4 border shadow-sm
    banner: { gap: 16, padding: 16, borderRadius: radius.tile, borderWidth: 1, ...continuous },
    bannerHead: { flexDirection: "row", alignItems: "center", gap: 12 },
    bannerText: { flex: 1, gap: 2 },
    bannerTitle: { fontSize: 14, fontWeight: "700" },
    bannerBody: { fontSize: 12, lineHeight: 16 },
    bannerButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 10,
        borderRadius: radius.md,
        ...continuous,
    },
    bannerButtonLabel: { fontSize: 14, fontWeight: "700", color: palette.onAccent },
})
