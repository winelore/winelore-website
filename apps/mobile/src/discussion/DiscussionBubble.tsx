import React, { useMemo } from "react"
import { Image, Pressable, StyleSheet, Text, View } from "react-native"
import * as Haptics from "expo-haptics"
import { useTranslation } from "../i18n/LocaleProvider"
import { continuous, palette, radius, type } from "../theme"
import { Icon } from "../ui/Icon"
import type { DiscussionMessage, DiscussionQuote } from "./types"

interface DiscussionBubbleProps {
    message: DiscussionMessage
    isMe: boolean
    authorName: string
    authorRole?: string | null
    authorAvatarUrl?: string | null
    replyToMessage?: DiscussionMessage | null
    replyToAuthorName?: string | null
    onReply: (message: DiscussionMessage, quote?: DiscussionQuote | null) => void
    onPressQuote?: (targetMessageId: string) => void
}

const AVATAR_BG_COLORS = [
    "#f43f5e", // Rose
    "#6366f1", // Indigo
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#8b5cf6", // Violet
]

function getAvatarBgColor(auid: number): string {
    return AVATAR_BG_COLORS[Math.abs(auid) % AVATAR_BG_COLORS.length]
}

function memberInitials(name?: string, auid?: number): string {
    if (name && !name.startsWith("@")) {
        const parts = name.trim().split(/\s+/)
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase()
        }
        return name.slice(0, 2).toUpperCase()
    }
    return String(auid || 0).slice(-2)
}

function formatTime(isoString: string): string {
    try {
        const date = new Date(isoString)
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } catch {
        return ""
    }
}

export function DiscussionBubble({
                                     message,
                                     isMe,
                                     authorName,
                                     authorRole,
                                     authorAvatarUrl,
                                     replyToMessage,
                                     replyToAuthorName,
                                     onReply,
                                     onPressQuote,
                                 }: DiscussionBubbleProps) {
    const { t } = useTranslation()
    const isHead = authorRole === "HEAD"
    const isExpert = authorRole === "EXPERT"
    const formattedTime = useMemo(() => formatTime(message.createdAt), [message.createdAt])
    const primaryAuid = message.authorAuid[0] || 0
    const avatarBg = useMemo(() => getAvatarBgColor(primaryAuid), [primaryAuid])
    const initials = useMemo(() => memberInitials(authorName, primaryAuid), [authorName, primaryAuid])

    const handleLongPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        onReply(message)
    }

    const quotedSnippet = useMemo(() => {
        if (!replyToMessage) return null
        if (
            typeof message.quoteStartIndex === "number" &&
            typeof message.quoteEndIndex === "number" &&
            message.quoteStartIndex >= 0 &&
            message.quoteEndIndex <= replyToMessage.text.length &&
            message.quoteStartIndex < message.quoteEndIndex
        ) {
            return replyToMessage.text.substring(message.quoteStartIndex, message.quoteEndIndex)
        }
        return replyToMessage.text
    }, [replyToMessage, message.quoteStartIndex, message.quoteEndIndex])

    return (
        <View style={[styles.container, isMe ? styles.containerMe : styles.containerOthers]}>
            {/* Author Header Row: Web-Styled Badges */}
            <View style={[styles.headerRow, isMe && styles.headerRowMe]}>
                {!isMe && (
                    <View style={[styles.avatarCircle, { backgroundColor: avatarBg }]}>
                        {authorAvatarUrl ? (
                            <Image source={{ uri: authorAvatarUrl }} style={styles.avatarImage} />
                        ) : (
                            <Text style={styles.avatarInitials}>{initials}</Text>
                        )}
                    </View>
                )}

                <Text style={styles.authorName} numberOfLines={1}>
                    {isMe ? t("discussion.you") || "You" : authorName}
                </Text>

                {/* Head of Commission Crown Badge (Web-Matching) */}
                {isHead ? (
                    <View style={styles.headBadge}>
                        <Icon name="crown" size={10} color="#b45309" />
                        <Text style={styles.headBadgeText}>{t("commission.roleHead") || "Head"}</Text>
                    </View>
                ) : isExpert ? (
                    <View style={styles.expertBadge}>
                        <Text style={styles.expertBadgeText}>{t("commission.roleExpert") || "Expert"}</Text>
                    </View>
                ) : null}
            </View>

            {/* Bubble */}
            <Pressable
                onLongPress={handleLongPress}
                delayLongPress={200}
                style={({ pressed }) => [
                    styles.bubble,
                    isMe ? styles.bubbleMe : styles.bubbleOthers,
                    pressed && styles.bubblePressed,
                ]}
            >
                {/* Quoted Message Top Preview */}
                {replyToMessage && quotedSnippet ? (
                    <Pressable
                        onPress={() => message.replyToMessageId && onPressQuote?.(message.replyToMessageId)}
                        style={[styles.quoteBox, isMe ? styles.quoteBoxMe : styles.quoteBoxOthers]}
                    >
                        <View style={[styles.quoteBar, isMe ? styles.quoteBarMe : styles.quoteBarOthers]} />
                        <View style={styles.quoteContent}>
                            <View style={styles.quoteHeaderRow}>
                                <Text
                                    style={[styles.quoteAuthor, isMe ? styles.quoteAuthorMe : styles.quoteAuthorOthers]}
                                    numberOfLines={1}
                                >
                                    {replyToAuthorName || t("discussion.user") || "User"}
                                </Text>
                            </View>
                            <Text
                                style={[styles.quoteText, isMe ? styles.quoteTextMe : styles.quoteTextOthers]}
                                numberOfLines={2}
                            >
                                “{quotedSnippet}”
                            </Text>
                        </View>
                    </Pressable>
                ) : null}

                {/* Text and Time */}
                <View style={styles.bodyRow}>
                    <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOthers]}>
                        {message.text}
                    </Text>
                    <View style={styles.timeWrapper}>
                        <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOthers]}>
                            {formattedTime}
                        </Text>
                    </View>
                </View>
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        paddingVertical: 3,
        paddingHorizontal: 12,
    },
    containerMe: {
        alignItems: "flex-end",
    },
    containerOthers: {
        alignItems: "flex-start",
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 3,
        paddingHorizontal: 2,
    },
    headerRowMe: {
        flexDirection: "row-reverse",
    },
    avatarCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    avatarImage: {
        width: 18,
        height: 18,
    },
    avatarInitials: {
        color: "#ffffff",
        fontSize: 8,
        fontWeight: "800",
    },
    authorName: {
        ...type.caption,
        fontSize: 11,
        fontWeight: "700",
        color: palette.heading,
    },
    headBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: "#fef3c7", // amber-100
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: "rgba(252, 211, 77, 0.8)", // amber-300
    },
    headBadgeText: {
        fontSize: 9,
        fontWeight: "800",
        color: "#92400e", // amber-800
        textTransform: "uppercase",
        letterSpacing: 0.2,
    },
    expertBadge: {
        backgroundColor: "#f1f5f9", // slate-100
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: "rgba(226, 232, 240, 0.8)", // slate-200
    },
    expertBadgeText: {
        fontSize: 9,
        fontWeight: "700",
        color: "#475569", // slate-600
    },
    bubble: {
        maxWidth: "85%",
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: radius.tile,
        ...continuous,
    },
    bubbleMe: {
        backgroundColor: palette.accent,
        borderBottomRightRadius: 3,
    },
    bubbleOthers: {
        backgroundColor: palette.surface,
        borderBottomLeftRadius: 3,
        borderWidth: 1,
        borderColor: palette.border,
        ...continuous,
    },
    bubblePressed: {
        opacity: 0.9,
        transform: [{ scale: 0.985 }],
    },
    quoteBox: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: radius.sm,
        paddingHorizontal: 8,
        paddingVertical: 5,
        marginBottom: 6,
        overflow: "hidden",
        ...continuous,
    },
    quoteBoxMe: {
        backgroundColor: "rgba(0, 0, 0, 0.16)",
    },
    quoteBoxOthers: {
        backgroundColor: palette.accentSoft,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: palette.accentBorder,
    },
    quoteBar: {
        width: 3,
        alignSelf: "stretch",
        borderRadius: 2,
        marginRight: 8,
    },
    quoteBarMe: {
        backgroundColor: palette.onAccent,
    },
    quoteBarOthers: {
        backgroundColor: palette.accent,
    },
    quoteContent: {
        flex: 1,
    },
    quoteHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginBottom: 1,
    },
    quoteAuthor: {
        fontSize: 10,
        fontWeight: "700",
    },
    quoteAuthorMe: {
        color: palette.onAccent,
    },
    quoteAuthorOthers: {
        color: palette.accent,
    },
    quoteText: {
        fontSize: 11,
        fontStyle: "italic",
    },
    quoteTextMe: {
        color: "rgba(255, 255, 255, 0.92)",
    },
    quoteTextOthers: {
        color: palette.textMuted,
    },
    bodyRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 6,
    },
    messageText: {
        ...type.body,
        fontSize: 14,
        lineHeight: 20,
        flexShrink: 1,
    },
    messageTextMe: {
        color: palette.onAccent,
    },
    messageTextOthers: {
        color: palette.heading,
    },
    timeWrapper: {
        alignSelf: "flex-end",
        marginLeft: "auto",
        paddingLeft: 6,
        paddingTop: 2,
    },
    timeText: {
        fontSize: 10,
        fontWeight: "500",
    },
    timeTextMe: {
        color: palette.accentMuted,
    },
    timeTextOthers: {
        color: palette.textFaint,
    },
})