import { useEffect, useMemo, useRef } from "react"
import {
    ActivityIndicator,
    Animated,
    Pressable,
    StyleSheet,
    Text,
    View,
    type LayoutChangeEvent,
} from "react-native"
import {
    beverageColor,
    beverageCreatorAuid,
    beverageStatusTone,
    producerAuid,
    producerName,
    producerRoleKey,
    type BeveragePageData,
    type BeverageProducer,
    type BeverageStatusTone,
} from "@winelore/core/beverage"
import { useBeverageOrigins } from "../geocoding/useBeverageOrigins"
import { useTranslation } from "../i18n/LocaleProvider"
import { continuous, palette, radius } from "../theme"
import { Icon, type IconName } from "../ui/Icon"
import { PressableSurface } from "../ui/Pressable"
import { panelSurface } from "../ui/Surface"

interface HeaderCardProps {
    page: BeveragePageData
    usernames: Record<string, string>
    isProducer: boolean
    submitting: boolean
    onEdit: () => void
    onSubmitForReview: () => void
    /** Where the name ends within the card, so the screen can title itself once it scrolls away. */
    onNameLayout: (event: LayoutChangeEvent) => void
}

/**
 * The beverage's own card, as the web stacks it on a phone: the wine tile,
 * its type, colour and id, the name, the status (and a producer's "Submit
 * for Review"), then where it is from, who makes it and when it was entered.
 */
export function HeaderCard({
    page,
    usernames,
    isProducer,
    submitting,
    onEdit,
    onSubmitForReview,
    onNameLayout,
}: HeaderCardProps) {
    const { t, formatBeverageType, formatDateTime } = useTranslation()
    const { beverage } = page
    const color = beverageColor(beverage.attributes)
    const creator = beverageCreatorAuid(beverage)

    return (
        <View style={[panelSurface, styles.card]}>
            <View style={styles.tile}>
                <Icon name="beverage" size={40} color={palette.accentSoft} />
            </View>

            <View style={styles.chips}>
                <View style={[styles.chip, styles.typeChip]}>
                    <Text style={[styles.chipLabel, styles.typeChipLabel]}>{page.typeName || "Beverage"}</Text>
                </View>
                {color ? (
                    <View style={[styles.chip, styles.colorChip]}>
                        <ColorDot color={color} />
                        <Text style={[styles.chipLabel, styles.colorChipLabel]}>{formatBeverageType(color)}</Text>
                    </View>
                ) : null}
                <View style={[styles.chip, styles.idChip]}>
                    <Text style={[styles.chipLabel, styles.idChipLabel]}>ID: {beverage.id.slice(-6)}</Text>
                </View>
            </View>

            <View style={styles.nameRow} onLayout={onNameLayout}>
                <Text style={styles.name} accessibilityRole="header">
                    {beverage.name}
                </Text>
                {isProducer ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("beverage.edit.button")}
                        hitSlop={8}
                        onPress={onEdit}
                        style={({ pressed }) => [styles.pencil, pressed && styles.pencilPressed]}
                    >
                        <Icon name="edit" size={16} color={palette.textFaint} />
                    </Pressable>
                ) : null}
            </View>

            <View style={styles.statusRow}>
                {beverage.status === "DRAFT" && isProducer ? (
                    <PressableSurface
                        onPress={onSubmitForReview}
                        disabled={submitting}
                        style={[styles.submit, submitting && styles.submitBusy]}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color={palette.onAccent} />
                        ) : (
                            <Icon name="send" size={14} color={palette.onAccent} weight="semibold" />
                        )}
                        <Text style={styles.submitLabel}>{t("beverage.submitReviewButton")}</Text>
                    </PressableSurface>
                ) : null}
                <StatusBadge status={beverage.status} />
            </View>

            <View style={styles.divider} />

            <View style={styles.meta}>
                <MetaBlock icon="location" label={t("beverage.origin")}>
                    <Origin page={page} />
                </MetaBlock>
                <MetaBlock icon="people" label={t("beverage.producers")}>
                    {beverage.producers && beverage.producers.length > 0 ? (
                        <View style={styles.badges}>
                            {beverage.producers.map((producer) => (
                                <ProducerBadge key={producer.id} producer={producer} usernames={usernames} />
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.metaMissing}>{t("common.na")}</Text>
                    )}
                </MetaBlock>
                <MetaBlock icon="calendar" label={t("beverage.created")}>
                    <Text style={styles.metaValue}>{formatDateTime(beverage.createdAt)}</Text>
                    {creator !== null ? (
                        <Text style={styles.enteredBy}>
                            {t("beverage.enteredBy")}:{" "}
                            <Text style={styles.enteredByName}>{usernames[creator] || `AUID ${creator}`}</Text>
                        </Text>
                    ) : null}
                </MetaBlock>
            </View>
        </View>
    )
}

/**
 * Where the beverage comes from. The web names the place from a server-side
 * lookup; here the lookup runs on the phone, so the coordinates stand in
 * until the name arrives — and are what stays if it cannot be found.
 */
function Origin({ page }: { page: BeveragePageData }) {
    const { t } = useTranslation()
    const origin = page.beverage.origin
    const located = typeof origin?.latitude === "number" && typeof origin?.longitude === "number"
    // Keyed by the point, so an edited origin is looked up afresh.
    const point = useMemo(
        () =>
            located ? [{ id: `${origin!.latitude},${origin!.longitude}`, origin: origin as { latitude: number; longitude: number } }] : [],
        [located, origin],
    )
    const parts = useBeverageOrigins(point)[point[0]?.id ?? ""]

    if (!located) return <Text style={styles.metaMissing}>{t("common.na")}</Text>
    return (
        <Text style={[styles.metaValue, !parts && styles.tabular]}>
            {parts ? parts.join(", ") : `${origin!.latitude!.toFixed(4)}, ${origin!.longitude!.toFixed(4)}`}
        </Text>
    )
}

function MetaBlock({ icon, label, children }: { icon: IconName; label: string; children: React.ReactNode }) {
    return (
        <View style={styles.metaBlock}>
            <View style={styles.metaLabelRow}>
                <Icon name={icon} size={14} color={palette.accentBright} />
                <Text style={styles.metaLabel}>{label}</Text>
            </View>
            {children}
        </View>
    )
}

// --- Colour dot -------------------------------------------------------------

// The web's getColorDotClass: bg-*-* with a border one step darker.
const DOTS: Record<string, { fill: string; border: string }> = {
    RED: { fill: "#e7000b", border: "#c10007" }, // red-600 / red-700
    ROSE: { fill: "#fb64b6", border: "#f6339a" }, // pink-400 / pink-500
    WHITE: { fill: "#fef3c6", border: "#ffd230" }, // amber-100 / amber-300
    SPARKLING: { fill: "#ffdf20", border: "#fac800" }, // yellow-300 / yellow-400
    FORTIFIED: { fill: "#973c00", border: "#7b3306" }, // amber-800 / amber-900
}
const DEFAULT_DOT = { fill: palette.accentBright, border: palette.accent } // indigo-500 / indigo-600

function ColorDot({ color }: { color: string }) {
    const upper = color.toUpperCase()
    const dot = DOTS[upper] ?? DEFAULT_DOT
    // Sparkling pulses on the web (animate-pulse).
    const opacity = useRef(new Animated.Value(1)).current
    useEffect(() => {
        if (upper !== "SPARKLING") return
        const half = (toValue: number) => Animated.timing(opacity, { toValue, duration: 1000, useNativeDriver: true })
        const loop = Animated.loop(Animated.sequence([half(0.5), half(1)]))
        loop.start()
        return () => loop.stop()
    }, [opacity, upper])
    return <Animated.View style={[styles.dot, { backgroundColor: dot.fill, borderColor: dot.border, opacity }]} />
}

// --- Status -----------------------------------------------------------------

const STATUS: Record<BeverageStatusTone, { icon: IconName; background: string; border: string; color: string }> = {
    approved: { icon: "check", background: "#ecfdf5", border: "#d0fae5", color: palette.positive },
    suspended: { icon: "alert", background: palette.dangerSoft, border: palette.dangerBorder, color: palette.danger },
    pending: { icon: "clock", background: "#fffbeb", border: "#fef3c6", color: palette.warning },
    neutral: { icon: "tag", background: palette.background, border: palette.borderSoft, color: "#45556c" },
}

function StatusBadge({ status }: { status: string }) {
    const { formatStatus } = useTranslation()
    const look = STATUS[beverageStatusTone(status)]
    return (
        <View style={[styles.status, { backgroundColor: look.background, borderColor: look.border }]}>
            <Icon name={look.icon} size={14} color={look.color} weight="semibold" />
            <Text style={[styles.statusLabel, { color: look.color }]}>{formatStatus(status)}</Text>
        </View>
    )
}

// --- Producers --------------------------------------------------------------

// The web's getRoleColors: bg-*-50, text-*-700, border-*-100.
const ROLES: Record<string, { background: string; color: string; border: string }> = {
    MAKER: { background: "#eff6ff", color: "#1447e6", border: "#dbeafe" }, // blue
    OWNER: { background: "#faf5ff", color: "#8200db", border: "#f3e8ff" }, // purple
    DISTRIBUTOR: { background: "#ecfdf5", color: "#007a55", border: "#d0fae5" }, // emerald
    BOTTLER: { background: "#fffbeb", color: "#bb4d00", border: "#fef3c6" }, // amber
}
const DEFAULT_ROLE = { background: palette.background, color: palette.textStrong, border: palette.border }

function ProducerBadge({ producer, usernames }: { producer: BeverageProducer; usernames: Record<string, string> }) {
    const { t } = useTranslation()
    const look = ROLES[producer.role.toUpperCase()] ?? DEFAULT_ROLE
    const auid = producerAuid(producer)
    const roleKey = producerRoleKey(producer.role)
    const name = producerName(
        { ...producer, displayName: auid !== null ? usernames[auid] : null },
        t("common.unknownUser"),
    )
    return (
        <View style={[styles.badge, { backgroundColor: look.background, borderColor: look.border }]}>
            <Text style={styles.badgeName}>{name}</Text>
            <Text style={[styles.badgeSeparator, { color: look.color }]}>•</Text>
            <Text style={[styles.badgeRole, { color: look.color }]}>{roleKey ? t(roleKey) : producer.role}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    card: {
        alignItems: "center",
        overflow: "hidden",
        // The web's indigo-50/30 wash, top right.
        experimental_backgroundImage:
            "radial-gradient(circle at 100% 0%, rgba(238, 242, 255, 0.6) 0%, rgba(238, 242, 255, 0) 45%)",
    },
    // h-20 w-20 rounded-[24px] from-indigo-600 to-indigo-700 border-indigo-500
    tile: {
        width: 80,
        height: 80,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: palette.accentBright,
        experimental_backgroundImage: "linear-gradient(135deg, #4f39f6, #432dd7)",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
        ...continuous,
    },
    chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 24 },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: radius.pill,
        borderWidth: 1,
    },
    chipLabel: { fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
    typeChip: { backgroundColor: palette.accentSoft, borderColor: palette.accentBorder },
    typeChipLabel: { color: palette.accent },
    colorChip: { backgroundColor: palette.borderSoft, borderColor: palette.border },
    colorChipLabel: { color: palette.textStrong },
    idChip: { paddingHorizontal: 10, backgroundColor: palette.background, borderColor: palette.borderSoft },
    idChipLabel: { color: palette.textFaint, letterSpacing: 0.5 },
    dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1 },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginTop: 12,
        marginBottom: 8,
    },
    name: {
        flexShrink: 1,
        fontSize: 24,
        lineHeight: 30,
        fontWeight: "800",
        letterSpacing: -0.5,
        color: palette.heading,
        textAlign: "center",
    },
    pencil: {
        padding: 6,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.background,
    },
    pencilPressed: { backgroundColor: palette.accentSoft },
    statusRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 8 },
    submit: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: radius.md,
        backgroundColor: palette.accent,
        boxShadow: "0 10px 15px -3px rgba(79, 57, 246, 0.15), 0 4px 6px -4px rgba(79, 57, 246, 0.15)",
        ...continuous,
    },
    submitBusy: { opacity: 0.5 },
    submitLabel: { fontSize: 12, fontWeight: "700", color: palette.onAccent },
    status: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: radius.tile,
        borderWidth: 1,
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
        ...continuous,
    },
    statusLabel: { fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
    divider: { alignSelf: "stretch", height: 1, marginVertical: 24, backgroundColor: palette.borderSoft },
    meta: { alignSelf: "stretch", gap: 24 },
    metaBlock: { gap: 6 },
    metaLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    metaLabel: { fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase", color: palette.textFaint },
    metaValue: { fontSize: 14, lineHeight: 20, fontWeight: "700", color: palette.textStrong },
    tabular: { fontVariant: ["tabular-nums"] },
    metaMissing: { fontSize: 14, lineHeight: 20, fontWeight: "500", color: palette.textFaint },
    enteredBy: { fontSize: 11, lineHeight: 16, fontWeight: "600", color: palette.textMuted },
    enteredByName: { fontWeight: "700", color: palette.textStrong },
    badges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.pill,
        borderWidth: 1,
    },
    badgeName: { fontSize: 11, lineHeight: 16, fontWeight: "700", color: palette.text },
    badgeSeparator: { fontSize: 11, opacity: 0.3 },
    badgeRole: { fontSize: 8, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },
})
