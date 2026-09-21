import { useEffect, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { formatCompetitionTiming } from "@winelore/core"
import {
    beverageProducerLabels,
    beverageStatusLook,
    beverageTypeCode,
    commissionStatusLook,
    commissionTimingTicks,
    competitionStatusLook,
    formatCommissionTiming,
    type ActiveCommission,
    type DashboardCompetition,
    type DashboardTemplate,
} from "@winelore/core/dashboard"
import { useTranslation } from "../i18n/LocaleProvider"
import { destinations, useOpenDestination } from "../navigation/destinations"
import { palette, type } from "../theme"
import { EntityCard, cardSurface, iconTile, type EntityCardMeta } from "../ui/EntityCard"
import { Icon } from "../ui/Icon"
import { PressableSurface } from "../ui/Pressable"
import type { DashboardBeverage } from "./useHome"

/** Re-renders every `intervalMs` while `active`, for timings relative to now. */
function useNow(active: boolean, intervalMs: number) {
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        if (!active) return
        setNow(Date.now())
        const id = setInterval(() => setNow(Date.now()), intervalMs)
        return () => clearInterval(id)
    }, [active, intervalMs])
    return now
}

type Density = "dashboard" | "list"

/** The web's `CommissionCard`: status, live timer, competition. */
export function CommissionCard({ commission, density }: { commission: ActiveCommission; density?: Density }) {
    const { t, formatStatus } = useTranslation()
    const open = useOpenDestination()
    const status = commission.status ?? ""
    const now = useNow(commissionTimingTicks(status), 1000)
    const timing = formatCommissionTiming(commission, t, now)
    const look = commissionStatusLook(status)

    const meta: EntityCardMeta[] = []
    if (commission.competition?.name) meta.push({ icon: "competition", value: commission.competition.name })

    return (
        <EntityCard
            onPress={() => open(destinations.commission(commission.id, commission.replicaId))}
            icon="commission"
            title={commission.name ?? ""}
            meta={meta}
            status={{ label: formatStatus(status), ...look, trailing: timing || undefined }}
            density={density}
        />
    )
}

/** The web's `CompetitionCard`: status, timing, series, holders. */
export function CompetitionCard({
    competition,
    usernames,
    density,
}: {
    competition: DashboardCompetition
    usernames: Record<string, string>
    density?: Density
}) {
    const { t, formatStatus } = useTranslation()
    const open = useOpenDestination()
    const running = competition.status === "STARTED" || competition.status === "IN_PROGRESS"
    // The web re-formats a running competition's timing every minute.
    useNow(running, 60_000)
    const timing = formatCompetitionTiming(competition, t)
    const look = competitionStatusLook(competition.status)

    const meta: EntityCardMeta[] = [
        // The series is a long, human-readable name, so it reads better as a
        // meta line (which may wrap) than as the truncated kicker.
        { icon: "series", value: competition.series?.name || t("common.independent") },
    ]
    if (competition.holder.length > 0) {
        meta.push({
            icon: "person",
            value: t("dashboard.holderId", {
                ids: competition.holder.map((id) => usernames[id] || String(id)).join(", "),
            }),
        })
    }

    return (
        <EntityCard
            onPress={() => open(destinations.competition(competition.id))}
            icon="competition"
            title={competition.name}
            meta={meta}
            status={{ label: formatStatus(competition.status), ...look, trailing: timing || undefined }}
            density={density}
        />
    )
}

/** The web's `BeverageCard`: status, type, origin, producers. */
export function BeverageCard({
    beverage,
    typeMap,
    usernames,
    originParts,
    density,
}: {
    beverage: DashboardBeverage
    typeMap: Record<string, string>
    usernames: Record<string, string>
    /** Reverse-geocoded origin, where the list resolves one (My Beverages does). */
    originParts?: string[]
    density?: Density
}) {
    const { t, formatStatus, formatBeverageType } = useTranslation()
    const open = useOpenDestination()
    const typeCode = beverageTypeCode(beverage, typeMap)
    const producers = beverageProducerLabels(beverage.producers, usernames)

    const meta: EntityCardMeta[] = []
    const origin = originParts?.filter(Boolean).join(", ")
    if (origin) {
        meta.push({ icon: "location", label: t("beverages.origin"), value: origin })
    }
    if (producers.length > 0) {
        meta.push({ icon: "person", label: t("beverages.producer"), value: producers.join(", ") })
    }

    return (
        <EntityCard
            onPress={() => open(destinations.beverage(beverage.id))}
            icon="beverage"
            kicker={typeCode ? formatBeverageType(typeCode) : null}
            title={beverage.name}
            meta={meta}
            status={
                beverage.status
                    ? { label: formatStatus(beverage.status), ...beverageStatusLook(beverage.status) }
                    : undefined
            }
            density={density}
        />
    )
}

/** The web's `TemplateCard`: a row with beverage type, version and a chevron. */
export function TemplateCard({ template }: { template: DashboardTemplate }) {
    const open = useOpenDestination()
    const version = template.latestEdition?.version

    return (
        <PressableSurface
            onPress={() => open(destinations.template(template.id, version))}
            accessibilityLabel={[template.beverageType, version ? `v${version}` : null, template.name]
                .filter(Boolean)
                .join(", ")}
            style={styles.templateCard}
        >
            <View style={styles.templateTile}>
                <Icon name="template" size={22} color={palette.accent} />
            </View>
            <View style={styles.templateText}>
                <View style={styles.templateHead}>
                    {template.beverageType ? (
                        <Text style={styles.templateType} numberOfLines={1}>
                            {template.beverageType}
                        </Text>
                    ) : null}
                    {version ? (
                        <View style={styles.versionChip}>
                            <Text style={styles.versionText}>v{version}</Text>
                        </View>
                    ) : null}
                </View>
                <Text style={styles.templateTitle} numberOfLines={1}>
                    {template.name}
                </Text>
            </View>
            <Icon name="chevron" size={16} color={palette.textGhost} weight="semibold" />
        </PressableSurface>
    )
}

const styles = StyleSheet.create({
    templateCard: { ...cardSurface, flexDirection: "row", alignItems: "center", gap: 16 },
    templateTile: { ...iconTile, width: 48, height: 48 },
    templateText: { flex: 1, minWidth: 0 },
    templateHead: { flexDirection: "row", alignItems: "center", gap: 8 },
    templateType: { ...type.kicker, color: palette.textFaint, flexShrink: 1 },
    versionChip: {
        backgroundColor: palette.accentSoft,
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 1,
    },
    versionText: { ...type.kicker, textTransform: "none", color: palette.accentBright },
    templateTitle: { fontSize: 15, lineHeight: 20, fontWeight: "700", color: palette.heading, marginTop: 2 },
})
