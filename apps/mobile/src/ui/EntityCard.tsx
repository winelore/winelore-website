import { Fragment } from "react"
import { StyleSheet, Text, View } from "react-native"
import type { StatusGlyph, StatusTone } from "@winelore/core/dashboard"
import { cardShadow, continuous, palette, radius, toneColor, type } from "../theme"
import { Icon, type IconName } from "./Icon"
import { PressableSurface } from "./Pressable"

export interface EntityCardMeta {
    icon: IconName
    /** Short label rendered before the value, e.g. "Producer:". Optional. */
    label?: string
    value: string
}

export interface EntityCardStatus {
    label: string
    tone: StatusTone
    glyph: StatusGlyph
    /** Live detail that belongs with the status — elapsed, remaining, lasted. */
    trailing?: string
}

interface EntityCardProps {
    onPress: () => void
    /** Entity glyph shown in the tile. */
    icon: IconName
    /** Micro label above the title — the beverage type. */
    kicker?: string | null
    title: string
    meta?: EntityCardMeta[]
    status?: EntityCardStatus
    /**
     * "dashboard" is the tighter home-screen card; "list" the roomier one the
     * web's list pages render on a phone — a bigger tile and title.
     */
    density?: "dashboard" | "list"
}

/**
 * The web's `EntityCard`: an indigo glyph tile, a status/kicker line in small
 * caps, the title, then meta lines. Same anatomy, same colours, so a
 * commission or a wine looks like the same thing on a phone as on a desk.
 */
export function EntityCard({ onPress, icon, kicker, title, meta = [], status, density = "dashboard" }: EntityCardProps) {
    const list = density === "list"
    const headParts: React.ReactNode[] = []
    if (status) {
        const color = toneColor[status.tone]
        headParts.push(
            <View key="status" style={styles.status}>
                <Icon name={status.glyph} size={12} color={color} weight="semibold" />
                <Text style={[styles.kicker, { color }]}>{status.label}</Text>
            </View>,
        )
        if (status.trailing) {
            headParts.push(
                <Text key="trailing" style={styles.trailing} numberOfLines={1}>
                    {status.trailing}
                </Text>,
            )
        }
    }
    if (kicker) {
        headParts.push(
            <Text key="kicker" style={[styles.kicker, styles.kickerText]} numberOfLines={1}>
                {kicker}
            </Text>,
        )
    }

    return (
        <PressableSurface
            onPress={onPress}
            accessibilityLabel={[status?.label, kicker, title].filter(Boolean).join(", ")}
            style={[styles.card, list && styles.listCard]}
        >
            <View style={styles.head}>
                <View style={[styles.tile, list && styles.listTile]}>
                    <Icon name={icon} size={list ? 24 : 20} color={palette.accent} />
                </View>
                <View style={styles.headText}>
                    {headParts.length > 0 ? (
                        <View style={styles.headLine}>
                            {headParts.map((part, index) => (
                                <Fragment key={index}>
                                    {index > 0 ? <Text style={styles.dot}>·</Text> : null}
                                    {part}
                                </Fragment>
                            ))}
                        </View>
                    ) : null}
                    <Text style={[styles.title, list && styles.listTitle]} numberOfLines={1}>
                        {title}
                    </Text>
                </View>
            </View>

            {meta.length > 0 ? (
                <View style={styles.meta}>
                    {meta.map(({ icon: metaIcon, label, value }, index) => (
                        <View key={index} style={styles.metaLine}>
                            <Icon name={metaIcon} size={14} color={palette.accentMuted} style={styles.metaIcon} />
                            <Text style={styles.metaText} numberOfLines={2}>
                                {label ? <Text style={styles.metaLabel}>{label} </Text> : null}
                                {value}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : null}
        </PressableSurface>
    )
}

export const cardSurface = {
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    padding: 16,
    ...cardShadow,
    ...continuous,
} as const

export const iconTile = {
    width: 40,
    height: 40,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: palette.accentBorder,
    backgroundColor: palette.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    ...continuous,
} as const

const styles = StyleSheet.create({
    card: cardSurface,
    head: { flexDirection: "row", alignItems: "center", gap: 12 },
    tile: iconTile,
    headText: { flex: 1, minWidth: 0 },
    headLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 6, rowGap: 2 },
    status: { flexDirection: "row", alignItems: "center", gap: 4 },
    kicker: type.kicker,
    kickerText: { color: palette.textFaint, flexShrink: 1 },
    trailing: { fontSize: 10, lineHeight: 14, fontWeight: "600", color: palette.textFaint, flexShrink: 1 },
    dot: { fontSize: 10, lineHeight: 14, color: palette.textSubtle },
    title: { fontSize: 15, lineHeight: 20, fontWeight: "700", color: palette.heading, marginTop: 2 },
    // The web's compact and comfortable cards, as a phone draws them: p-5,
    // rounded-[24px], a 48pt tile and text-lg title.
    listCard: { padding: 20, borderRadius: radius.panel },
    listTile: { width: 48, height: 48 },
    listTitle: { fontSize: 18, lineHeight: 24 },
    meta: { gap: 6, paddingTop: 14 },
    metaLine: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
    metaIcon: { marginTop: 1 },
    metaText: { flex: 1, fontSize: 12, lineHeight: 16, color: palette.textFaint },
    metaLabel: { fontWeight: "500", color: palette.textMuted },
})
