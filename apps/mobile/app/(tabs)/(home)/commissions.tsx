import { useState } from "react"
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native"
import { Stack } from "expo-router"
import { CommissionCard } from "../../../src/dashboard/cards"
import { useCommissions } from "../../../src/dashboard/useDashboard"
import { useTranslation } from "../../../src/i18n/LocaleProvider"
import { palette, spacing, type } from "../../../src/theme"

/**
 * Every commission the judge is on, whatever its status — their history, not
 * just live work.
 *
 * No pagination: the web pages this list, but it already fetches all of it and
 * slices client-side, so paging is a desktop affordance rather than a data
 * constraint. A phone scrolls.
 *
 * Each row is the home screen's commission card, as the web's list and
 * dashboard share one; all of them open the lobby, which routes on by status.
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
                <ActivityIndicator color={palette.accent} />
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
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={refresh}
                        tintColor={palette.accent}
                        colors={[palette.accent]}
                    />
                }
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
                renderItem={({ item }) => <CommissionCard commission={item} />}
            />
        </>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    content: { padding: 16, gap: 12, paddingBottom: spacing.xl },
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: palette.background,
    },
    count: { ...type.caption, color: palette.textFaint, paddingHorizontal: 4 },
    emptyBox: { paddingVertical: spacing.xl, gap: spacing.xs },
    emptyTitle: { ...type.title, color: palette.text, textAlign: "center" },
    emptyBody: { ...type.body, color: palette.textFaint, textAlign: "center" },
})
