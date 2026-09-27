import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native"
import { isMemberUser, sortMembersByRole, type CommissionMember } from "@winelore/core/commission"
import { HolderAvatar } from "../competition/parts"
import { useAvatarUrls } from "../users/useAvatarUrls"
import { useTranslation } from "../i18n/LocaleProvider"
import { continuous, palette, radius } from "../theme"
import { Icon } from "../ui/Icon"
import { panelSurface } from "../ui/Surface"

interface TastingPanelCardProps {
    replicaName: string
    members: CommissionMember[]
    readyCount: number
    names: Record<string, string>
    auid: string | null
    /** A holder adds and removes experts while both the commission and replica are drafts. */
    canManage: boolean
    removingId: string | null
    onAdd: () => void
    onRemove: (memberId: string) => void
}

/**
 * The selected replica's judges, the chair first: each with their avatar,
 * name, role and whether they are ready — the room filling up before the
 * tasting starts.
 */
export function TastingPanelCard({
    replicaName,
    members,
    readyCount,
    names,
    auid,
    canManage,
    removingId,
    onAdd,
    onRemove,
}: TastingPanelCardProps) {
    const { t } = useTranslation()
    const avatarUrls = useAvatarUrls(members.flatMap((member) => member.auid.map(String)))

    // Removing someone cannot be taken back, so it asks, as the web does.
    const confirmRemove = (memberId: string) =>
        Alert.alert(t("commission.deleteExpert"), t("commission.confirmDeleteExpert"), [
            { text: t("competition.cancel"), style: "cancel" },
            { text: t("commission.deleteExpert"), style: "destructive", onPress: () => onRemove(memberId) },
        ])

    return (
        <View style={panelSurface}>
            <View style={styles.header}>
                <View style={styles.headerText}>
                    <View style={styles.titleRow}>
                        <Icon name="people" size={20} color={palette.accentBright} />
                        <Text style={styles.title}>{t("commission.tastingPanel", { name: replicaName })}</Text>
                    </View>
                    <Text style={styles.subtitle}>{t("commission.tastingPanelSubtitle")}</Text>
                </View>
                <View style={styles.headerSide}>
                    {canManage ? (
                        <Pressable accessibilityRole="button" onPress={onAdd} style={({ pressed }) => [styles.addButton, pressed && styles.dimmed]}>
                            <Icon name="personAdd" size={14} color={palette.accent} />
                            <Text style={styles.addLabel}>{t("commission.addExpert")}</Text>
                        </Pressable>
                    ) : null}
                    <View style={styles.readyChip}>
                        <Text style={styles.readyChipLabel}>{t("commission.readyCount", { ready: readyCount, total: members.length })}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.list}>
                {sortMembersByRole(members).map((member) => {
                    const me = isMemberUser(member, auid)
                    const primary = member.auid[0] || 0
                    return (
                        <View key={member.id} style={[styles.member, me && styles.memberMe]}>
                            <View>
                                <HolderAvatar
                                    auid={primary}
                                    username={names[String(primary)]}
                                    size={40}
                                    imageUrl={avatarUrls[String(primary)]}
                                />
                                {member.role === "HEAD" ? (
                                    <View style={styles.crown}>
                                        <Icon name="crown" size={9} color={palette.onAccent} weight="bold" />
                                    </View>
                                ) : null}
                            </View>
                            <View style={styles.memberText}>
                                <View style={styles.memberTop}>
                                    <View style={styles.nameRow}>
                                        <Text style={styles.name} numberOfLines={1}>
                                            {member.auid.map((id) => names[String(id)] || String(id)).join(", ")}
                                        </Text>
                                        {me ? (
                                            <View style={styles.you}>
                                                <Text style={styles.youLabel}>{t("common.you")}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    {canManage ? (
                                        <Pressable
                                            accessibilityRole="button"
                                            accessibilityLabel={t("commission.deleteExpert")}
                                            disabled={removingId === member.id}
                                            hitSlop={8}
                                            onPress={() => confirmRemove(member.id)}
                                            style={({ pressed }) => [styles.remove, pressed && styles.removePressed]}
                                        >
                                            {removingId === member.id ? (
                                                <ActivityIndicator size="small" color={palette.danger} />
                                            ) : (
                                                <Icon name="trash" size={14} color={palette.textFaint} />
                                            )}
                                        </Pressable>
                                    ) : null}
                                </View>
                                <View style={styles.memberBottom}>
                                    <RoleBadge role={member.role} />
                                    <View style={styles.readiness}>
                                        <Icon
                                            name={member.isReady ? "check" : "clock"}
                                            size={14}
                                            color={member.isReady ? "#00bc7d" : palette.textGhost}
                                        />
                                        <Text style={[styles.readinessLabel, member.isReady && styles.readinessLabelReady]}>
                                            {member.isReady ? t("commission.statusReady") : t("commission.statusWaiting")}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )
                })}
                {members.length === 0 ? <Text style={styles.empty}>{t("commission.noMembers")}</Text> : null}
            </View>
        </View>
    )
}

const ROLE = {
    HEAD: { background: "rgba(254, 154, 0, 0.1)", border: "rgba(254, 154, 0, 0.15)", color: palette.warning, key: "commission.roleHead" },
    TRAINEE_EXPERT: { background: "rgba(0, 188, 125, 0.1)", border: "rgba(0, 188, 125, 0.15)", color: palette.positive, key: "commission.roleTrainee" },
    EXPERT: { background: "rgba(238, 242, 255, 0.7)", border: palette.accentBorder, color: palette.accent, key: "commission.roleExpert" },
} as const

function RoleBadge({ role }: { role: CommissionMember["role"] }) {
    const { t } = useTranslation()
    const look = ROLE[role] ?? ROLE.EXPERT
    return (
        <View style={[styles.role, { backgroundColor: look.background, borderColor: look.border }]}>
            {role === "HEAD" ? <Icon name="crown" size={11} color={look.color} /> : null}
            {role === "TRAINEE_EXPERT" ? <Icon name="graduation" size={11} color={look.color} /> : null}
            <Text style={[styles.roleLabel, { color: look.color }]}>{t(look.key)}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 20 },
    headerText: { flex: 1, minWidth: 0 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    title: { flexShrink: 1, fontSize: 18, lineHeight: 24, fontWeight: "700", letterSpacing: -0.3, color: palette.heading },
    subtitle: { marginTop: 2, fontSize: 12, color: palette.textFaint },
    headerSide: { alignItems: "flex-end", gap: 8 },
    addButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.md,
        backgroundColor: palette.accentSoft,
    },
    addLabel: { fontSize: 12, fontWeight: "700", color: palette.accent },
    dimmed: { opacity: 0.6 },
    readyChip: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.background,
    },
    readyChipLabel: { fontSize: 12, fontWeight: "600", color: palette.textMuted, fontVariant: ["tabular-nums"] },
    list: { gap: 12 },
    // rounded-xl border p-4; yours in indigo
    member: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 16,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: "rgba(248, 250, 252, 0.3)",
        ...continuous,
    },
    memberMe: { borderColor: palette.accentBorder, backgroundColor: "rgba(238, 242, 255, 0.3)" },
    crown: {
        position: "absolute",
        top: -4,
        right: -4,
        padding: 2,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: palette.surface,
        backgroundColor: "#fe9a00",
    },
    memberText: { flex: 1, minWidth: 0 },
    memberTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    nameRow: { flexShrink: 1, flexDirection: "row", alignItems: "center", gap: 6 },
    name: { flexShrink: 1, fontSize: 14, fontWeight: "600", color: palette.heading },
    you: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 2, backgroundColor: palette.accent },
    youLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.onAccent },
    remove: { padding: 6, borderRadius: 8 },
    removePressed: { backgroundColor: palette.dangerSoft },
    memberBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
    role: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: radius.pill,
        borderWidth: 1,
    },
    roleLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
    readiness: { flexDirection: "row", alignItems: "center", gap: 4 },
    readinessLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.textFaint },
    readinessLabelReady: { color: "#00bc7d" },
    empty: { paddingVertical: 16, fontSize: 14, color: palette.textFaint, textAlign: "center" },
})
