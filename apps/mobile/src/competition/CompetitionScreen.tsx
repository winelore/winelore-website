import { useMemo, useRef, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
    type LayoutChangeEvent,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
} from "react-native"
import { Stack } from "expo-router"
import { useHeaderHeight } from "expo-router/react-navigation"
import * as Haptics from "expo-haptics"
import { isCompetitionHolder, type CompetitionPageData } from "@winelore/core/competition"
import { useTranslation } from "../i18n/LocaleProvider"
import { destinations, useOpenDestination } from "../navigation/destinations"
import { palette, radius } from "../theme"
import { Icon } from "../ui/Icon"
import { PressableSurface } from "../ui/Pressable"
import { panelSurface } from "../ui/Surface"
import { useDisplayNames } from "../users/useDisplayNames"
import { ActionsCard } from "./ActionsCard"
import { HeroCard } from "./HeroCard"
import {
    addCommission,
    renameCompetition,
    startCompetition,
    submitCompetitionForReview,
    updateCompetitionDates,
} from "./mutations"
import { SeriesCard, StatusSteps } from "./parts"
import { SessionsCard } from "./SessionsCard"
import { TimelineCard } from "./TimelineCard"
import { useCompetitionPage } from "./useCompetitionPage"

/**
 * The web's /competition/[id], in the order its phone layout stacks it: the
 * competition itself, its progress, series and timeline, a holder's controls,
 * then its commissions.
 *
 * The name lives in the first card, as on the web; the navigation bar takes
 * it up only once that card has scrolled away, the way the web's phone header
 * does. "Competition Results" is in the navigation bar too, as the web puts
 * it there on a phone.
 */
export function CompetitionScreen({ id }: { id: string }) {
    const { t } = useTranslation()
    const open = useOpenDestination()
    const { state, reload } = useCompetitionPage(id)
    const [refreshing, setRefreshing] = useState(false)

    const refresh = async () => {
        setRefreshing(true)
        await reload()
        setRefreshing(false)
    }

    const openResults = () => open(destinations.competitionResults(id))
    const header = (title: string) => (
        <Stack.Screen
            options={{
                title,
                headerLargeTitle: false,
                unstable_headerRightItems: () => [
                    {
                        type: "button",
                        label: t("competition.resultsButton"),
                        icon: { type: "sfSymbol", name: "trophy" },
                        onPress: openResults,
                    },
                ],
                headerRight: () => (
                    <PressableSurface
                        onPress={openResults}
                        accessibilityLabel={t("competition.resultsButton")}
                        feedback="highlight"
                        style={styles.headerButton}
                    >
                        <Icon name="competition" size={22} color={palette.accent} />
                    </PressableSurface>
                ),
            }}
        />
    )

    if (state.status === "loading") {
        return (
            <>
                {header("")}
                <View style={styles.centered}>
                    <ActivityIndicator color={palette.accent} />
                </View>
            </>
        )
    }

    if (state.status !== "ready") {
        return (
            <>
                {header("")}
                <ScrollView
                    style={styles.screen}
                    contentContainerStyle={styles.content}
                    contentInsetAdjustmentBehavior="automatic"
                >
                    <View style={[panelSurface, styles.missing]}>
                        <Icon name="alert" size={48} color={palette.textGhost} />
                        <Text style={styles.missingTitle}>{t("competition.notFoundTitle")}</Text>
                        <Text style={styles.missingBody}>{t("competition.notFoundDescription")}</Text>
                        <PressableSurface
                            onPress={() => (state.status === "error" ? reload() : open(destinations.competitions))}
                            style={styles.missingButton}
                        >
                            <Text style={styles.missingButtonLabel}>
                                {state.status === "error" ? t("errors.retry") : t("common.competitions")}
                            </Text>
                        </PressableSurface>
                    </View>
                </ScrollView>
            </>
        )
    }

    return (
        <Loaded
            page={state.page}
            replicaIds={state.replicaIds}
            auid={state.auid}
            reload={reload}
            refreshing={refreshing}
            onRefresh={refresh}
            header={header}
        />
    )
}

function Loaded({
    page,
    replicaIds,
    auid,
    reload,
    refreshing,
    onRefresh,
    header,
}: {
    page: CompetitionPageData
    replicaIds: Record<string, string>
    auid: string | null
    reload: () => Promise<void>
    refreshing: boolean
    onRefresh: () => void
    header: (title: string) => React.ReactNode
}) {
    const { t } = useTranslation()
    const headerHeight = useHeaderHeight()
    const [busy, setBusy] = useState<null | "name" | "dates" | "action" | "commission">(null)
    const [titleShown, setTitleShown] = useState(false)
    const heroY = useRef(0)
    const nameBottom = useRef(0)

    const holders = useMemo(() => page.holders.map(String), [page.holders])
    const usernames = useDisplayNames(holders)
    const isHolder = isCompetitionHolder(page.holders, auid)

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        // Content starts under the header, so the name has gone once the
        // offset past the header's edge reaches its bottom.
        const scrolled = event.nativeEvent.contentOffset.y + headerHeight
        const shown = scrolled > heroY.current + nameBottom.current
        if (shown !== titleShown) setTitleShown(shown)
    }

    /**
     * Run a change, then reload. A failure is said in an alert, as the web
     * says it in a toast; success is felt rather than announced.
     */
    const run = async (kind: NonNullable<typeof busy>, change: () => Promise<void>): Promise<boolean> => {
        setBusy(kind)
        try {
            await change()
            await reload()
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            return true
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert(t("errors.serverTitle"), error instanceof Error ? error.message : String(error))
            return false
        } finally {
            setBusy(null)
        }
    }

    const rename = async (name: string) => {
        if (!name.trim()) {
            Alert.alert(t("competition.editCompetitionName"), t("competition.createErrorName"))
            return false
        }
        return run("name", () => renameCompetition(page.id, name.trim()))
    }

    /**
     * Starting and submitting cannot be taken back, and a phone is easier to
     * tap by accident than a desk, so each asks first — where the web does not.
     */
    const confirm = (title: string, message: string, action: string, onConfirm: () => void) =>
        Alert.alert(title, message, [
            { text: t("competition.cancel"), style: "cancel" },
            { text: action, onPress: onConfirm },
        ])

    const start = () =>
        confirm(t("competition.startTitle"), t("competition.startDescription"), t("competition.startButton"), () =>
            run("action", () => startCompetition(page.id)),
        )

    const submit = () =>
        confirm(
            t("competition.submitReviewTitle"),
            t("competition.submitReviewDescription"),
            t("competition.submitReviewButton"),
            () => run("action", () => submitCompetitionForReview(page.id, auid ?? "")),
        )

    return (
        <>
            {header(titleShown ? page.name : "")}
            <ScrollView
                style={styles.screen}
                contentContainerStyle={styles.content}
                contentInsetAdjustmentBehavior="automatic"
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                automaticallyAdjustKeyboardInsets
                onScroll={onScroll}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={palette.accent}
                        colors={[palette.accent]}
                    />
                }
            >
                <View onLayout={(event: LayoutChangeEvent) => (heroY.current = event.nativeEvent.layout.y)}>
                    <HeroCard
                        page={page}
                        usernames={usernames}
                        isHolder={isHolder}
                        busy={busy === "name"}
                        onRename={rename}
                        onNameLayout={(event) => {
                            // Relative to the card, padding included; the card's
                            // own offset is added on scroll.
                            const { y, height } = event.nativeEvent.layout
                            nameBottom.current = y + height
                        }}
                    />
                </View>
                <StatusSteps status={page.status} />
                <SeriesCard name={page.series.name} />
                <TimelineCard
                    page={page}
                    isHolder={isHolder}
                    busy={busy === "dates"}
                    onSaveDates={(start, end) => run("dates", () => updateCompetitionDates(page.id, start, end))}
                />
                <ActionsCard
                    page={page}
                    isHolder={isHolder}
                    busy={busy === "action"}
                    onStart={start}
                    onSubmitForReview={submit}
                />
                <SessionsCard
                    page={page}
                    replicaIds={replicaIds}
                    isHolder={isHolder}
                    busy={busy === "commission"}
                    onAddCommission={(name) => run("commission", () => addCommission(page, name))}
                />
            </ScrollView>
        </>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32, gap: 24 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.background },
    headerButton: Platform.select({
        android: { padding: 8, borderRadius: radius.pill },
        default: { padding: 4 },
    }),
    missing: { alignItems: "center", paddingVertical: 48, gap: 8 },
    missingTitle: { marginTop: 8, fontSize: 18, fontWeight: "700", color: palette.textStrong, textAlign: "center" },
    missingBody: { fontSize: 14, lineHeight: 20, color: palette.textMuted, textAlign: "center" },
    missingButton: {
        marginTop: 12,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: radius.pill,
        backgroundColor: palette.accent,
    },
    missingButtonLabel: { fontSize: 14, fontWeight: "600", color: palette.onAccent },
})
