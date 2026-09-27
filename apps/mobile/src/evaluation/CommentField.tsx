import { Pressable, StyleSheet, Text, View } from "react-native"
import * as Haptics from "expo-haptics"
import { useTranslation } from "../i18n/LocaleProvider"
import { VoiceComment } from "../results/VoiceComment"
import { MONOSPACE, continuous, palette, radius, spacing, type } from "../theme"
import { FormInput } from "../ui/Form"
import { Icon } from "../ui/Icon"
import type { VoiceRecording } from "./useVoiceRecorder"

const clock = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(Math.max(0, seconds) % 60).padStart(2, "0")}`

/**
 * A comment a judge leaves on one property, or on the whole scorecard.
 *
 * The web puts a text box and a record button side by side; on a phone the
 * button sits inside the field's row, because a property's comment has to
 * stay compact enough that a long scorecard is still scrollable.
 *
 * A finished recording is shown with the same player the results screens use,
 * so a judge hears exactly what everyone else will.
 */
export function CommentField({
    value,
    onChangeText,
    recording,
    isRecording,
    elapsedSeconds,
    voiceEnabled,
    placeholder,
    onStartRecording,
    onStopRecording,
    onDiscardRecording,
}: {
    value: string
    onChangeText: (text: string) => void
    recording: VoiceRecording | undefined
    isRecording: boolean
    elapsedSeconds: number
    voiceEnabled: boolean
    placeholder: string
    onStartRecording: () => void
    onStopRecording: () => void
    onDiscardRecording: () => void
}) {
    const { t } = useTranslation()

    return (
        <View style={styles.field}>
            <View style={styles.row}>
                <FormInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    multiline
                    style={styles.input}
                />
                {voiceEnabled ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={isRecording ? t("evaluation.voiceStop") : t("evaluation.voiceRecord")}
                        onPress={() => {
                            Haptics.impactAsync(
                                isRecording ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
                            )
                            if (isRecording) onStopRecording()
                            else onStartRecording()
                        }}
                        style={({ pressed }) => [
                            styles.record,
                            isRecording && styles.recording,
                            pressed && styles.pressed,
                        ]}
                    >
                        <Icon
                            name={isRecording ? "pauseFill" : "microphone"}
                            size={15}
                            color={isRecording ? palette.onAccent : palette.accent}
                        />
                    </Pressable>
                ) : null}
            </View>

            {isRecording ? (
                <View style={styles.status}>
                    <View style={styles.pulse} />
                    <Text style={styles.statusLabel}>{t("evaluation.voiceRecording")}</Text>
                    <Text style={styles.elapsed}>{clock(elapsedSeconds)}</Text>
                </View>
            ) : null}

            {recording && !isRecording ? (
                <View style={styles.playback}>
                    <View style={styles.player}>
                        <VoiceComment url={recording.uri} />
                    </View>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("evaluation.voiceDiscard")}
                        onPress={() => {
                            Haptics.selectionAsync()
                            onDiscardRecording()
                        }}
                        hitSlop={8}
                    >
                        <Icon name="trash" size={15} color={palette.danger} />
                    </Pressable>
                </View>
            ) : null}
        </View>
    )
}

const styles = StyleSheet.create({
    field: { gap: spacing.xs },
    row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs },
    input: { flex: 1, minHeight: 44, paddingTop: 10, fontSize: 13, textAlignVertical: "top" },
    record: {
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: palette.accentSoft,
        ...continuous,
    },
    recording: { borderColor: palette.danger, backgroundColor: palette.danger },
    pressed: { opacity: 0.8 },
    status: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    pulse: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: palette.danger },
    statusLabel: { flex: 1, ...type.caption, fontWeight: "600", color: palette.danger },
    elapsed: { ...type.caption, fontFamily: MONOSPACE, color: palette.textMuted },
    playback: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    player: { flex: 1 },
})
