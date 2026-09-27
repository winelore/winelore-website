import { useMemo, useRef, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    Pressable,
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
import type { CompetitionPageData } from "@winelore/core/competition"
import {
    ALL_COMMISSIONS,
    RESULTS_TABS,
    overviewRowKey,
    resultPersonAuids,
    resultPersonName,
    resultsTabCounts,
    scopeResultsContext,
    searchOverviewRows,
    type CommissionSummaryRow,
    type CompetitionAwardRow,
    type CompetitionCommentRow,
    type CompetitionExpertScoreRow,
    type CompetitionOverviewRow,
    type ResultsTab,
} from "@winelore/core/results"
import { useTranslation } from "../i18n/LocaleProvider"
import { destinations, useOpenDestination } from "../navigation/destinations"
import { continuous, palette, radius } from "../theme"
import { Icon } from "../ui/Icon"
import { MenuPicker } from "../ui/MenuPicker"
import { PressableSurface } from "../ui/Pressable"
import { panelSurface } from "../ui/Surface"
import { useDisplayNames } from "../users/useDisplayNames"
import { printResults, shareResults, type ExportFormat } from "./exportResults"
import { buildPrintPage } from "./printPage"
import {
    AwardCard,
    CommentCard,
    CommissionCard,
    EmptyRows,
    ExpertScoreCard,
    OverviewCard,
    ResultsTabs,
    StatTile,
} from "./ResultCards"
import { useResultsData, useResultsScope } from "./useCompetitionResults"

/**
 * The web's /competition/[id]/results: a competition's results across the
 * commissions this user may see, or one commission's when asked for — the
 * web sends a commission's own results page here, narrowed to it.
 *
 * A null `competitionId` — a commission whose competition was not found —
 * shows the web's load error.
 */
export function ResultsScreen({
    competitionId,
    commissionId,
}: {
    competitionId: string | null
    commissionId: string | null
}) {
    const { t } = useTranslation()
    const router = useRouter()
    const open = useOpenDestination()
    const { state } = useResultsScope(competitionId, commissionId)

    if (state.status === "loading") {
        return (
            <>
                <Stack.Screen options={{ title: "", headerLargeTitle: false }} />
                <View style={styles.centered}>
                    <ActivityIndicator color={palette.accent} />
                </View>
            </>
        )
    }

    if (state.status !== "ready") {
        const forbidden = state.status === "forbidden"
        // The web links back to the competition; here that is usually where we came from.
        const back = () => {
            if (router.canGoBack()) router.back()
            else if (competitionId) open(destinations.competition(competitionId))
        }
        return (
            <>
                <Stack.Screen options={{ title: "", headerLargeTitle: false }} />
                <ScrollView style={styles.screen} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
                    <View style={[panelSurface, styles.status]}>
                        <View style={[styles.statusTile, !forbidden && styles.statusTileError]}>
                            <Icon name="alert" size={40} color={forbidden ? palette.textFaint : palette.danger} />
                        </View>
                        <Text style={styles.statusTitle}>
                            {forbidden ? t("commission.results.accessDenied") : t("commission.results.loadError")}
                        </Text>
                        <Text style={styles.statusBody}>
                            {forbidden ? t("commission.results.accessDeniedDesc") : t("commission.results.loadErrorDesc")}
                        </Text>
                        <PressableSurface onPress={back} style={styles.statusButton}>
                            <Text style={styles.statusButtonLabel}>{t("commission.backToCompetition")}</Text>
                        </PressableSurface>
                    </View>
                </ScrollView>
            </>
        )
    }

    return <Results competition={state.competition} initialCommissionId={state.commissionId} auid={state.auid} />
}

type Item =
    | { tab: "overview"; key: string; row: CompetitionOverviewRow; index: number }
    | { tab: "commissions"; key: string; row: CommissionSummaryRow }
    | { tab: "expertScores"; key: string; row: CompetitionExpertScoreRow }
    | { tab: "comments"; key: string; row: CompetitionCommentRow }
    | { tab: "awards"; key: string; row: CompetitionAwardRow }

function Results({
    competition,
    initialCommissionId,
    auid,
}: {
    competition: CompetitionPageData
    initialCommissionId: string | null
    auid: string | null
}) {
    const { t, locale, formatStatus, formatReplicaType } = useTranslation()
    const headerHeight = useHeaderHeight()
    const { context: allRows, loading, lastRefreshedAt, reload } = useResultsData(competition, auid)

    const [commissionFilter, setCommissionFilter] = useState(initialCommissionId ?? ALL_COMMISSIONS)
    const [search, setSearch] = useState("")
    const [tab, setTab] = useState<ResultsTab>("overview")
    const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
    const [exporting, setExporting] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [titleShown, setTitleShown] = useState(false)
    const titleBottom = useRef(0)

    const context = useMemo(() => scopeResultsContext(allRows, commissionFilter), [allRows, commissionFilter])
    const names = useDisplayNames(useMemo(() => resultPersonAuids(context), [context]))
    const personName = (id: string) => resultPersonName(id, names, t("commission.results.unknownProducer"))
    const overviewRows = useMemo(
        () => (context ? searchOverviewRows(context.overviewRows, search, personName) : []),
        // personName reads `names`, which is what changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [context, search, names],
    )
    const counts = resultsTabCounts(context, overviewRows.length)

    const selected = competition.commissions.find((commission) => commission.id === commissionFilter) ?? null
    const scopeName = selected?.name || competition.name
    const complete = (selected?.status || competition.status) === "COMPLETED"
    const title = t("commission.results.pageTitle", { name: scopeName })
    const ready = context !== null && !loading

    const flagsFor = (id: string) => {
        const commission = competition.commissions.find((candidate) => candidate.id === id)
        return {
            propertyCommentsEnabled: commission?.propertyCommentsEnabled ?? false,
            voiceCommentsEnabled: commission?.voiceCommentsEnabled ?? false,
        }
    }

    const toggle = (key: string) =>
        setExpanded((previous) => {
            const next = new Set(previous)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })

    const exportAs = async (format: ExportFormat) => {
        if (!context) return
        setExporting(true)
        try {
            await shareResults(context, scopeName, format)
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert(t("commission.results.export"), error instanceof Error ? error.message : String(error))
        } finally {
            setExporting(false)
        }
    }

    const print = async () => {
        if (!context) return
        try {
            await printResults(
                buildPrintPage({ title, context, overviewRows, tab, expanded, personName, formatStatus, formatReplicaType, t }),
            )
        } catch (error) {
            Alert.alert(t("commission.results.print"), error instanceof Error ? error.message : String(error))
        }
    }

    const chooseExport = () =>
        Alert.alert(t("commission.results.export"), undefined, [
            { text: t("commission.results.exportXlsx"), onPress: () => exportAs("xlsx") },
            { text: t("commission.results.exportCsv"), onPress: () => exportAs("csv") },
            { text: t("competition.cancel"), style: "cancel" },
        ])

    const onRefresh = async () => {
        setRefreshing(true)
        await reload()
        setRefreshing(false)
    }

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const shown = event.nativeEvent.contentOffset.y + headerHeight > titleBottom.current
        if (shown !== titleShown) setTitleShown(shown)
    }

    const items: Item[] = !ready
        ? []
        : tab === "overview"
          ? overviewRows.map((row, index) => ({ tab, key: overviewRowKey(row, index), row, index }))
          : tab === "commissions"
            ? context.commissionSummaryRows.map((row) => ({ tab, key: row.commissionId, row }))
            : tab === "expertScores"
              ? context.expertScoreRows.map((row, index) => ({ tab, key: `score-${index}`, row }))
              : tab === "comments"
                ? context.commentRows.map((row, index) => ({ tab, key: `comment-${index}`, row }))
                : context.awardRows.map((row, index) => ({ tab, key: `award-${index}`, row }))

    const emptyText = {
        overview: t("commission.results.noMatchingCandidates"),
        commissions: t("commission.results.noResultsData"),
        expertScores: t("commission.results.noExpertScores"),
        comments: t("commission.results.noComments"),
        awards: t("commission.results.noAwardsRegistered"),
    }[tab]

    const tabLabels: Record<ResultsTab, string> = {
        overview: t("commission.results.finalOverview"),
        commissions: t("competition.commissionsBreakdown"),
        expertScores: t("commission.results.expertScoresTab"),
        comments: t("commission.results.commentsTab"),
        awards: t("commission.results.awards"),
    }

    const actionsDisabled = !context || loading || exporting

    return (
        <>
            <Stack.Screen
                options={{
                    title: titleShown ? title : "",
                    headerLargeTitle: false,
                    unstable_headerRightItems: () => [
                        {
                            type: "menu",
                            label: t("commission.results.export"),
                            icon: { type: "sfSymbol", name: "square.and.arrow.up" },
                            disabled: actionsDisabled,
                            menu: {
                                items: [
                                    {
                                        type: "action",
                                        label: t("commission.results.exportXlsx"),
                                        icon: { type: "sfSymbol", name: "tablecells" },
                                        onPress: () => exportAs("xlsx"),
                                    },
                                    {
                                        type: "action",
                                        label: t("commission.results.exportCsv"),
                                        icon: { type: "sfSymbol", name: "doc.text" },
                                        onPress: () => exportAs("csv"),
                                    },
                                ],
                            },
                        },
                        {
                            type: "button",
                            label: t("commission.results.print"),
                            icon: { type: "sfSymbol", name: "printer" },
                            disabled: !context || loading,
                            onPress: print,
                        },
                    ],
                    headerRight: () => (
                        <View style={styles.androidActions}>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t("commission.results.export")}
                                disabled={actionsDisabled}
                                onPress={chooseExport}
                                hitSlop={8}
                                style={styles.androidAction}
                            >
                                <Icon name="share" size={22} color={actionsDisabled ? palette.textGhost : palette.accent} />
                            </Pressable>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t("commission.results.print")}
                                disabled={!context || loading}
                                onPress={print}
                                hitSlop={8}
                                style={styles.androidAction}
                            >
                                <Icon name="printer" size={22} color={!context || loading ? palette.textGhost : palette.accent} />
                            </Pressable>
                        </View>
                    ),
                    headerSearchBarOptions: {
                        placeholder: t("commission.results.searchPlaceholder"),
                        hideWhenScrolling: false,
                        autoCapitalize: "none",
                        onChangeText: (event) => {
                            const text = event.nativeEvent.text
                            setSearch(text)
                            // The search narrows the overview only, so it shows it.
                            if (text && tab !== "overview") setTab("overview")
                        },
                        onCancelButtonPress: () => setSearch(""),
                    },
                }}
            />
            <FlatList
                style={styles.screen}
                contentContainerStyle={styles.content}
                contentInsetAdjustmentBehavior="automatic"
                keyboardDismissMode="on-drag"
                onScroll={onScroll}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} colors={[palette.accent]} />
                }
                data={items}
                keyExtractor={(item) => item.key}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListHeaderComponent={
                    <View style={styles.header}>
                        <View
                            style={styles.titleRow}
                            onLayout={(event: LayoutChangeEvent) => {
                                const { y, height } = event.nativeEvent.layout
                                titleBottom.current = y + height
                            }}
                        >
                            <Text style={styles.title} accessibilityRole="header">
                                {title}
                            </Text>
                            <View style={[styles.statePill, complete ? styles.statePillDone : styles.statePillLive]}>
                                <Text style={[styles.statePillLabel, complete ? styles.statePillLabelDone : styles.statePillLabelLive]}>
                                    {complete ? t("commission.results.statusCompleted") : t("commission.results.statusInProgress")}
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.banner, complete ? styles.bannerDone : styles.bannerLive]}>
                            {complete ? (
                                <Icon name="check" size={20} color={palette.positive} />
                            ) : (
                                <ActivityIndicator size="small" color={palette.accent} />
                            )}
                            <View style={styles.bannerText}>
                                <Text style={[styles.bannerTitle, complete ? styles.bannerTitleDone : styles.bannerTitleLive]}>
                                    {t("competition.totalCandidates")}: {context?.overviewRows.length ?? "–"} ·{" "}
                                    {t("competition.totalEvaluations")}: {context?.expertScoreRows.length ?? "–"}
                                </Text>
                                <Text style={[styles.bannerNote, complete ? styles.bannerNoteDone : styles.bannerNoteLive]}>
                                    {complete ? t("commission.results.progressFinal") : t("commission.results.progressNote")}
                                </Text>
                            </View>
                        </View>

                        {lastRefreshedAt ? (
                            <Text style={styles.updated}>
                                {t("commission.results.autoRefresh")} ·{" "}
                                {t("commission.results.lastUpdated", {
                                    time: lastRefreshedAt.toLocaleTimeString(locale, {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                    }),
                                })}
                            </Text>
                        ) : null}

                        {loading || exporting ? (
                            <View style={styles.working}>
                                <ActivityIndicator size="small" color={palette.accent} />
                                <Text style={styles.workingLabel}>{t("competition.preparingExport")}</Text>
                            </View>
                        ) : null}

                        <View style={styles.stats}>
                            <View style={styles.statsRow}>
                                <StatTile
                                    icon="beverage"
                                    tone="indigo"
                                    label={t("competition.totalCommissions")}
                                    value={context ? context.commissionSummaryRows.length : null}
                                />
                                <StatTile
                                    icon="layers"
                                    tone="emerald"
                                    label={t("competition.totalCandidates")}
                                    value={context ? context.overviewRows.length : null}
                                />
                            </View>
                            <View style={styles.statsRow}>
                                <StatTile
                                    icon="people"
                                    tone="violet"
                                    label={t("competition.totalEvaluations")}
                                    value={context ? context.expertScoreRows.length : null}
                                />
                                <StatTile
                                    icon="award"
                                    tone="amber"
                                    label={t("competition.totalAwards")}
                                    value={context ? context.awardRows.length : null}
                                />
                            </View>
                        </View>

                        <ResultsTabs
                            tabs={RESULTS_TABS.map((id) => ({ id, label: tabLabels[id], count: counts[id] }))}
                            current={tab}
                            onChange={setTab}
                        />

                        <View style={styles.filter}>
                            <Icon name="filter" size={14} color={palette.textFaint} />
                            <MenuPicker
                                accessibilityLabel={t("commission.results.commissionColumn")}
                                options={[
                                    { value: ALL_COMMISSIONS, label: t("competition.exportAllCommissions") },
                                    ...competition.commissions.map((commission) => ({ value: commission.id, label: commission.name })),
                                ]}
                                value={commissionFilter}
                                onChange={(value) => {
                                    Haptics.selectionAsync()
                                    setCommissionFilter(value)
                                }}
                            />
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    loading ? (
                        <View style={styles.loading}>
                            <ActivityIndicator color={palette.accent} />
                            <Text style={styles.loadingLabel}>{t("competition.preparingExport")}</Text>
                        </View>
                    ) : (
                        <EmptyRows text={context ? emptyText : t("commission.results.noResultsData")} />
                    )
                }
                renderItem={({ item }) => {
                    switch (item.tab) {
                        case "overview":
                            return (
                                <OverviewCard
                                    row={item.row}
                                    index={item.index}
                                    context={context!}
                                    expanded={expanded.has(item.key)}
                                    onToggle={() => toggle(item.key)}
                                    personName={personName}
                                    flags={flagsFor(item.row.commissionId)}
                                />
                            )
                        case "commissions":
                            return <CommissionCard row={item.row} />
                        case "expertScores":
                            return <ExpertScoreCard row={item.row} personName={personName} />
                        case "comments":
                            return <CommentCard row={item.row} personName={personName} />
                        case "awards":
                            return <AwardCard row={item.row} personName={personName} />
                    }
                }}
            />
        </>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.background },
    androidActions: { flexDirection: "row", gap: 4 },
    androidAction: { padding: 8 },
    header: { gap: 16, marginBottom: 16 },
    titleRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 },
    title: { flexShrink: 1, fontSize: 24, lineHeight: 30, fontWeight: "800", letterSpacing: -0.4, color: palette.heading },
    statePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
    statePillDone: { backgroundColor: "#d0fae5" },
    statePillLive: { backgroundColor: "#fef3c6" },
    statePillLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
    statePillLabelDone: { color: "#007a55" },
    statePillLabelLive: { color: "#bb4d00" },
    banner: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderRadius: radius.tile,
        borderWidth: 1,
        ...continuous,
    },
    bannerDone: { backgroundColor: "#ecfdf5", borderColor: "#a4f4cf" },
    bannerLive: { backgroundColor: "#eef2ff", borderColor: "#c6d2ff" },
    bannerText: { flex: 1, gap: 2 },
    bannerTitle: { fontSize: 14, fontWeight: "700" },
    bannerTitleDone: { color: "#006045" },
    bannerTitleLive: { color: "#312c85" },
    bannerNote: { fontSize: 12, lineHeight: 16 },
    bannerNoteDone: { color: palette.positive },
    bannerNoteLive: { color: palette.accent },
    updated: { marginTop: -6, fontSize: 12, color: palette.textFaint },
    working: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: "rgba(238, 242, 255, 0.6)",
        ...continuous,
    },
    workingLabel: { fontSize: 12, fontWeight: "600", color: "#432dd7" },
    stats: { gap: 12 },
    statsRow: { flexDirection: "row", gap: 12 },
    filter: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        maxWidth: "100%",
        gap: 6,
        paddingLeft: 12,
        paddingRight: Platform.OS === "ios" ? 4 : 12,
        paddingVertical: Platform.OS === "ios" ? 0 : 6,
        minHeight: 36,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.background,
        ...continuous,
    },
    separator: { height: 12 },
    loading: { alignItems: "center", gap: 12, paddingVertical: 64 },
    loadingLabel: { fontSize: 12, fontWeight: "600", color: palette.textFaint },
    status: { alignItems: "center", paddingVertical: 48, gap: 8 },
    statusTile: {
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
    statusTileError: { borderColor: palette.dangerBorder, backgroundColor: palette.dangerSoft },
    statusTitle: { fontSize: 22, fontWeight: "800", color: palette.heading, textAlign: "center" },
    statusBody: { fontSize: 14, lineHeight: 20, color: palette.textMuted, textAlign: "center" },
    statusButton: {
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: radius.md,
        backgroundColor: palette.accent,
    },
    statusButtonLabel: { fontSize: 14, fontWeight: "700", color: palette.onAccent },
})
