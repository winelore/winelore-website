import { useEffect, useRef } from "react"
import { Animated, Easing, StyleSheet, Text, View } from "react-native"
import { competitionStepIndex, holderAvatarIndex, holderInitials } from "@winelore/core/competition"
import { useTranslation } from "../i18n/LocaleProvider"
import { continuous, palette, radius, type } from "../theme"
import { Icon } from "../ui/Icon"
import { panelSurface } from "../ui/Surface"

// --- Status pill ------------------------------------------------------------

const PILL = {
    // bg-emerald-500/10 text-emerald-600 border-emerald-500/20
    STARTED: { backgroundColor: "rgba(0, 188, 125, 0.1)", borderColor: "rgba(0, 188, 125, 0.2)", color: palette.positive },
    // bg-slate-100 text-slate-500 border-slate-200
    COMPLETED: { backgroundColor: palette.borderSoft, borderColor: palette.border, color: palette.textMuted },
    // bg-amber-500/10 text-amber-600 border-amber-500/20
    other: { backgroundColor: "rgba(254, 154, 0, 0.1)", borderColor: "rgba(254, 154, 0, 0.2)", color: palette.warning },
} as const

/** The web's status pill — with the pinging live dot while the competition runs. */
export function StatusPill({ status }: { status: string }) {
    const { formatStatus } = useTranslation()
    const look = status === "STARTED" ? PILL.STARTED : status === "COMPLETED" ? PILL.COMPLETED : PILL.other
    return (
        <View style={[styles.pill, { backgroundColor: look.backgroundColor, borderColor: look.borderColor }]}>
            {status === "STARTED" ? <LiveDot /> : null}
            <Text style={[styles.pillLabel, { color: look.color }]}>{formatStatus(status)}</Text>
        </View>
    )
}

/** Tailwind's `animate-ping` behind a solid dot: scale to 2 and fade, once a second. */
function LiveDot() {
    const ping = useRef(new Animated.Value(0)).current
    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(ping, {
                toValue: 1,
                duration: 1000,
                easing: Easing.bezier(0, 0, 0.2, 1),
                useNativeDriver: true,
            }),
        )
        loop.start()
        return () => loop.stop()
    }, [ping])
    return (
        <View style={styles.dotBox}>
            <Animated.View
                style={[
                    styles.dot,
                    styles.dotPing,
                    {
                        opacity: ping.interpolate({ inputRange: [0, 1], outputRange: [0.75, 0] }),
                        transform: [{ scale: ping.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }],
                    },
                ]}
            />
            <View style={styles.dot} />
        </View>
    )
}

// --- Holder avatar ----------------------------------------------------------

/**
 * The web's eight avatar gradients (bg-gradient-to-br, from/via/to), indexed
 * by `holderAvatarIndex` so a person has the same colours on both.
 */
const AVATAR_GRADIENTS = [
    ["#f6339a", "#ff2056", "#fb2c36"], // pink-500 → rose-500 → red-500
    ["#625fff", "#ad46ff", "#f6339a"], // indigo-500 → purple-500 → pink-500
    ["#2b7fff", "#00bba7", "#00bc7d"], // blue-500 → teal-500 → emerald-500
    ["#ffba00", "#ff6900", "#fb2c36"], // amber-400 → orange-500 → red-500
    ["#7f22fe", "#9810fa", "#4f39f6"], // violet-600 → purple-600 → indigo-600
    ["#00b8db", "#2b7fff", "#625fff"], // cyan-500 → blue-500 → indigo-500
    ["#00d492", "#00bba7", "#00b8db"], // emerald-400 → teal-500 → cyan-500
    ["#e12afb", "#9810fa", "#e60076"], // fuchsia-500 → purple-600 → pink-600
] as const

export function HolderAvatar({ auid, username, size = 20 }: { auid: number; username?: string; size?: number }) {
    const [from, via, to] = AVATAR_GRADIENTS[holderAvatarIndex(auid)]
    return (
        <View
            style={[
                styles.avatar,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    experimental_backgroundImage: `linear-gradient(135deg, ${from}, ${via}, ${to})`,
                },
            ]}
        >
            <Text style={styles.avatarText}>{holderInitials(username, auid)}</Text>
        </View>
    )
}

// --- Status steps -----------------------------------------------------------

/** Planned → started → completed, as the web stacks the steps on a phone. */
export function StatusSteps({ status }: { status: string }) {
    const { t } = useTranslation()
    return (
        <StepsCard
            current={competitionStepIndex(status)}
            steps={[
                { label: t("competition.stepPlanned"), description: t("competition.stepPlannedDesc") },
                { label: t("competition.stepStarted"), description: t("competition.stepStartedDesc") },
                { label: t("competition.stepCompleted"), description: t("competition.stepCompletedDesc") },
            ]}
        />
    )
}

/** The web's three-step tracker: done steps ticked in green, the current one in indigo. */
export function StepsCard({ steps, current }: { steps: Array<{ label: string; description: string }>; current: number }) {
    return (
        <View style={[panelSurface, styles.steps]}>
            {steps.map((step, index) => {
                const done = index < current
                const active = index === current
                return (
                    <View key={index} style={styles.step} accessibilityState={{ selected: active }}>
                        <View style={[styles.stepDot, done && styles.stepDotDone, active && styles.stepDotActive]}>
                            {done ? (
                                <Icon name="check" size={16} color={palette.onAccent} weight="semibold" />
                            ) : (
                                <Text style={[styles.stepNumber, active && styles.stepNumberActive]}>{index + 1}</Text>
                            )}
                        </View>
                        <View style={styles.stepText}>
                            <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{step.label}</Text>
                            <Text style={styles.stepDescription}>{step.description}</Text>
                        </View>
                    </View>
                )
            })}
        </View>
    )
}

// --- Series -----------------------------------------------------------------

export function SeriesCard({ name }: { name: string }) {
    const { t } = useTranslation()
    return (
        <View style={[panelSurface, styles.series]}>
            <View style={styles.tile}>
                <Icon name="series" size={24} color={palette.accent} />
            </View>
            <View style={styles.seriesText}>
                <Text style={styles.kicker}>{t("competition.series")}</Text>
                <Text style={styles.seriesName} numberOfLines={1}>
                    {name}
                </Text>
            </View>
        </View>
    )
}

export const tileStyle = {
    width: 48,
    height: 48,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: palette.accentBorder,
    backgroundColor: palette.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    ...continuous,
} as const

const styles = StyleSheet.create({
    pill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: radius.pill,
        borderWidth: 1,
    },
    pillLabel: { fontSize: 12, lineHeight: 16, fontWeight: "700" },
    dotBox: { width: 8, height: 8, marginRight: 4 },
    dot: { position: "absolute", width: 8, height: 8, borderRadius: 4, backgroundColor: "#00bc7d" },
    dotPing: { backgroundColor: "#00d492" },
    avatar: {
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.1)",
    },
    avatarText: { fontSize: 10, fontWeight: "700", color: palette.onAccent },
    steps: { gap: 16 },
    step: { flexDirection: "row", alignItems: "center", gap: 12 },
    stepDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.background,
        alignItems: "center",
        justifyContent: "center",
    },
    // bg-emerald-500 with its soft shadow.
    stepDotDone: {
        backgroundColor: "#00bc7d",
        borderColor: "#00bc7d",
        boxShadow: "0 4px 10px rgba(0, 188, 125, 0.2)",
    },
    // bg-indigo-600, ring-4 ring-indigo-500/10.
    stepDotActive: {
        backgroundColor: palette.accent,
        borderColor: palette.accent,
        boxShadow: "0 0 0 4px rgba(98, 95, 255, 0.1), 0 4px 10px rgba(97, 95, 255, 0.2)",
    },
    stepNumber: { fontSize: 12, fontWeight: "600", color: palette.textFaint },
    stepNumberActive: { color: palette.onAccent },
    stepText: { flex: 1 },
    stepLabel: { fontSize: 12, lineHeight: 16, fontWeight: "700", color: palette.textMuted },
    stepLabelActive: { color: palette.text },
    stepDescription: { fontSize: 10, lineHeight: 14, color: palette.textFaint },
    series: { flexDirection: "row", alignItems: "center", gap: 16 },
    tile: tileStyle,
    seriesText: { flex: 1, minWidth: 0 },
    kicker: { ...type.kicker, color: palette.textFaint },
    seriesName: { marginTop: 2, fontSize: 16, lineHeight: 22, fontWeight: "700", color: palette.heading },
})
