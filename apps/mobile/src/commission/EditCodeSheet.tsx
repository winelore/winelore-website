import { useEffect, useState } from "react"
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import * as Haptics from "expo-haptics"
import { useTranslation } from "../i18n/LocaleProvider"
import { continuous, palette, radius } from "../theme"
import { Icon } from "../ui/Icon"

interface EditCodeSheetProps {
    /** The candidate being recoded, or null when closed. */
    target: { id: string; code: string | null; label: string } | null
    onClose: () => void
    /** Save the code; resolves to an error message, or null once saved. */
    onSave: (candidateId: string, code: string) => Promise<string | null>
}

/** The web's "Change Anonymized Code" dialog: the blind code judges see for a sample. */
export function EditCodeSheet({ target, onClose, onSave }: EditCodeSheetProps) {
    const { t } = useTranslation()
    const [code, setCode] = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!target) return
        setCode(target.code ?? "")
        setError(null)
    }, [target])

    const save = async () => {
        if (!target) return
        setSaving(true)
        const failure = await onSave(target.id, code)
        setSaving(false)
        if (failure) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            setError(failure)
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            onClose()
        }
    }

    return (
        <Modal visible={target !== null} transparent animationType="fade" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
                <View style={styles.dialog}>
                    <View style={styles.header}>
                        <View style={styles.tile}>
                            <Icon name="tag" size={18} color={palette.warning} />
                        </View>
                        <View style={styles.headerText}>
                            <Text style={styles.title}>{t("panels.editCodeModalTitle")}</Text>
                            {target?.label ? (
                                <Text style={styles.subtitle} numberOfLines={1}>
                                    {target.label}
                                </Text>
                            ) : null}
                        </View>
                    </View>
                    <Text style={styles.label}>{t("panels.anonymizedCodeFieldLabel")}</Text>
                    <TextInput
                        value={code}
                        onChangeText={setCode}
                        autoFocus
                        autoCapitalize="characters"
                        autoCorrect={false}
                        returnKeyType="done"
                        onSubmitEditing={save}
                        placeholder={t("panels.anonymizedCodeFieldPlaceholder")}
                        placeholderTextColor={palette.textFaint}
                        style={styles.input}
                    />
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    <View style={styles.actions}>
                        <Pressable accessibilityRole="button" onPress={onClose} disabled={saving} style={({ pressed }) => [styles.cancel, pressed && styles.dimmed]}>
                            <Text style={styles.cancelLabel}>{t("competition.cancel")}</Text>
                        </Pressable>
                        <Pressable accessibilityRole="button" onPress={save} disabled={saving} style={({ pressed }) => [styles.save, (pressed || saving) && styles.dimmed]}>
                            {saving ? (
                                <ActivityIndicator size="small" color={palette.onAccent} />
                            ) : (
                                <Icon name="done" size={14} color={palette.onAccent} weight="bold" />
                            )}
                            <Text style={styles.saveLabel}>{t("common.save")}</Text>
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    )
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(15, 23, 43, 0.4)" },
    dialog: { gap: 12, padding: 24, borderRadius: radius.hero, backgroundColor: palette.surface, ...continuous },
    header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
    tile: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: "#fef3c6",
        backgroundColor: "#fffbeb",
        ...continuous,
    },
    headerText: { flex: 1, minWidth: 0 },
    title: { fontSize: 16, fontWeight: "700", color: palette.heading },
    subtitle: { fontSize: 12, color: palette.textFaint },
    label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.textMuted },
    input: {
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.background,
        fontSize: 15,
        fontWeight: "600",
        color: palette.heading,
    },
    error: { fontSize: 12, fontWeight: "600", color: palette.danger },
    actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 4 },
    cancel: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.md },
    cancelLabel: { fontSize: 13, fontWeight: "600", color: palette.textMuted },
    save: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.md, backgroundColor: palette.accent },
    saveLabel: { fontSize: 13, fontWeight: "700", color: palette.onAccent },
    dimmed: { opacity: 0.5 },
})
