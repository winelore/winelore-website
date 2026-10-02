import React, { useRef, useState } from "react"
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native"
import * as Haptics from "expo-haptics"
import { useTranslation } from "../i18n/LocaleProvider"
import { continuous, palette, radius, type } from "../theme"
import { Icon } from "../ui/Icon"
import type { DiscussionMessage, DiscussionQuote } from "./types"

interface MessageInputProps {
    replyTo: DiscussionMessage | null
    replyQuote?: DiscussionQuote | null
    replyToAuthorName?: string | null
    onCancelReply: () => void
    onSend: (text: string) => Promise<boolean | void> | void
    isSending?: boolean
    disabled?: boolean
}

export function MessageInput({
                                 replyTo,
                                 replyQuote,
                                 replyToAuthorName,
                                 onCancelReply,
                                 onSend,
                                 isSending = false,
                                 disabled = false,
                             }: MessageInputProps) {
    const { t } = useTranslation()
    const [text, setText] = useState("")
    const inputRef = useRef<TextInput>(null)

    const quoteSnippet = replyQuote?.text || replyTo?.text || ""
    const hasText = text.trim().length > 0

    const handleSend = async () => {
        const trimmed = text.trim()
        if (!trimmed || disabled || isSending) return

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        setText("")
        onSend(trimmed)
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
            <View style={styles.container}>
                {/* Reply Banner */}
                {replyTo ? (
                    <View style={styles.replyBanner}>
                        <View style={styles.replyBar} />
                        <View style={styles.replyContent}>
                            <Text style={styles.replyTitle} numberOfLines={1}>
                                {t("discussion.replyingTo") || "Replying to"} {replyToAuthorName || t("discussion.user") || "User"}
                            </Text>
                            <Text style={styles.replySnippet} numberOfLines={1}>
                                {quoteSnippet}
                            </Text>
                        </View>
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                                onCancelReply()
                            }}
                            hitSlop={8}
                            accessibilityLabel={t("common.close") || "Close"}
                            style={styles.closeReplyBtn}
                        >
                            <Icon name="close" size={16} color={palette.textFaint} />
                        </Pressable>
                    </View>
                ) : null}

                {/* Input Row */}
                <View style={styles.inputRow}>
                    <TextInput
                        ref={inputRef}
                        value={text}
                        onChangeText={setText}
                        placeholder={t("discussion.inputPlaceholder") || "Type your comment or note..."}
                        placeholderTextColor={palette.textFaint}
                        multiline
                        maxLength={1000}
                        style={styles.input}
                        accessibilityLabel={t("discussion.inputPlaceholder") || "Discussion input"}
                        editable={!disabled}
                    />

                    <Pressable
                        onPress={handleSend}
                        disabled={!hasText || disabled || isSending}
                        style={({ pressed }) => [
                            styles.sendButton,
                            (!hasText || disabled) && styles.sendButtonDisabled,
                            pressed && styles.sendButtonPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={t("discussion.send") || "Send"}
                    >
                        {isSending ? (
                            <ActivityIndicator size="small" color={palette.onAccent} />
                        ) : (
                            <Icon
                                name="send"
                                size={17}
                                color={hasText && !disabled ? palette.onAccent : palette.textFaint}
                            />
                        )}
                    </Pressable>
                </View>
            </View>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: palette.surface,
        borderTopWidth: 1,
        borderTopColor: palette.borderSoft,
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: Platform.OS === "ios" ? 18 : 12,
    },
    replyBanner: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: palette.accentSoft,
        paddingVertical: 7,
        paddingHorizontal: 10,
        borderRadius: radius.md,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        ...continuous,
    },
    replyBar: {
        width: 3,
        alignSelf: "stretch",
        backgroundColor: palette.accent,
        borderRadius: 2,
        marginRight: 8,
    },
    replyContent: {
        flex: 1,
    },
    replyTitle: {
        ...type.caption,
        fontSize: 11,
        fontWeight: "700",
        color: palette.accent,
    },
    replySnippet: {
        fontSize: 12,
        color: palette.textMuted,
        fontStyle: "italic",
        marginTop: 1,
    },
    closeReplyBtn: {
        padding: 4,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 8,
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 110,
        backgroundColor: palette.background,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.border,
        paddingHorizontal: 14,
        paddingVertical: 10,
        ...type.body,
        fontSize: 14,
        color: palette.heading,
        ...continuous,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: palette.accent,
        alignItems: "center",
        justifyContent: "center",
        ...Platform.select({
            ios: {
                shadowColor: palette.accent,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    sendButtonDisabled: {
        backgroundColor: palette.borderSoft,
        elevation: 0,
        shadowOpacity: 0,
    },
    sendButtonPressed: {
        opacity: 0.82,
        transform: [{ scale: 0.94 }],
    },
})