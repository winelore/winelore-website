import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import * as Haptics from "expo-haptics"
import { formatPropertyScoreValue, formatSignedDiff, type CompetitionFeatureFlags } from "@winelore/core"
import {
    expertBreakdown,
    overviewRowDetails,
    type CommissionSummaryRow,
    type CompetitionAwardRow,
    type CompetitionCommentRow,
    type CompetitionExpertScoreRow,
    type CompetitionExportContext,
    type CompetitionOverviewRow,
    type ExpertBreakdownCard,
    type ResultsTab,
} from "@winelore/core/results"
import { useTranslation } from "../i18n/LocaleProvider"
import { useBackendText } from "../i18n/useBackendText"
import { MONOSPACE, cardShadow, continuous, palette, radius } from "../theme"
import { Icon, type IconName } from "../ui/Icon"
import { MemberEvaluation } from "./MemberEvaluation"
import { VoiceComment } from "./VoiceComment"

/**
 * The results page's pieces. The web lays its tabs out as wide tables; on a
 * phone each row becomes a card carrying the same columns, and an overview
 * card opens in place onto its judges' breakdown, as a table row does.
 */

// --- Figures ----------------------------------------------------------------

const TONES = {
    indigo: { background: "#eef2ff", border: "#e0e7ff", color: palette.accent },
    emerald: { background: "#ecfdf5", border: "#d0fae5", color: palette.positive },
    violet: { background: palette.violetSoft, border: "#ede9fe", color: palette.violet },
    amber: { background: "#fffbeb", border: "#fef3c6", color: palette.warning },
} as const

/** One of the four figures over the results: a tinted glyph tile, a kicker, a number. */
export function StatTile({
    icon,
    tone,
    label,
    value,
}: {
    icon: IconName
    tone: keyof typeof TONES
    label: string
    value: number | null
}) {
    const colors = TONES[tone]
    return (
        <View style={styles.stat}>
            <View style={[styles.statTile, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Icon name={icon} size={22} color={colors.color} />
            </View>
            <View style={styles.statText}>
                <Text style={styles.statLabel} numberOfLines={2}>
                    {label}
                </Text>
                <Text style={styles.statValue}>{value ?? "-"}</Text>
            </View>
        </View>
    )
}

// --- Tabs -------------------------------------------------------------------

/** The web's tab bar: pills, the current one indigo, each with its count. */
export function ResultsTabs({
    tabs,
    current,
    onChange,
}: {
    tabs: Array<{ id: ResultsTab; label: string; count: number }>
    current: ResultsTab
    onChange: (tab: ResultsTab) => void
}) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            accessibilityRole="tablist"
            contentContainerStyle={styles.tabs}
            style={styles.tabsScroller}
        >
            {tabs.map((tab) => {
                const active = tab.id === current
                return (
                    <Pressable
                        key={tab.id}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                        onPress={() => {
                            if (active) return
                            Haptics.selectionAsync()
                            onChange(tab.id)
                        }}
                        style={[styles.tab, active && styles.tabActive]}
                    >
                        <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                            {tab.label} ({tab.count})
                        </Text>
                    </Pressable>
                )
            })}
        </ScrollView>
    )
}

// --- Overview ---------------------------------------------------------------

/**
 * A candidate: its place, code and commission, the beverage, its type and
 * producer, each outcome the policy produced and any award. Tapping opens
 * the judges' breakdown beneath, as clicking the web's row does.
 */
export function OverviewCard({
    row,
    index,
    context,
    expanded,
    onToggle,
    personName,
    flags,
}: {
    row: CompetitionOverviewRow
    index: number
    context: CompetitionExportContext
    expanded: boolean
    onToggle: () => void
    personName: (auid: string) => string
    flags: CompetitionFeatureFlags
}) {
    const { t, formatBeverageType } = useTranslation()
    const details = overviewRowDetails(row)

    return (
        <View style={[styles.card, expanded && styles.cardOpen]}>
            <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => {
                    Haptics.selectionAsync()
                    onToggle()
                }}
                style={({ pressed }) => [styles.overviewHead, pressed && styles.pressed]}
            >
                <View style={styles.overviewTop}>
                    <Text style={styles.rank}>#{index + 1}</Text>
                    <Text style={styles.code}>{row.code}</Text>
                    <Text style={styles.commission} numberOfLines={1}>
                        {row.commissionName}
                    </Text>
                    <Icon
                        name={expanded ? "chevronDown" : "chevron"}
                        size={14}
                        color={expanded ? palette.accent : palette.textFaint}
                        weight="semibold"
                    />
                </View>
                <View>
                    <Text style={styles.beverage}>{row.beverage}</Text>
                    {details ? <Text style={styles.details}>{details}</Text> : null}
                </View>
                <View style={styles.facts}>
                    <Fact label={t("commission.results.typeColumn")} value={formatBeverageType(row.beverageType ?? "-")} />
                    <Fact label={t("commission.results.producer")} value={personName(row.producer)} />
                </View>
                {context.outcomePropertyCodes.length > 0 ? (
                    <View style={styles.outcomes}>
                        {context.outcomePropertyCodes.map((code) => (
                            <Outcome key={code} name={context.outcomePropertyNames[code] ?? code} value={row.outcomes[code] ?? "-"} />
                        ))}
                    </View>
                ) : null}
                {row.awards !== "-" ? (
                    <View style={styles.awardPill}>
                        <Icon name="award" size={12} color="#fe9a00" />
                        <Text style={styles.awardPillLabel}>{row.awards}</Text>
                    </View>
                ) : null}
            </Pressable>

            {expanded ? <Breakdown context={context} row={row} personName={personName} flags={flags} /> : null}
        </View>
    )
}

function Fact({ label, value }: { label: string; value: string }) {
    return (
        <Text style={styles.fact} numberOfLines={1}>
            <Text style={styles.factLabel}>{label} </Text>
            {value}
        </Text>
    )
}

function Outcome({ name, value }: { name: string; value: string }) {
    const label = useBackendText(name)
    return (
        <View style={styles.outcome}>
            <Text style={styles.outcomeName} numberOfLines={1}>
                {label}
            </Text>
            <Text style={styles.outcomeValue}>{value}</Text>
        </View>
    )
}

function Breakdown({
    context,
    row,
    personName,
    flags,
}: {
    context: CompetitionExportContext
    row: CompetitionOverviewRow
    personName: (auid: string) => string
    flags: CompetitionFeatureFlags
}) {
    const { t } = useTranslation()
    const cards = expertBreakdown(context, row)
    return (
        <View style={styles.breakdown}>
            <Text style={styles.breakdownTitle}>{t("commission.results.expertBreakdown")}</Text>
            {cards.length > 0 ? (
                cards.map((card) => (
                    <ExpertCard
                        key={card.scoreRow.evaluationId}
                        card={card}
                        propertyMap={context.propertyMap}
                        personName={personName}
                        flags={flags}
                    />
                ))
            ) : (
                <Text style={styles.noEvaluations}>{t("commission.results.noEvaluationsYet")}</Text>
            )}
        </View>
    )
}

/** One judge under a candidate: replica, type, an out-of-delta flag, their result and evaluation. */
function ExpertCard({
    card,
    propertyMap,
    personName,
    flags,
}: {
    card: ExpertBreakdownCard
    propertyMap: CompetitionExportContext["propertyMap"]
    personName: (auid: string) => string
    flags: CompetitionFeatureFlags
}) {
    const { t, formatReplicaType } = useTranslation()
    const { scoreRow, evaluation, outlier, resultScores } = card
    const flagged = outlier?.isOutlier === true
    const labels = { yesLabel: t("common.yes"), noLabel: t("common.no") }
    const trainee = scoreRow.replicaType === "TRAINEE"

    // The web explains the flag in a hover tooltip; a tap shows it here.
    const explain = () =>
        Alert.alert(
            t("commission.results.outOfDelta"),
            t("commission.results.outOfDeltaTooltip", {
                score: outlier?.totalScore ?? "-",
                diff: formatSignedDiff(outlier?.signedDiff),
                avg: outlier?.preAvg != null ? outlier.preAvg.toFixed(1) : "-",
                threshold: outlier?.threshold ?? "-",
            }),
        )

    return (
        <View style={[styles.expert, flagged && styles.expertFlagged]}>
            <View style={styles.expertHead}>
                <View style={styles.expertWho}>
                    <View style={styles.expertBadges}>
                        <Text style={styles.replicaName}>{scoreRow.replicaName}</Text>
                        <View style={[styles.replicaType, trainee && styles.replicaTypeTrainee]}>
                            <Text style={[styles.replicaTypeLabel, trainee && styles.replicaTypeLabelTrainee]}>
                                {formatReplicaType(scoreRow.replicaType)}
                            </Text>
                        </View>
                        {flagged ? (
                            <Pressable accessibilityRole="button" onPress={explain} hitSlop={6} style={styles.outlier}>
                                <Icon name="warning" size={11} color={palette.warning} weight="semibold" />
                                <Text style={styles.outlierLabel}>
                                    {t("commission.results.outOfDelta")}
                                    {outlier?.signedDiff != null ? ` (${formatSignedDiff(outlier.signedDiff)})` : ""}
                                </Text>
                            </Pressable>
                        ) : null}
                    </View>
                    <Text style={styles.evaluator}>{personName(scoreRow.evaluator)}</Text>
                </View>
                <View style={styles.expertScores}>
                    {resultScores.length === 1 ? (
                        <Text style={[styles.bigScore, flagged && styles.scoreFlagged]}>
                            {formatPropertyScoreValue(resultScores[0].value, propertyMap[resultScores[0].code], labels)}
                        </Text>
                    ) : resultScores.length > 1 ? (
                        resultScores.map((score) => (
                            <Text key={score.code} style={[styles.smallScore, flagged && styles.scoreFlagged]}>
                                {propertyMap[score.code]?.name ?? score.code}:{" "}
                                {formatPropertyScoreValue(score.value, propertyMap[score.code], labels)}
                            </Text>
                        ))
                    ) : (
                        <Text style={[styles.bigScore, styles.noScore]}>-</Text>
                    )}
                </View>
            </View>
            <MemberEvaluation evaluation={evaluation} propertyMap={propertyMap} flags={flags} />
        </View>
    )
}

// --- The other tabs ---------------------------------------------------------

/** A line naming the commission and the candidate's code, over each card. */
function Heading({ commission, code }: { commission: string; code?: string }) {
    return (
        <View style={styles.heading}>
            {code ? <Text style={styles.code}>{code}</Text> : null}
            <Text style={styles.commission} numberOfLines={1}>
                {commission}
            </Text>
        </View>
    )
}

export function CommissionCard({ row }: { row: CommissionSummaryRow }) {
    const { t, formatStatus } = useTranslation()
    return (
        <View style={[styles.card, styles.cardBody]}>
            <View style={styles.commissionHead}>
                <Text style={styles.beverage}>{row.commissionName}</Text>
                <View style={styles.statusPill}>
                    <Text style={styles.statusPillLabel}>{formatStatus(row.status)}</Text>
                </View>
            </View>
            <View style={styles.counts}>
                <Count label={t("commission.results.candidatesCountColumn")} value={row.candidateCount} />
                <Count label={t("commission.results.replicasCountColumn")} value={row.replicaCount} />
                <Count label={t("commission.results.awardsGrantedColumn")} value={row.awardsCount} tone="amber" />
            </View>
        </View>
    )
}

function Count({ label, value, tone }: { label: string; value: number; tone?: "amber" }) {
    return (
        <View style={styles.count}>
            <Text style={[styles.countValue, tone === "amber" && styles.countValueAmber]}>{value}</Text>
            <Text style={styles.countLabel}>{label}</Text>
        </View>
    )
}

export function ExpertScoreCard({ row, personName }: { row: CompetitionExpertScoreRow; personName: (auid: string) => string }) {
    const { t } = useTranslation()
    return (
        <View style={[styles.card, styles.cardBody]}>
            <Heading commission={row.commissionName} code={row.code} />
            <Text style={styles.beverage}>{row.beverage}</Text>
            <View style={styles.facts}>
                <Fact label={t("commission.results.replicaColumn")} value={row.replicaName} />
                <Fact label={t("commission.results.evaluatorColumn")} value={personName(row.evaluator)} />
            </View>
            <View style={styles.scoreCodes}>
                {Object.entries(row.scores).map(([code, value]) => (
                    <Text key={code} style={styles.scoreCode}>
                        {code}: {value}
                    </Text>
                ))}
            </View>
        </View>
    )
}

export function CommentCard({ row, personName }: { row: CompetitionCommentRow; personName: (auid: string) => string }) {
    const { t } = useTranslation()
    return (
        <View style={[styles.card, styles.cardBody]}>
            <Heading commission={row.commissionName} code={row.code} />
            <Text style={styles.beverage}>{row.beverage}</Text>
            <View style={styles.facts}>
                <Fact label={t("commission.results.evaluatorColumn")} value={personName(row.evaluator)} />
                <Fact label={t("commission.results.propertyColumn")} value={row.property} />
            </View>
            {row.commentText ? <Text style={styles.commentText}>{row.commentText}</Text> : null}
            {row.voiceUrl ? <VoiceComment url={row.voiceUrl} /> : null}
            {!row.commentText && !row.voiceUrl ? <Text style={styles.commentText}>-</Text> : null}
        </View>
    )
}

export function AwardCard({ row, personName }: { row: CompetitionAwardRow; personName: (auid: string) => string }) {
    const { t } = useTranslation()
    return (
        <View style={[styles.card, styles.cardBody]}>
            <Heading commission={row.commissionName} code={row.code} />
            <Text style={styles.beverage}>{row.beverage}</Text>
            <Fact label={t("commission.results.producer")} value={personName(row.producer)} />
            <View style={styles.awardName}>
                <Icon name="award" size={16} color="#fe9a00" />
                <Text style={styles.awardNameLabel}>{row.awardName}</Text>
            </View>
        </View>
    )
}

/** A tab with nothing in it: the web's centred grey line. */
export function EmptyRows({ text }: { text: string }) {
    return (
        <View style={[styles.card, styles.empty]}>
            <Text style={styles.emptyText}>{text}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    // bg-white border border-slate-100 rounded-3xl p-5 shadow-sm
    stat: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.surface,
        ...cardShadow,
        ...continuous,
    },
    statTile: {
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.tile,
        borderWidth: 1,
        ...continuous,
    },
    statText: { flex: 1, minWidth: 0 },
    statLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: palette.textFaint },
    statValue: { fontSize: 22, fontWeight: "800", color: palette.heading },
    tabsScroller: { marginHorizontal: -16 },
    tabs: { gap: 8, paddingHorizontal: 16 },
    tab: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.md, backgroundColor: "#f1f5f9", ...continuous },
    tabActive: {
        backgroundColor: palette.accent,
        boxShadow: "0 4px 6px -1px rgba(99, 102, 241, 0.2), 0 2px 4px -2px rgba(99, 102, 241, 0.2)",
    },
    tabLabel: { fontSize: 12, fontWeight: "700", color: "#45556c" },
    tabLabelActive: { color: palette.onAccent },
    card: {
        borderRadius: 20,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.surface,
        overflow: "hidden",
        ...cardShadow,
        ...continuous,
    },
    cardOpen: { borderColor: palette.accentBorder },
    cardBody: { padding: 16, gap: 8 },
    pressed: { backgroundColor: "rgba(248, 250, 252, 0.6)" },
    overviewHead: { padding: 16, gap: 10 },
    overviewTop: { flexDirection: "row", alignItems: "center", gap: 8 },
    rank: { fontSize: 12, fontWeight: "800", color: palette.textFaint },
    code: { fontSize: 13, fontWeight: "800", color: palette.text },
    commission: { flex: 1, fontSize: 12, fontWeight: "700", color: palette.accent },
    beverage: { fontSize: 15, lineHeight: 20, fontWeight: "700", color: palette.heading },
    details: { marginTop: 2, fontSize: 11, color: palette.textFaint },
    facts: { flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 4 },
    fact: { fontSize: 12, fontWeight: "600", color: "#45556c" },
    factLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, color: palette.textFaint },
    outcomes: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    outcome: {
        minWidth: 72,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.background,
        ...continuous,
    },
    outcomeName: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.textMuted },
    outcomeValue: { marginTop: 2, fontSize: 16, fontWeight: "800", color: palette.text },
    awardPill: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: "#fee685",
        backgroundColor: "#fffbeb",
    },
    awardPillLabel: { fontSize: 11, fontWeight: "700", color: "#bb4d00" },
    breakdown: {
        gap: 12,
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: palette.border,
        backgroundColor: "rgba(248, 250, 252, 0.8)",
    },
    breakdownTitle: { fontSize: 14, fontWeight: "700", color: palette.textStrong },
    noEvaluations: { fontSize: 13, fontStyle: "italic", color: palette.textMuted },
    // p-4 rounded-xl bg-white border border-slate-200; out of delta: amber, 2px
    expert: {
        padding: 14,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
        ...cardShadow,
        ...continuous,
    },
    expertFlagged: { borderWidth: 2, borderColor: "#ffd230", backgroundColor: "rgba(255, 251, 235, 0.9)" },
    expertHead: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 8,
        paddingBottom: 12,
        marginBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: palette.borderSoft,
    },
    expertWho: { flex: 1, gap: 4 },
    expertBadges: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
    replicaName: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", color: palette.textMuted },
    replicaType: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: "#e0e7ff" },
    replicaTypeTrainee: { backgroundColor: "#fef3c6" },
    replicaTypeLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase", color: "#432dd7" },
    replicaTypeLabelTrainee: { color: "#bb4d00" },
    outlier: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: "#ffd230",
        backgroundColor: "#fef3c6",
    },
    outlierLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase", color: "#973c00" },
    evaluator: { fontSize: 12, fontWeight: "600", color: "#45556c" },
    expertScores: { alignItems: "flex-end", gap: 4 },
    bigScore: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        overflow: "hidden",
        fontSize: 20,
        fontWeight: "900",
        color: palette.accent,
        backgroundColor: palette.accentSoft,
    },
    smallScore: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        overflow: "hidden",
        fontSize: 12,
        fontWeight: "800",
        color: palette.accent,
        backgroundColor: palette.accentSoft,
    },
    scoreFlagged: { color: "#973c00", backgroundColor: "rgba(254, 243, 198, 0.9)" },
    noScore: { color: palette.textFaint, backgroundColor: palette.background },
    heading: { flexDirection: "row", alignItems: "center", gap: 8 },
    commissionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    statusPill: {
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: "#f1f5f9",
    },
    statusPillLabel: { fontSize: 10, fontWeight: "700", color: "#45556c" },
    counts: { flexDirection: "row", gap: 8 },
    count: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 8,
        borderRadius: radius.md,
        backgroundColor: palette.background,
        ...continuous,
    },
    countValue: { fontSize: 18, fontWeight: "800", color: palette.text },
    countValueAmber: { color: palette.warning },
    countLabel: { marginTop: 2, fontSize: 9, fontWeight: "700", textAlign: "center", textTransform: "uppercase", color: palette.textFaint },
    scoreCodes: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
    scoreCode: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: "hidden",
        fontFamily: MONOSPACE,
        fontSize: 10,
        color: palette.textStrong,
        backgroundColor: "#f1f5f9",
    },
    commentText: { fontSize: 13, lineHeight: 19, color: palette.heading },
    awardName: { flexDirection: "row", alignItems: "center", gap: 6 },
    awardNameLabel: { fontSize: 14, fontWeight: "700", color: palette.warning },
    empty: { paddingVertical: 32, paddingHorizontal: 16, alignItems: "center" },
    emptyText: { fontSize: 12, fontWeight: "500", color: palette.textFaint, textAlign: "center" },
})
