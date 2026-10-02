import React from "react"
import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import * as Haptics from "expo-haptics"
import { useTranslation } from "../i18n/LocaleProvider"
import { continuous, palette, radius, type } from "../theme"
import { Icon } from "../ui/Icon"

interface DiscussionFABProps {
    unreadCount?: number
    onPress: () => void
}

export function DiscussionFAB({ unreadCount = 0, onPress }: DiscussionFABProps) {
    const { t } = useTranslation()

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        onPress()
    }

    return (
        <View style={styles.wrapper} pointerEvents="box-none">
            <Pressable
                onPress={handlePress}
                style={({ pressed }) => [
                    styles.fab,
                    pressed && styles.fabPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={t("discussion.openChat") || "Open Discussion"}
            >
                <View style={styles.iconContainer}>
                    <Icon name="chat" size={24} color={palette.onAccent} />
                </View>

                {unreadCount > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </Text>
                    </View>
                )}
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    wrapper: {
        position: "absolute",
        right: 20,
        bottom: 88, // Pinned above the SubmitBar
        zIndex: 50,
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: palette.accent,
        alignItems: "center",
        justifyContent: "center",
        ...Platform.select({
            ios: {
                shadowColor: palette.accent,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.38,
                shadowRadius: 10,
            },
            android: {
                elevation: 8,
            },
        }),
        ...continuous,
    },
    iconContainer: {
        width: 24,
        height: 24,
        alignItems: "center",
        justifyContent: "center",
        // Micro-adjustment for optical center of message bubble tail
        marginTop: 1,
    },
    fabPressed: {
        opacity: 0.88,
        transform: [{ scale: 0.94 }],
    },
    badge: {
        position: "absolute",
        top: -3,
        right: -3,
        minWidth: 22,
        height: 22,
        paddingHorizontal: 6,
        borderRadius: radius.pill,
        backgroundColor: palette.warning,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2.5,
        borderColor: palette.surface,
    },
    badgeText: {
        ...type.caption,
        fontSize: 10,
        fontWeight: "800",
        color: palette.onAccent,
        textAlign: "center",
    },
})