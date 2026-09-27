import { useState } from "react"
import { Image, StyleSheet, Text, View } from "react-native"
import { groupAwardsByCompetition, type BeverageAward } from "@winelore/core/beverage"
import { useTranslation } from "../i18n/LocaleProvider"
import { continuous, palette, radius } from "../theme"
import { Icon } from "../ui/Icon"
import { EmptyCard, SectionTitle } from "./parts"

/** "Awards": the beverage's awards, under the competition that gave each. */
export function AwardsTab({ awards }: { awards: BeverageAward[] }) {
    const { t, formatStatus } = useTranslation()
    const groups = groupAwardsByCompetition(awards)

    return (
        <View style={styles.tab}>
            <SectionTitle title={t("beverage.competitionResults")} subtitle={t("beverage.awardsSubtitle")} />
            {awards.length > 0 ? (
                groups.map((group, index) => (
                    <View key={group.competition?.id ?? `unknown-${index}`} style={styles.group}>
                        {group.competition ? (
                            <View style={styles.groupHead}>
                                <View style={styles.groupTitle}>
                                    <View style={styles.trophy}>
                                        <Icon name="competition" size={20} color={palette.accent} />
                                    </View>
                                    <View style={styles.groupText}>
                                        <Text style={styles.series}>
                                            {group.competition.series?.name || t("commission.competition")}
                                        </Text>
                                        <Text style={styles.competition}>{group.competition.name}</Text>
                                    </View>
                                </View>
                                <View style={styles.statusChip}>
                                    <Text style={styles.statusLabel}>{formatStatus(group.competition.status)}</Text>
                                </View>
                            </View>
                        ) : null}
                        <View style={styles.awards}>
                            {group.awards.map((award) => (
                                <AwardCard key={award.id} award={award} />
                            ))}
                        </View>
                    </View>
                ))
            ) : (
                <EmptyCard icon="competition" title={t("beverage.noAwardsTitle")} description={t("beverage.noAwardsDesc")} />
            )}
        </View>
    )
}

function AwardCard({ award }: { award: BeverageAward }) {
    const { t, formatDateTime } = useTranslation()
    // A badge the platform cannot draw (an SVG, a dead link) falls back to the glyph.
    const [badgeFailed, setBadgeFailed] = useState(false)
    const badge = award.award.badgeUrl && !badgeFailed ? award.award.badgeUrl : null

    return (
        <View style={styles.card}>
            <View style={styles.cardBar} />
            <View style={badge ? styles.badgeTile : styles.glyphTile}>
                {badge ? (
                    <Image
                        source={{ uri: badge }}
                        style={styles.badgeImage}
                        resizeMode="contain"
                        onError={() => setBadgeFailed(true)}
                        accessibilityLabel={award.award.name}
                    />
                ) : (
                    <Icon name="award" size={28} color={palette.onAccent} />
                )}
            </View>
            <View style={styles.cardText}>
                <Text style={styles.awardName}>{award.award.name}</Text>
                <View style={styles.code}>
                    <Text style={styles.codeLabel}>{award.award.code}</Text>
                </View>
                {award.award.description ? <Text style={styles.description}>{award.award.description}</Text> : null}
                <View style={styles.meta}>
                    {award.commission ? (
                        <View style={styles.metaItem}>
                            <Icon name="series" size={14} color={palette.accent} />
                            <Text style={[styles.metaText, styles.metaCommission]}>
                                {t("beverage.commission")}: <Text style={styles.metaStrong}>{award.commission.name}</Text>
                            </Text>
                        </View>
                    ) : null}
                    <View style={styles.metaItem}>
                        <Icon name="calendar" size={14} color={palette.textFaint} />
                        <Text style={styles.metaText}>
                            {t("beverage.awardedOn", { date: formatDateTime(award.assignedAt) })}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    )
}

const cardShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)"

const styles = StyleSheet.create({
    tab: { gap: 24 },
    // border-slate-100 rounded-[28px] p-6 bg-white shadow-md
    group: {
        padding: 24,
        borderRadius: radius.hero,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.surface,
        boxShadow: cardShadow,
        ...continuous,
    },
    groupHead: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingBottom: 16,
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: palette.borderSoft,
    },
    groupTitle: { flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 },
    trophy: {
        padding: 10,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: palette.accentSoft,
        ...continuous,
    },
    groupText: { flexShrink: 1 },
    series: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.accent },
    competition: { marginTop: 2, fontSize: 16, lineHeight: 20, fontWeight: "700", color: palette.heading },
    statusChip: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.background,
    },
    statusLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3, textTransform: "uppercase", color: palette.textMuted },
    awards: { gap: 16 },
    // bg-white border-slate-100 rounded-[20px] p-5 shadow-sm, with the gradient bar
    card: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 16,
        overflow: "hidden",
        padding: 20,
        paddingLeft: 24,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.surface,
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
        ...continuous,
    },
    cardBar: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        experimental_backgroundImage: `linear-gradient(180deg, ${palette.accentBright}, #9810fa)`,
    },
    badgeTile: {
        width: 56,
        height: 56,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        experimental_backgroundImage: "linear-gradient(135deg, #eef2ff, #faf5ff)",
        ...continuous,
    },
    glyphTile: {
        width: 56,
        height: 56,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: "#c6d2ff",
        experimental_backgroundImage: `linear-gradient(135deg, ${palette.accentBright}, #9810fa)`,
        ...continuous,
    },
    badgeImage: { width: 40, height: 40 },
    cardText: { flex: 1, minWidth: 0, alignItems: "flex-start" },
    awardName: { fontSize: 16, fontWeight: "700", color: palette.heading },
    code: {
        marginTop: 6,
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.background,
    },
    codeLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.textFaint },
    description: { marginTop: 6, fontSize: 12, lineHeight: 19, fontWeight: "500", color: palette.textMuted },
    meta: { marginTop: 14, gap: 6 },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    metaText: { flexShrink: 1, fontSize: 11, fontWeight: "600", color: palette.textFaint },
    metaCommission: { color: palette.accent },
    metaStrong: { fontWeight: "700" },
})
