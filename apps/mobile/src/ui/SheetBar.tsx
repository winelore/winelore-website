import { Alert, Pressable, StyleSheet, Text } from "react-native"
import { Stack, useRouter } from "expo-router"
import { useTranslation } from "../i18n/LocaleProvider"
import { palette } from "../theme"
import { Icon } from "./Icon"

/**
 * A form sheet's bar: close on the left, the form's action on the right in
 * the prominent style. With unsaved changes the sheet cannot be swiped away,
 * and closing asks first — a phone is easier to dismiss by accident than a
 * page is to leave.
 */
export function SheetBar({
    title,
    action,
    actionDisabled,
    onAction,
    hasChanges,
}: {
    title: string
    action: string
    actionDisabled?: boolean
    onAction: () => void
    hasChanges: boolean
}) {
    const { t } = useTranslation()
    const router = useRouter()

    const close = () => {
        if (!hasChanges) {
            router.back()
            return
        }
        Alert.alert(title, t("nativeApp.discardChanges"), [
            { text: t("common.cancel"), style: "cancel" },
            { text: t("nativeApp.discard"), style: "destructive", onPress: () => router.back() },
        ])
    }

    return (
        <Stack.Screen
            options={{
                title,
                gestureEnabled: !hasChanges,
                unstable_headerLeftItems: () => [
                    { type: "button", label: t("common.close"), icon: { type: "sfSymbol", name: "xmark" }, onPress: close },
                ],
                unstable_headerRightItems: () => [
                    {
                        type: "button",
                        label: action,
                        variant: "prominent",
                        tintColor: palette.accent,
                        icon: { type: "sfSymbol", name: "checkmark" },
                        disabled: actionDisabled,
                        onPress: onAction,
                    },
                ],
                headerLeft: () => (
                    <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} onPress={close} hitSlop={8} style={styles.action}>
                        <Icon name="close" size={22} color={palette.text} />
                    </Pressable>
                ),
                headerRight: () => (
                    <Pressable accessibilityRole="button" onPress={onAction} disabled={actionDisabled} style={[styles.action, actionDisabled && styles.dimmed]}>
                        <Text style={styles.label}>{action}</Text>
                    </Pressable>
                ),
            }}
        />
    )
}

const styles = StyleSheet.create({
    action: { padding: 8 },
    label: { fontSize: 16, fontWeight: "700", color: palette.accent },
    dimmed: { opacity: 0.4 },
})
