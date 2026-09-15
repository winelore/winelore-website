import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native"
import { Stack } from "expo-router"
import {
    isRegisteredWineRegion,
    wineRegionSummaries,
    wineRegionsForPoint,
    type RegionGeography,
    type WineRegionFeature,
} from "@winelore/core"
import { beverageColor, producerRoleKey } from "@winelore/core/beverage"
import type { GetBeverageDetailsMapQuery } from "@winelore/core/gql/graphql"
import { sdk } from "../api/client"
import { lookUpRegion } from "../geocoding/useBeverageOrigins"
import { useTranslation } from "../i18n/LocaleProvider"
import { continuous, palette, radius } from "../theme"
import { Icon } from "../ui/Icon"
import { useDisplayNames } from "../users/useDisplayNames"
import { setSelectedRegions } from "./selection"
import { loadWineRegions } from "./useWineRegions"

type Beverage = NonNullable<GetBeverageDetailsMapQuery["beverage"]>
type Region = { geography: RegionGeography | null; matches: WineRegionFeature[] }

/** The web's role chips: blue makers, purple owners, emerald distributors, amber bottlers. */
const ROLE_TONES: Record<string, { background: string; border: string; text: string }> = {
    MAKER: { background: "#eff6ff", border: "#dbeafe", text: "#1447e6" },
    OWNER: { background: "#faf5ff", border: "#f3e8ff", text: "#8200db" },
    DISTRIBUTOR: { background: "#ecfdf5", border: "#d0fae5", text: "#007a55" },
    BOTTLER: { background: "#fffbeb", border: "#fef3c6", text: "#bb4d00" },
}
const NEUTRAL_TONE = { background: palette.background, border: palette.border, text: palette.textStrong }

/**
 * A beverage from the map, as the web's map panel shows it: the name, type
 * and status, its producers and when it was entered, the region and country
 * of its origin, and the mapped wine regions the origin lies in — which the
 * map behind outlines while this is open.
 */
export function MapBeverageSheet({ id }: { id: string }) {
    const { t, tCount, formatDateTime, formatStatus, formatBeverageType } = useTranslation()
    const [beverage, setBeverage] = useState<Beverage | null | undefined>(undefined)
    const [region, setRegion] = useState<Region | null | undefined>(undefined)

    useEffect(() => {
        let active = true
        sdk.GetBeverageDetailsMap({ id })
            .then(async ({ beverage: found }) => {
                if (!active) return
                setBeverage(found ?? null)
                const origin = found?.origin
                if (!origin?.latitude || !origin?.longitude) {
                    setRegion(null)
                    return
                }
                const [geography, matches] = await Promise.all([
                    lookUpRegion(origin),
                    loadWineRegions()
                        .then((features) => wineRegionsForPoint(features, origin.latitude, origin.longitude))
                        .catch(() => []),
                ])
                if (!active) return
                setRegion({ geography, matches })
                setSelectedRegions(matches)
            })
            .catch(() => {
                if (!active) return
                setBeverage(null)
                setRegion(null)
            })
        return () => {
            active = false
            setSelectedRegions([])
        }
    }, [id])

    const producerIds = useMemo(
        () => (beverage?.producers ?? []).map((producer) => producer.auid?.[0]).filter((auid): auid is number => auid != null).map(String),
        [beverage],
    )
    const names = useDisplayNames(producerIds)

    if (beverage === undefined) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator color={palette.accent} />
                <Text style={styles.loadingLabel}>{t("map.loadingDetails")}</Text>
            </View>
        )
    }
    if (beverage === null) {
        return (
            <View style={styles.loading}>
                <Icon name="alert" size={28} color={palette.textFaint} />
                <Text style={styles.loadingLabel}>{t("beverage.notFoundTitle")}</Text>
            </View>
        )
    }

    const type = beverageColor(beverage.attributes) ?? "WINE"
    const summaries = region ? wineRegionSummaries(region.matches) : []

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
                <View style={styles.head}>
                    <View style={styles.headTile}>
                        <Icon name="beverage" size={26} color={palette.accent} />
                    </View>
                    <View style={styles.headText}>
                        <Text style={styles.name} numberOfLines={2} accessibilityRole="header">
                            {beverage.name}
                        </Text>
                        <View style={styles.chips}>
                            <View style={styles.typeChip}>
                                <Text style={styles.typeLabel}>{formatBeverageType(type) || type}</Text>
                            </View>
                            <View style={styles.statusChip}>
                                <View style={styles.statusDot} />
                                <Text style={styles.statusLabel}>{formatStatus(beverage.status) || beverage.status}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.pair}>
                    <View style={styles.card}>
                        <CardHead icon="people" label={t("beverage.producers")} />
                        {beverage.producers.length > 0 ? (
                            <View style={styles.badges}>
                                {beverage.producers.map((producer) => {
                                    const tone = ROLE_TONES[producer.role.toUpperCase()] ?? NEUTRAL_TONE
                                    const key = producerRoleKey(producer.role)
                                    const auid = producer.auid?.[0]
                                    return (
                                        <View key={producer.id} style={[styles.badge, { backgroundColor: tone.background, borderColor: tone.border }]}>
                                            <Text style={styles.badgeName} numberOfLines={1}>
                                                {auid != null ? names[String(auid)] || `@${auid}` : t("common.unknownUser")}
                                            </Text>
                                            <Text style={[styles.badgeRole, { color: tone.text }]}>{key ? t(key) : producer.role}</Text>
                                        </View>
                                    )
                                })}
                            </View>
                        ) : (
                            <Text style={styles.cardValue}>{t("common.na")}</Text>
                        )}
                    </View>
                    <View style={styles.card}>
                        <CardHead icon="calendar" label={t("beverage.created")} />
                        <Text style={styles.cardValue}>{formatDateTime(beverage.createdAt)}</Text>
                    </View>
                </View>

                <SectionHead icon="location" title={t("map.geography")} note={t("map.originDetails")} />
                {region === undefined ? (
                    <View style={[styles.panel, styles.detecting]}>
                        <ActivityIndicator size="small" color={palette.accent} />
                        <Text style={styles.detectingLabel}>{t("map.detectingRegion")}</Text>
                    </View>
                ) : region ? (
                    <View style={styles.panel}>
                        <Text style={styles.regionName}>{region.geography?.region || t("map.unknownRegion")}</Text>
                        <View style={styles.country}>
                            <Icon name="language" size={13} color={palette.textMuted} />
                            <Text style={styles.countryLabel}>{region.geography?.countryName || region.geography?.countryCode || "—"}</Text>
                        </View>
                    </View>
                ) : null}

                {region ? (
                    <>
                        <SectionHead icon="verified" title={t("map.wineRegions")} note={t("map.mappedOriginAreas")} tone="blue" />
                        {summaries.length > 0 ? (
                            <>
                                <View style={styles.notice}>
                                    <Icon name="specs" size={18} color="#2b7fff" />
                                    <Text style={styles.noticeText}>{tCount("map.regionNotice", summaries.length)}</Text>
                                </View>
                                {summaries.map((summary) => {
                                    const registered = isRegisteredWineRegion(summary.status)
                                    return (
                                        <View key={summary.id} style={styles.regionCard}>
                                            <View style={styles.regionHead}>
                                                <Text style={styles.regionTitle}>{summary.name}</Text>
                                                <View style={styles.regionType}>
                                                    <Text style={styles.regionTypeLabel}>{summary.type}</Text>
                                                </View>
                                            </View>
                                            <View style={styles.regionStatus}>
                                                <View style={[styles.regionDot, { backgroundColor: registered ? "#00d492" : "#ffb900" }]} />
                                                <Text style={styles.regionStatusLabel}>
                                                    {registered ? t("map.registeredRegion") : t("map.mappedRegion")}
                                                </Text>
                                            </View>
                                        </View>
                                    )
                                })}
                            </>
                        ) : (
                            <View style={[styles.panel, styles.empty]}>
                                <Icon name="verified" size={30} color={palette.textGhost} />
                                <Text style={styles.emptyTitle}>{t("map.noRegionTitle")}</Text>
                                <Text style={styles.emptyBody}>{t("map.noRegionDesc")}</Text>
                            </View>
                        )}
                    </>
                ) : null}
            </ScrollView>
        </>
    )
}

function CardHead({ icon, label }: { icon: "people" | "calendar"; label: string }) {
    return (
        <View style={styles.cardHead}>
            <View style={styles.cardIcon}>
                <Icon name={icon} size={15} color={palette.accent} />
            </View>
            <Text style={styles.cardLabel}>{label}</Text>
        </View>
    )
}

function SectionHead({ icon, title, note, tone }: { icon: "location" | "verified"; title: string; note: string; tone?: "blue" }) {
    const blue = tone === "blue"
    return (
        <View style={styles.section}>
            <View style={[styles.sectionIcon, blue && styles.sectionIconBlue]}>
                <Icon name={icon} size={15} color={blue ? palette.onAccent : palette.textFaint} />
            </View>
            <View style={styles.sectionText}>
                <Text style={[styles.sectionTitle, blue && styles.sectionTitleBlue]} numberOfLines={1}>
                    {title}
                </Text>
                <Text style={[styles.sectionNote, blue && styles.sectionNoteBlue]} numberOfLines={1}>
                    {note}
                </Text>
            </View>
            <View style={[styles.sectionRule, blue && styles.sectionRuleBlue]} />
        </View>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    content: { padding: 20, paddingTop: 28, paddingBottom: 48, gap: 16 },
    loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: palette.background, paddingVertical: 48 },
    loadingLabel: { fontSize: 14, fontWeight: "700", color: palette.textFaint },
    head: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
    headTile: {
        width: 52,
        height: 52,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: palette.accentSoft,
        ...continuous,
    },
    headText: { flex: 1, minWidth: 0, paddingTop: 2 },
    name: { fontSize: 20, lineHeight: 26, fontWeight: "800", color: palette.heading },
    chips: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 6 },
    typeChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: palette.borderSoft },
    typeLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", color: palette.textMuted },
    statusChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "rgba(224, 231, 255, 0.5)",
        backgroundColor: palette.accentSoft,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.accentBright },
    statusLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", color: palette.accent },
    pair: { flexDirection: "row", gap: 16 },
    card: {
        flex: 1,
        minWidth: 0,
        gap: 12,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.surface,
        ...continuous,
    },
    cardHead: { flexDirection: "row", alignItems: "center", gap: 8 },
    cardIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: palette.accentSoft },
    cardLabel: { flexShrink: 1, fontSize: 10, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", color: palette.textFaint },
    cardValue: { fontSize: 14, fontWeight: "700", color: palette.textStrong },
    badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    badge: { flexDirection: "row", alignItems: "center", gap: 6, maxWidth: "100%", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
    badgeName: { flexShrink: 1, fontSize: 11, fontWeight: "700", color: palette.text },
    badgeRole: { fontSize: 8, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
    section: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
    sectionIcon: {
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
    },
    sectionIconBlue: { borderColor: "transparent", experimental_backgroundImage: "linear-gradient(135deg, #2b7fff, #4f39f6)" },
    sectionText: { flexShrink: 1 },
    sectionTitle: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", color: palette.textMuted },
    sectionTitleBlue: { color: "#1447e6" },
    sectionNote: { marginTop: 2, fontSize: 9, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", color: palette.textFaint },
    sectionNoteBlue: { color: "#51a2ff" },
    sectionRule: { flex: 1, height: 1, marginLeft: 8, backgroundColor: palette.border },
    sectionRuleBlue: { backgroundColor: "#bedbff" },
    panel: { padding: 20, borderRadius: radius.panel, borderWidth: 1, borderColor: palette.borderSoft, backgroundColor: palette.surface, ...continuous },
    detecting: { flexDirection: "row", alignItems: "center", gap: 12 },
    detectingLabel: { fontSize: 14, fontWeight: "700", color: palette.textMuted },
    regionName: { fontSize: 14, fontWeight: "700", color: palette.textStrong },
    country: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
    countryLabel: { fontSize: 12, fontWeight: "600", color: palette.textMuted },
    notice: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(219, 234, 254, 0.5)",
        backgroundColor: "rgba(239, 246, 255, 0.5)",
        ...continuous,
    },
    noticeText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: "500", color: "#193cb8" },
    regionCard: { padding: 20, borderRadius: 20, borderWidth: 1, borderColor: palette.borderSoft, backgroundColor: palette.surface, gap: 12, ...continuous },
    regionHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
    regionTitle: { flex: 1, fontSize: 14, lineHeight: 18, fontWeight: "700", color: palette.heading },
    regionType: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "rgba(254, 230, 133, 0.6)", backgroundColor: "#fffbeb" },
    regionTypeLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", color: "#bb4d00" },
    regionStatus: { flexDirection: "row", alignItems: "center", gap: 8 },
    regionDot: { width: 6, height: 6, borderRadius: 3 },
    regionStatusLabel: { flexShrink: 1, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", color: palette.textFaint },
    empty: { alignItems: "center", paddingVertical: 32, gap: 6 },
    emptyTitle: { marginTop: 6, fontSize: 14, fontWeight: "700", color: palette.textStrong, textAlign: "center" },
    emptyBody: { fontSize: 12, color: palette.textMuted, textAlign: "center" },
})
