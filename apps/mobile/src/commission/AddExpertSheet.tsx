import { useEffect, useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import * as Haptics from "expo-haptics"
import { HolderAvatar } from "../competition/parts"
import { useTranslation } from "../i18n/LocaleProvider"
import { continuous, palette, radius } from "../theme"
import { Icon } from "../ui/Icon"
import { PressableSurface } from "../ui/Pressable"
import { Segmented } from "../ui/Segmented"
import { useUserSearch } from "../users/useUserSearch"
import { useAvatarUrls } from "../users/useAvatarUrls"

interface AddExpertSheetProps {
    visible: boolean
    replicaName: string
    onClose: () => void
    /** Add the user; resolves to an error message, or null once added. */
    onAdd: (auid: number, role: "HEAD" | "EXPERT") => Promise<string | null>
}

/**
 * The web's "Add expert" dialog, as a page sheet: find someone by their AXUS
 * ID username, choose expert or chair, add them to the replica.
 */
export function AddExpertSheet({ visible, replicaName, onClose, onAdd }: AddExpertSheetProps) {
    const { t } = useTranslation()
    const [username, setUsername] = useState("")
    const [role, setRole] = useState<"HEAD" | "EXPERT">("EXPERT")
    const [adding, setAdding] = useState(false)
    const [addError, setAddError] = useState<string | null>(null)
    const { searching, error, found } = useUserSearch(username, {
        notFound: t("commission.userNotFound"),
        failed: t("commission.searchError"),
    })
    const avatarUrls = useAvatarUrls(found ? [String(found.auid)] : [])

    // A fresh form each time it opens, as the web's.
    useEffect(() => {
        if (!visible) return
        setUsername("")
        setRole("EXPERT")
        setAddError(null)
    }, [visible])

    const add = async () => {
        if (!found) return
        setAdding(true)
        setAddError(null)
        const failure = await onAdd(found.auid, role)
        setAdding(false)
        if (failure) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            setAddError(failure)
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            onClose()
        }
    }

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={styles.sheet}>
                <View style={styles.header}>
                    <View style={styles.headerTile}>
                        <Icon name="personAdd" size={20} color={palette.accent} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.title}>{t("commission.addExpertToCommission")}</Text>
                        <Text style={styles.subtitle}>
                            {t("commission.replicaLabel")}: <Text style={styles.subtitleStrong}>{replicaName}</Text>
                        </Text>
                    </View>
                    <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} hitSlop={8} onPress={onClose} style={styles.close}>
                        <Icon name="close" size={20} color={palette.textFaint} />
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
                    <View style={styles.field}>
                        <Text style={styles.label}>{t("commission.usernameAxusId")}</Text>
                        <View style={styles.input}>
                            <Text style={styles.at}>@</Text>
                            <TextInput
                                value={username}
                                onChangeText={(text) => {
                                    setUsername(text)
                                    setAddError(null)
                                }}
                                autoFocus
                                placeholder="username"
                                placeholderTextColor={palette.textFaint}
                                autoCapitalize="none"
                                autoCorrect={false}
                                textContentType="username"
                                style={styles.inputText}
                                accessibilityLabel={t("commission.usernameAxusId")}
                            />
                            {searching ? <ActivityIndicator size="small" color={palette.accent} /> : null}
                        </View>
                        {error ? (
                            <View style={styles.error}>
                                <Icon name="alert" size={14} color={palette.danger} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}
                    </View>

                    {found ? (
                        <View style={styles.found}>
                            <View style={styles.foundUser}>
                                <HolderAvatar
                                    auid={found.auid}
                                    username={found.displayName}
                                    size={48}
                                    imageUrl={avatarUrls[String(found.auid)]}
                                />
                                <View style={styles.foundText}>
                                    <Text style={styles.foundName} numberOfLines={1}>
                                        {found.displayName}
                                    </Text>
                                    <Text style={styles.foundUsername}>@{found.username}</Text>
                                </View>
                                <View style={styles.check}>
                                    <Icon name="done" size={14} color={palette.positive} weight="bold" />
                                </View>
                            </View>
                            <View style={styles.roleBlock}>
                                <Text style={styles.label}>{t("commission.roleInCommission")}</Text>
                                <Segmented
                                    options={[
                                        { value: "EXPERT", label: t("commission.roleExpert") },
                                        { value: "HEAD", label: t("commission.roleHead") },
                                    ]}
                                    value={role}
                                    onChange={setRole}
                                    accessibilityLabel={t("commission.roleInCommission")}
                                />
                            </View>
                        </View>
                    ) : null}

                    {addError ? (
                        <View style={styles.error}>
                            <Icon name="alert" size={14} color={palette.danger} />
                            <Text style={styles.errorText}>{addError}</Text>
                        </View>
                    ) : null}

                    <PressableSurface onPress={add} disabled={!found || adding} style={[styles.submit, (!found || adding) && styles.dimmed]}>
                        {adding ? (
                            <ActivityIndicator size="small" color={palette.onAccent} />
                        ) : (
                            <Icon name="personAdd" size={16} color={palette.onAccent} weight="semibold" />
                        )}
                        <Text style={styles.submitLabel}>{t("commission.addExpert")}</Text>
                    </PressableSurface>
                </ScrollView>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    sheet: { flex: 1, backgroundColor: palette.surface },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: palette.borderSoft,
        backgroundColor: "rgba(248, 250, 252, 0.5)",
    },
    headerTile: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: "rgba(224, 231, 255, 0.6)",
        backgroundColor: palette.accentSoft,
        ...continuous,
    },
    headerText: { flex: 1, minWidth: 0 },
    title: { fontSize: 16, fontWeight: "700", color: palette.heading },
    subtitle: { fontSize: 12, color: palette.textFaint },
    subtitleStrong: { fontWeight: "600", color: "#45556c" },
    close: { padding: 8 },
    body: { padding: 24, gap: 20 },
    field: { gap: 8 },
    label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.textMuted },
    input: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.background,
        ...continuous,
    },
    at: { fontSize: 14, fontWeight: "600", color: palette.textFaint },
    inputText: { flex: 1, paddingVertical: 11, fontSize: 14, fontWeight: "500", color: palette.heading },
    error: { flexDirection: "row", alignItems: "center", gap: 6 },
    errorText: { flex: 1, fontSize: 12, fontWeight: "600", color: palette.danger },
    found: {
        gap: 16,
        padding: 16,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: "rgba(238, 242, 255, 0.4)",
        ...continuous,
    },
    foundUser: { flexDirection: "row", alignItems: "center", gap: 14 },
    foundText: { flex: 1, minWidth: 0 },
    foundName: { fontSize: 14, fontWeight: "700", color: palette.heading },
    foundUsername: { fontSize: 12, fontWeight: "600", color: palette.accent },
    check: {
        width: 28,
        height: 28,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#a4f4cf",
        backgroundColor: "#ecfdf5",
    },
    roleBlock: { gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(224, 231, 255, 0.6)" },
    submit: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 12,
        borderRadius: radius.md,
        backgroundColor: palette.accent,
        ...continuous,
    },
    submitLabel: { fontSize: 14, fontWeight: "700", color: palette.onAccent },
    dimmed: { opacity: 0.5 },
})
