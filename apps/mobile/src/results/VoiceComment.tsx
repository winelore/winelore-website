import { useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio"
import * as Haptics from "expo-haptics"
import { useTranslation } from "../i18n/LocaleProvider"
import { palette, radius } from "../theme"
import { Icon } from "../ui/Icon"

const clock = (seconds: number) => {
    const whole = Math.max(0, Math.floor(seconds || 0))
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`
}

/**
 * A judge's voice comment — the web's `<audio controls>`. A list can hold
 * many, so the player is only made once one is played.
 */
export function VoiceComment({ url }: { url: string }) {
    const { t } = useTranslation()
    const [started, setStarted] = useState(false)
    if (started) return <Player url={url} />
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("commission.results.playVoiceComment")}
            onPress={() => {
                Haptics.selectionAsync()
                setStarted(true)
            }}
            style={styles.bar}
        >
            <PlayGlyph playing={false} />
            <View style={styles.track} />
            <Text style={styles.time}>0:00</Text>
        </Pressable>
    )
}

function Player({ url }: { url: string }) {
    const { t } = useTranslation()
    const player = useAudioPlayer(url)
    const status = useAudioPlayerStatus(player)

    useEffect(() => {
        // Heard with the ringer switched off, as a video would be.
        setAudioModeAsync({ playsInSilentMode: true }).finally(() => player.play())
    }, [player])

    useEffect(() => {
        if (status.didJustFinish) {
            player.pause()
            player.seekTo(0)
        }
    }, [status.didJustFinish, player])

    const toggle = () => {
        Haptics.selectionAsync()
        if (status.playing) player.pause()
        else player.play()
    }
    const progress = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(status.playing ? "commission.results.pauseVoiceComment" : "commission.results.playVoiceComment")}
            onPress={toggle}
            style={styles.bar}
        >
            <PlayGlyph playing={status.playing} />
            <View style={styles.track}>
                <View style={[styles.fill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.time}>
                {clock(status.currentTime)}
                {status.duration > 0 ? ` / ${clock(status.duration)}` : ""}
            </Text>
        </Pressable>
    )
}

function PlayGlyph({ playing }: { playing: boolean }) {
    return (
        <View style={styles.button}>
            <Icon name={playing ? "pauseFill" : "playFill"} size={12} color={palette.onAccent} weight="bold" />
        </View>
    )
}

const styles = StyleSheet.create({
    bar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        maxWidth: 320,
        marginTop: 4,
        paddingVertical: 6,
        paddingLeft: 6,
        paddingRight: 12,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.background,
    },
    button: {
        width: 26,
        height: 26,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 13,
        backgroundColor: palette.accent,
    },
    track: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden", backgroundColor: palette.border },
    fill: { height: "100%", backgroundColor: palette.accent },
    time: { fontSize: 11, fontWeight: "600", color: palette.textMuted, fontVariant: ["tabular-nums"] },
})
