import { useCallback, useEffect, useRef, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import * as Haptics from "expo-haptics"
import {
    JUMPER,
    JUMPER_TICK_MS,
    beginJump,
    jumperTick,
    newJumperGame,
    type JumperState,
} from "@winelore/core"
import { useTranslation } from "../i18n/LocaleProvider"
import { continuous, palette, radius, spacing, type } from "../theme"
import { Icon } from "../ui/Icon"

const FIELD_HEIGHT = 256

/**
 * The web's Wine Jumper, on a phone.
 *
 * The rules are core's, so a judge playing while they wait gets the same game
 * either way; only the controls differ — the web listens for the space bar,
 * here the whole field is the button.
 *
 * The loop runs on an interval rather than an animation frame: the game moves
 * in fixed steps and has no interpolation to smooth, and an interval is the
 * one that reliably stops when the screen goes away.
 */
export function WineJumper() {
    const { t } = useTranslation()
    const [game, setGame] = useState<JumperState>(newJumperGame)
    const [isPlaying, setIsPlaying] = useState(false)
    // Read by the loop without restarting it every frame.
    const playing = useRef(false)

    useEffect(() => {
        playing.current = isPlaying
    }, [isPlaying])

    useEffect(() => {
        if (!isPlaying) return
        const timer = setInterval(() => {
            setGame((previous) => {
                const next = jumperTick(previous)
                if (next.isOver && !previous.isOver) {
                    playing.current = false
                    setIsPlaying(false)
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
                }
                return next
            })
        }, JUMPER_TICK_MS)
        return () => clearInterval(timer)
    }, [isPlaying])

    const jump = useCallback(() => {
        if (!playing.current) return
        setGame((previous) => {
            const next = beginJump(previous)
            if (next !== previous) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            return next
        })
    }, [])

    const start = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        setGame(newJumperGame())
        setIsPlaying(true)
    }, [])

    const showMenu = !isPlaying || game.isOver

    return (
        <Pressable accessibilityRole="button" accessibilityLabel={t("commission.wineJumperTapHint")} onPress={jump} style={styles.field}>
            <Text style={styles.score}>{t("commission.wineJumperScore", { score: game.score })}</Text>

            <View style={[styles.grape, { bottom: game.grapeY, left: `${JUMPER.grapeX}%` }]}>
                <Text style={styles.sprite}>🍇</Text>
            </View>
            <View style={[styles.glass, { left: `${game.glassX}%` }]}>
                <Text style={styles.sprite}>🍷</Text>
            </View>
            <View style={styles.ground} />

            {showMenu ? (
                <View style={styles.menu}>
                    {game.isOver ? <Text style={styles.crash}>💥</Text> : null}
                    <Text style={styles.title}>
                        {game.isOver
                            ? t("commission.wineJumperOver", { score: game.score })
                            : t("commission.wineJumperTitle")}
                    </Text>
                    <Pressable
                        accessibilityRole="button"
                        onPress={start}
                        style={({ pressed }) => [styles.start, pressed && styles.pressed]}
                    >
                        <Icon name="play" size={14} color={palette.onAccent} />
                        <Text style={styles.startLabel}>
                            {game.isOver ? t("commission.wineJumperRetry") : t("commission.wineJumperPlay")}
                        </Text>
                    </Pressable>
                    {game.isOver ? null : <Text style={styles.hint}>{t("commission.wineJumperTapHint")}</Text>}
                </View>
            ) : null}
        </Pressable>
    )
}

const styles = StyleSheet.create({
    field: {
        height: FIELD_HEIGHT,
        borderRadius: radius.panel,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: palette.background,
        overflow: "hidden",
        ...continuous,
    },
    score: {
        position: "absolute",
        top: spacing.md,
        right: spacing.lg,
        fontSize: 22,
        fontWeight: "900",
        color: palette.textGhost,
    },
    sprite: { fontSize: 34, lineHeight: 40 },
    grape: { position: "absolute" },
    glass: { position: "absolute", bottom: 0 },
    ground: { position: "absolute", bottom: 0, left: 0, right: 0, height: 2, backgroundColor: palette.accentBorder },
    menu: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: "rgba(255, 255, 255, 0.85)",
    },
    crash: { fontSize: 34 },
    title: { ...type.title, color: palette.heading, textAlign: "center" },
    start: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: palette.accent,
    },
    startLabel: { ...type.body, fontWeight: "700", color: palette.onAccent },
    pressed: { opacity: 0.85 },
    hint: { ...type.caption, color: palette.textFaint },
})
