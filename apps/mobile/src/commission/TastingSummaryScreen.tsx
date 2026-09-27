import { useMemo, useRef, useState } from "react"
import {
    ActivityIndicator,
    Alert,
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
import { Stack } from "expo-router"
import { useHeaderHeight } from "expo-router/react-navigation"
import * as Haptics from "expo-haptics"
import { formatPropertyScoreValue, hasEvaluationData } from "@winelore/core"
import {
    tastingSummaryProducerAuids,
    type ExpertBeverageSummaryEntry,
    type MyTastingSummaryData,
} from "@winelore/core/commission"
import { useTranslation } from "../i18n/LocaleProvider"
import { MemberEvaluation } from "../results/MemberEvaluation"
import { printResults, type ExportFormat } from "../results/exportResults"
import { cardShadow, continuous, MONOSPACE, palette, radius } from "../theme"
import { Icon } from "../ui/Icon"
import { useDisplayNames } from "../users/useDisplayNames"
import { buildTastingSummaryPrintPage, shareTastingSummary } from "./exportTastingSummary"
import { useTastingSummary } from "./useTastingSummary"

/**
 * The web's /commission/[id]/replica/[replicaId]/summary: a judge's own
 * scores from a finished session, one card per sample in tasting order,
 * each opening onto the whole assessment. The download and printing are in
 * the bar, as on the results screen; the file goes to the share sheet and
 * the page to the system print sheet.
 */
export function TastingSummaryScreen({ replicaId }: { replicaId: string }) {
    const { t, formatBeverageType } = useTranslation()
    const headerHeight = useHeaderHeight()
    const { data, reload } = useTastingSummary(replicaId)
    const entries = data?.entries ?? null
    const names = useDisplayNames(useMemo(() => tastingSummaryProducerAuids(entries), [entries]))
    const [exporting, setExporting] = useState<string | null>(null)
    const [refreshing, setRefreshing] = useState(false)
    const [titleShown, setTitleShown] = useState(false)
    const titleBottom = useRef(0)

    const producerName = (auids: string[]) =>
        auids.length === 0 ? t("commission.results.unknownProducer") : auids.map((id) => names[id] || id).join(", ")

    const exportAs = async (format: ExportFormat) => {
        if (!data) return
        setExporting(t("competition.preparingExport"))
        try {
            await shareTastingSummary(
                data,
                format,
                {
                    producerName,
                    generalCommentLabel: t("evaluation.generalCommentLabel"),
                    booleanLabels: { yesLabel: t("common.yes"), noLabel: t("common.no") },
                    formatBeverageType,
                },
                (done, total) =>
                    setExporting(total > 0 && done < total ? `${t("competition.preparingExport")} ${done}/${total}` : t("competition.preparingExport")),
            )
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert(t("commission.results.export"), error instanceof Error ? error.message : String(error))
        } finally {
            setExporting(null)
        }
    }

    const print = async () => {
        if (!data) return
        try {
            await printResults(buildTastingSummaryPrintPage(data, { t, producerName }))
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

    // The web offers both only once there is something to download.
    const hasEntries = !!entries && entries.length > 0
    const exportDisabled = !hasEntries || exporting !== null

    return (
        <>
            <Stack.Screen
                options={{
                    title: titleShown ? t("commission.myRankingTitle") : "",
                    headerLargeTitle: false,
                    unstable_headerRightItems: () =>
                        hasEntries
                            ? [
                                  {
                                      type: "menu",
                                      label: t("commission.results.export"),
                                      icon: { type: "sfSymbol", name: "square.and.arrow.up" },
                                      disabled: exportDisabled,
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
                                      onPress: print,
                                  },
                              ]
                            : [],
                    headerRight: () =>
                        hasEntries ? (
                            <View style={styles.androidActions}>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={t("commission.results.export")}
                                    disabled={exportDisabled}
                                    onPress={chooseExport}
                                    hitSlop={8}
                                    style={styles.androidAction}
                                >
                                    <Icon name="share" size={22} color={exportDisabled ? palette.textGhost : palette.accent} />
                                </Pressable>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={t("commission.results.print")}
                                    onPress={print}
                                    hitSlop={8}
                                    style={styles.androidAction}
                                >
                                    <Icon name="printer" size={22} color={palette.accent} />
                                </Pressable>
                            </View>
                        ) : null,
                }}
            />
            <ScrollView
                style={styles.screen}
                contentContainerStyle={styles.content}
                contentInsetAdjustmentBehavior="automatic"
                onScroll={onScroll}
                scrollEventThrottle={16}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} colors={[palette.accent]} />}
            >
                <View
                    style={styles.header}
                    onLayout={(event: LayoutChangeEvent) => {
                        const { y, height } = event.nativeEvent.layout
                        titleBottom.current = y + height
                    }}
                >
                    <View style={styles.glyph}>
                        <Icon name="beverage" size={40} color={palette.positive} />
                    </View>
                    <Text style={styles.title} accessibilityRole="header">
                        {t("commission.myRankingTitle")}
                    </Text>
                    <Text style={styles.description}>{t("commission.myRankingDesc")}</Text>
                </View>

                {exporting ? (
                    <View style={styles.working}>
                        <ActivityIndicator size="small" color={palette.accent} />
                        <Text style={styles.workingLabel}>{exporting}</Text>
                    </View>
                ) : null}

                {entries === null ? (
                    <View style={[styles.card, styles.state]}>
                        <ActivityIndicator color={palette.accent} />
                        <Text style={styles.stateLabel}>{t("common.loading")}</Text>
                    </View>
                ) : entries.length === 0 ? (
                    <View style={[styles.card, styles.state]}>
                        <Text style={styles.emptyLabel}>{t("commission.myRankingEmpty")}</Text>
                    </View>
                ) : (
                    entries.map((entry) => (
                        <SummaryCard key={`${entry.code}-${entry.order}`} entry={entry} data={data!} producerName={producerName} />
                    ))
                )}
            </ScrollView>
        </>
    )
}

/** One sample: the web's `BeverageSummaryCard`. */
function SummaryCard({
    entry,
    data,
    producerName,
}: {
    entry: ExpertBeverageSummaryEntry
    data: MyTastingSummaryData
    producerName: (auids: string[]) => string
}) {
    const { t } = useTranslation()
    const [expanded, setExpanded] = useState(false)
    const flags = { propertyCommentsEnabled: data.propertyCommentsEnabled, voiceCommentsEnabled: data.voiceCommentsEnabled }
    const hasDetails = hasEvaluationData(entry.evaluation, flags)
    const labels = { yesLabel: t("common.yes"), noLabel: t("common.no") }

    return (
        <View style={styles.card}>
            <View style={styles.cardHead}>
                <View style={styles.nameRow}>
                    <View style={styles.order}>
                        <Text style={styles.orderLabel}>{entry.order}</Text>
                    </View>
                    <Text style={styles.name} numberOfLines={1}>
                        {entry.beverageName}
                    </Text>
                </View>
                <View style={styles.indented}>
                    <Text style={styles.meta}>
                        <Text style={styles.metaLabel}>{t("commission.results.producer")}:</Text> {producerName(entry.producerAuids)}
                    </Text>
                    <Text style={styles.code} selectable>
                        {t("commission.results.candidateCode")}: {entry.code}
                    </Text>
                </View>
                {entry.totalScores.length > 0 || hasDetails ? (
                    <View style={[styles.indented, styles.totals]}>
                        {entry.totalScores.map((score) => (
                            <View key={score.code}>
                                <Text style={styles.totalName}>{score.name}</Text>
                                <Text style={styles.totalValue}>{formatPropertyScoreValue(score.value, data.propertyMap[score.code], labels)}</Text>
                            </View>
                        ))}
                        {hasDetails ? (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityState={{ expanded }}
                                onPress={() => {
                                    Haptics.selectionAsync()
                                    setExpanded((value) => !value)
                                }}
                                hitSlop={8}
                                style={styles.toggle}
                            >
                                <Icon name={expanded ? "chevronUp" : "chevronDown"} size={12} color={palette.accent} weight="semibold" />
                                <Text style={styles.toggleLabel}>
                                    {expanded ? t("commission.myRankingCollapseDetails") : t("commission.myRankingExpandDetails")}
                                </Text>
                            </Pressable>
                        ) : null}
                    </View>
                ) : null}
            </View>
            {hasDetails && expanded ? (
                <View style={styles.details}>
                    <MemberEvaluation evaluation={entry.evaluation} propertyMap={data.propertyMap} flags={flags} tone="slate" forceShowAll />
                </View>
            ) : null}
        </View>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32, gap: 16 },
    androidActions: { flexDirection: "row", gap: 4 },
    androidAction: { padding: 8 },
    header: { alignItems: "center", gap: 12, paddingVertical: 8, marginBottom: 16 },
    // w-20 h-20 rounded-full bg-emerald-100
    glyph: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", backgroundColor: "#d0fae5" },
    title: { fontSize: 30, lineHeight: 36, fontWeight: "800", color: palette.heading, textAlign: "center" },
    description: { maxWidth: 448, fontSize: 16, lineHeight: 24, color: palette.textMuted, textAlign: "center" },
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
    // bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden
    card: {
        backgroundColor: palette.surface,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        overflow: "hidden",
        ...cardShadow,
        ...continuous,
    },
    state: { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 64, paddingHorizontal: 24 },
    stateLabel: { fontSize: 14, color: palette.textMuted },
    emptyLabel: { fontSize: 16, lineHeight: 24, color: palette.textMuted, textAlign: "center" },
    // px-5 py-4 bg-slate-50/60
    cardHead: { paddingHorizontal: 20, paddingVertical: 16, gap: 12, backgroundColor: "rgba(248, 250, 252, 0.6)" },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: -8 },
    order: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: palette.accentBorder },
    orderLabel: { fontSize: 12, fontWeight: "700", color: "#432dd7" },
    name: { flex: 1, fontSize: 18, lineHeight: 28, fontWeight: "700", color: palette.heading },
    indented: { paddingLeft: 36, gap: 2 },
    meta: { fontSize: 12, lineHeight: 16, color: "#45556c" },
    metaLabel: { fontWeight: "500", color: palette.textMuted },
    code: { fontSize: 12, lineHeight: 16, fontFamily: MONOSPACE, color: palette.textFaint },
    totals: { gap: 8, alignItems: "flex-start" },
    totalName: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.textFaint },
    totalValue: { fontSize: 24, lineHeight: 32, fontWeight: "800", color: "#432dd7" },
    toggle: { flexDirection: "row", alignItems: "center", gap: 4 },
    toggleLabel: { fontSize: 12, fontWeight: "600", color: palette.accent },
    details: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: palette.borderSoft },
})
