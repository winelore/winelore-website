import React, { useCallback, useMemo, useRef } from "react"
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "../i18n/LocaleProvider"
import { continuous, palette, radius, type } from "../theme"
import { Icon } from "../ui/Icon"
import { useAvatarUrls } from "../users/useAvatarUrls"
import { useDisplayNames } from "../users/useDisplayNames"
import { DiscussionBubble } from "./DiscussionBubble"
import { MessageInput } from "./MessageInput"
import { useDiscussion } from "./useDiscussion"
import type { DiscussionMember, DiscussionMessage } from "./types"

export interface DiscussionBottomSheetProps {
    visible: boolean
    replicaCandidateId: string
    candidateCode: string
    beverageName?: string | null
    members?: DiscussionMember[]
    onClose: () => void
}

export function DiscussionBottomSheet({
                                          visible,
                                          replicaCandidateId,
                                          candidateCode,
                                          beverageName,
                                          members: propMembers,
                                          onClose,
                                      }: DiscussionBottomSheetProps) {
    const { t } = useTranslation()
    const insets = useSafeAreaInsets()
    const flatListRef = useRef<FlatList<DiscussionMessage>>(null)

    const {
        messages,
        members: hookMembers,
        currentAuid,
        isLoading,
        isSending,
        replyToMessage,
        replyQuote,
        setReplyToMessage,
        clearReply,
        sendMessage,
    } = useDiscussion({
        replicaCandidateId,
        initialMembers: propMembers,
        enabled: visible,
    })

    const activeMembers = propMembers && propMembers.length > 0 ? propMembers : hookMembers

    const auidStrings = useMemo(() => {
        const set = new Set<string>()
        messages.forEach((m) => {
            m.authorAuid.forEach((id) => set.add(String(id)))
        })
        return Array.from(set)
    }, [messages])

    const displayNames = useDisplayNames(auidStrings)
    const avatarUrls = useAvatarUrls(auidStrings)

    const messagesById = useMemo(() => {
        const map = new Map<string, DiscussionMessage>()
        messages.forEach((m) => map.set(m.id, m))
        return map
    }, [messages])

    const getMemberRole = useCallback(
        (authorAuid: number[]): string | null => {
            const primaryId = authorAuid[0]
            if (primaryId === undefined || !activeMembers.length) return null

            const found = activeMembers.find((mem) => {
                if (Array.isArray(mem.auids)) return mem.auids.map(Number).includes(primaryId)
                if (Array.isArray(mem.auid)) return mem.auid.includes(primaryId)
                return mem.auid === primaryId
            })
            return found?.role ?? null
        },
        [activeMembers],
    )

    const replyAuthorName = useMemo(() => {
        if (!replyToMessage) return null
        const id = String(replyToMessage.authorAuid[0] || "")
        return displayNames[id] || (id ? `@${id}` : null)
    }, [replyToMessage, displayNames])

    const handleScrollToQuote = (targetId: string) => {
        const index = messages.findIndex((m) => m.id === targetId)
        if (index !== -1 && flatListRef.current) {
            flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 })
        }
    }

    const renderItem = useCallback(
        ({ item }: { item: DiscussionMessage }) => {
            const primaryId = String(item.authorAuid[0] || "")
            const quotedMessage = item.replyToMessageId
                ? messagesById.get(item.replyToMessageId) ?? null
                : null
            const quotedAuthorName = quotedMessage
                ? displayNames[String(quotedMessage.authorAuid[0] || "")] || `@${quotedMessage.authorAuid[0]}`
                : null

            const isMe = currentAuid ? item.authorAuid.includes(currentAuid) : false

            return (
                <DiscussionBubble
                    message={item}
                    isMe={isMe}
                    authorName={displayNames[primaryId] || `@${primaryId}`}
                    authorRole={getMemberRole(item.authorAuid)}
                    authorAvatarUrl={avatarUrls[primaryId]}
                    replyToMessage={quotedMessage}
                    replyToAuthorName={quotedAuthorName}
                    onReply={setReplyToMessage}
                    onPressQuote={handleScrollToQuote}
                />
            )
        },
        [displayNames, avatarUrls, messagesById, getMemberRole, setReplyToMessage, currentAuid],
    )

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.sheet, { paddingTop: insets.top ? 6 : 14 }]}>
                {/* Drag Handle */}
                <View style={styles.dragHandle} />

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerTitleGroup}>
                        <Text style={styles.title}>{t("discussion.title") || "Discussion"}</Text>

                        {/* Candidate Code Pill */}
                        <View style={styles.codeBadge}>
                            <Text style={styles.codeText}>{candidateCode}</Text>
                        </View>

                        {/* Beverage Name Badge */}
                        {beverageName && (
                            <View style={styles.beverageBadge}>
                                <Icon name="beverage" size={12} color="#92400e" />
                                <Text style={styles.beverageText} numberOfLines={1}>
                                    {beverageName}
                                </Text>
                            </View>
                        )}
                    </View>

                    <Pressable
                        onPress={onClose}
                        hitSlop={10}
                        style={styles.closeButton}
                        accessibilityLabel={t("common.close") || "Close"}
                    >
                        <Icon name="close" size={20} color={palette.textFaint} />
                    </Pressable>
                </View>

                {/* Message List */}
                {isLoading && messages.length === 0 ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="small" color={palette.accent} />
                        <Text style={styles.loadingText}>
                            {t("discussion.loadingMessages") || "Loading conversation..."}
                        </Text>
                    </View>
                ) : messages.length === 0 ? (
                    <View style={styles.centered}>
                        <View style={styles.emptyIconCircle}>
                            <Icon name="discussion" size={28} color={palette.accent} />
                        </View>
                        <Text style={styles.emptyTitle}>
                            {t("discussion.noMessagesTitle") || "No messages yet"}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {t("discussion.noMessagesDesc") ||
                                "Start the discussion for this wine candidate with other commission experts."}
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        inverted={true}
                        contentContainerStyle={styles.listContent}
                        keyboardShouldPersistTaps="handled"
                    />
                )}

                {/* Input Area */}
                <MessageInput
                    replyTo={replyToMessage}
                    replyQuote={replyQuote}
                    replyToAuthorName={replyAuthorName}
                    onCancelReply={clearReply}
                    onSend={sendMessage}
                    isSending={isSending}
                />
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    sheet: {
        flex: 1,
        backgroundColor: palette.surface,
    },
    dragHandle: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: palette.border,
        alignSelf: "center",
        marginBottom: 8,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: palette.borderSoft,
    },
    headerTitleGroup: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flex: 1,
        minWidth: 0,
        flexWrap: "wrap",
    },
    title: {
        ...type.title,
        fontSize: 16,
        color: palette.heading,
    },
    codeBadge: {
        backgroundColor: palette.accentSoft,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: palette.accentBorder,
    },
    codeText: {
        fontSize: 11,
        fontWeight: "800",
        color: palette.accent,
    },
    beverageBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#fef3c7",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: "rgba(252, 211, 77, 0.7)",
        maxWidth: 140,
    },
    beverageText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#78350f",
    },
    closeButton: {
        padding: 6,
        borderRadius: radius.pill,
        backgroundColor: palette.background,
        marginLeft: 8,
    },
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    },
    loadingText: {
        ...type.caption,
        color: palette.textMuted,
        marginTop: 8,
    },
    emptyIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: palette.accentSoft,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    emptyTitle: {
        ...type.title,
        fontSize: 16,
        color: palette.heading,
        marginBottom: 4,
    },
    emptySubtitle: {
        ...type.caption,
        color: palette.textMuted,
        textAlign: "center",
        maxWidth: 240,
        lineHeight: 18,
    },
    listContent: {
        paddingVertical: 10,
    },
})