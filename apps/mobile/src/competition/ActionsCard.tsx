import { useEffect, useRef } from "react"
import { ActivityIndicator, Animated, StyleSheet, Text, View } from "react-native"
import type { CompetitionPageData } from "@winelore/core/competition"
import { useTranslation } from "../i18n/LocaleProvider"
import { brandGradient, continuous, palette, radius } from "../theme"
import { Icon, type IconName } from "../ui/Icon"
import { PressableSurface } from "../ui/Pressable"
import { panelSurface } from "../ui/Surface"

interface ActionsCardProps {
    page: CompetitionPageData
    isHolder: boolean
    busy: boolean
    onSubmitForReview: () => void
    onStart: () => void
}

/**
 * "Actions & Controls": a holder submits a draft for review and starts a
 * planned competition; anyone else sees that it is waiting to start. Nothing
 * at all for other statuses, as on the web.
 */
export function ActionsCard({ page, isHolder, busy, onSubmitForReview, onStart }: ActionsCardProps) {
    const { t } = useTranslation()

    let body: React.ReactNode = null
    if (page.status === "DRAFT" && isHolder) {
        body = (
            <Action
                title={t("competition.submitReviewTitle")}
                description={t("competition.submitReviewDescription")}
                label={t("competition.submitReviewButton")}
                icon="send"
                busy={busy}
                onPress={onSubmitForReview}
            />
        )
    } else if (page.status === "PLANNED") {
        body = isHolder ? (
            <Action
                title={t("competition.startTitle")}
                description={t("competition.startDescription")}
                label={t("competition.startButton")}
                icon="play"
                busy={busy}
                onPress={onStart}
            />
        ) : (
            <View style={styles.notice}>
                <PulsingDot />
                <View style={styles.noticeText}>
                    <Text style={styles.noticeTitle}>{t("competition.plannedTitle")}</Text>
                    <Text style={styles.description}>{t("competition.plannedDescription")}</Text>
                </View>
            </View>
        )
    }
    if (!body) return null

    return (
        <View style={panelSurface}>
            <Text style={styles.heading}>{t("competition.actionsControls")}</Text>
            {body}
        </View>
    )
}

function Action({
    title,
    description,
    label,
    icon,
    busy,
    onPress,
}: {
    title: string
    description: string
    label: string
    icon: IconName
    busy: boolean
    onPress: () => void
}) {
    return (
        <View style={styles.action}>
            <Text style={styles.actionTitle}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
            <PressableSurface onPress={onPress} disabled={busy} style={[styles.button, busy && styles.buttonBusy]}>
                {busy ? (
                    <ActivityIndicator size="small" color={palette.onAccent} />
                ) : (
                    <Icon name={icon} size={16} color={palette.onAccent} weight="semibold" />
                )}
                <Text style={styles.buttonLabel}>{label}</Text>
            </PressableSurface>
        </View>
    )
}

/** The amber dot that pulses beside "Competition Planned". */
function PulsingDot() {
    const opacity = useRef(new Animated.Value(1)).current
    useEffect(() => {
        const half = (toValue: number) => Animated.timing(opacity, { toValue, duration: 1000, useNativeDriver: true })
        const loop = Animated.loop(Animated.sequence([half(0.5), half(1)]))
        loop.start()
        return () => loop.stop()
    }, [opacity])
    return <Animated.View style={[styles.dot, { opacity }]} />
}

const styles = StyleSheet.create({
    heading: {
        marginBottom: 16,
        fontSize: 14,
        fontWeight: "700",
        letterSpacing: 0.6,
        textTransform: "uppercase",
        color: palette.textFaint,
    },
    // p-5 rounded-2xl bg-indigo-50/30 border-indigo-100/50
    action: {
        padding: 20,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: "rgba(224, 231, 255, 0.5)",
        backgroundColor: "rgba(238, 242, 255, 0.3)",
        ...continuous,
    },
    actionTitle: { fontSize: 14, fontWeight: "700", color: palette.heading },
    description: { marginTop: 4, fontSize: 12, lineHeight: 17, color: palette.textMuted },
    button: {
        marginTop: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: radius.md,
        experimental_backgroundImage: brandGradient,
        boxShadow: "0 10px 15px -3px rgba(97, 95, 255, 0.25), 0 4px 6px -4px rgba(97, 95, 255, 0.25)",
        ...continuous,
    },
    buttonBusy: { opacity: 0.5 },
    buttonLabel: { fontSize: 14, fontWeight: "600", color: palette.onAccent },
    notice: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        padding: 20,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.background,
        ...continuous,
    },
    noticeText: { flex: 1, minWidth: 0 },
    noticeTitle: { fontSize: 12, fontWeight: "700", color: palette.heading },
    dot: { marginTop: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: "#fe9a00" },
})
