import { useState } from "react"
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native"
import { Stack, useRouter } from "expo-router"
import * as Haptics from "expo-haptics"
import type { ActiveCommission } from "@winelore/core/dashboard"
import { useCommissions } from "../src/dashboard/useDashboard"
import { useTranslation } from "../src/i18n/LocaleProvider"
import { elevation, palette, radius, spacing, type } from "../src/theme"

/**
 * Every commission the judge is on, whatever its status — their history, not
 * just live work.
 *
 * No pagination: the web pages this list, but it already fetches all of it and
 * slices client-side, so paging is a desktop affordance rather than a data
 * constraint. A phone scrolls.
 */
export default function CommissionsRoute() {
    const { t, tCount } = useTranslation()
    const { state, reload } = useCommissions()
    const [isRefreshing, setIsRefreshing] = useState(false)

    const refresh = async () => {
        setIsRefreshing(true)
        await reload()
        setIsRefreshing(false)
    }

    if (state.status === "loading") {
        return (
            <View style={styles.centered}>
                <ActivityIndicator />
            </View>
        )
    }

    return (
        <>
            <Stack.Screen options={{ title: t("myCommissions.title") }} />
            <FlatList
                style={styles.screen}
                contentContainerStyle={styles.content}
                contentInsetAdjustmentBehavior="automatic"
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
                data={state.status === "ready" ? state.commissions : []}
                keyExtractor={(commission) => commission.id}
                ListHeaderComponent={
                    state.status === "ready" && state.commissions.length > 0 ? (
                        <Text style={styles.count}>
                            {tCount("common.commissionsCount", state.commissions.length)}
                        </Text>
                    ) : null
                }
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyTitle}>
                            {state.status === "error"
                                ? t("myCommissions.errorTitle")
                                : t("myCommissions.emptyTitle")}
                        </Text>
                        <Text style={styles.emptyBody}>
                            {state.status === "error"
                                ? t("myCommissions.errorDescription")
                                : t("myCommissions.emptyDescription")}
                        </Text>
                    </View>
                }
                renderItem={({ item }) => <CommissionRow commission={item} />}
            />
        </>
    )
}

/**
 * A commission row.
 *
 * All of them open the lobby, which then routes on by status: a running
 * session goes to the waiting room, a finished one to its results.
 */
function CommissionRow({ commission }: { commission: ActiveCommission }) {
    const router = useRouter()
    const { t, formatStatus } = useTranslation()
    const canEnter = Boolean(commission.replicaId)

    return (
        <Pressable
            accessibilityRole="button"
            disabled={!canEnter}
            onPress={async () => {
                await Haptics.selectionAsync()
                router.push(`/commission/${commission.id}/${commission.replicaId}`)
            }}
            style={({ pressed }) => [
                styles.card,
                !canEnter && styles.cardInert,
                pressed && canEnter && styles.pressed,
            ]}
        >
            <View style={styles.cardMain}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                    {commission.name}
                </Text>
                {commission.competition?.name ? (
                    <Text style={styles.cardSubtitle} numberOfLines={1}>
                        {commission.competition.name}
                    </Text>
                ) : null}
            </View>
            <View style={styles.cardMeta}>
                <Text style={styles.cardStatus}>{formatStatus(commission.status ?? "")}</Text>
                {commission.isHead ? (
                    <Text style={styles.headBadge}>{t("commission.headOfCommission")}</Text>
                ) : null}
            </View>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xl },
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: palette.background,
    },
    count: { ...type.caption, color: palette.textFaint, marginBottom: spacing.xs },
    emptyBox: { paddingVertical: spacing.xl, gap: spacing.xs },
    emptyTitle: { ...type.title, color: palette.text, textAlign: "center" },
    emptyBody: { ...type.body, color: palette.textFaint, textAlign: "center" },
    card: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: palette.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: palette.border,
        ...elevation(1),
    },
    cardInert: { opacity: 0.55 },
    cardMain: { flex: 1, gap: 2 },
    cardTitle: { ...type.body, fontWeight: "600", color: palette.text },
    cardSubtitle: { ...type.caption, color: palette.textFaint },
    cardMeta: { alignItems: "flex-end", gap: 2 },
    cardStatus: { ...type.caption, color: palette.textMuted, fontWeight: "600" },
    headBadge: { ...type.caption, color: palette.accentText, fontWeight: "700" },
    pressed: { opacity: 0.7 },
})
