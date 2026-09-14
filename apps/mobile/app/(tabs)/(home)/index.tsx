import { useMemo, useState } from "react"
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import { Stack, useRouter } from "expo-router"
import * as Haptics from "expo-haptics"
import { dashboardUsernameAuids } from "@winelore/core/dashboard"
import { BeverageCard, CommissionCard, CompetitionCard, TemplateCard } from "../../../src/dashboard/cards"
import { DashboardPanel } from "../../../src/dashboard/Panel"
import { useHome } from "../../../src/dashboard/useHome"
import { useTranslation } from "../../../src/i18n/LocaleProvider"
import { destinations, useOpenDestination } from "../../../src/navigation/destinations"
import { cardShadow, continuous, palette, radius } from "../../../src/theme"
import { Avatar } from "../../../src/ui/Avatar"
import { useDisplayNames } from "../../../src/users/useDisplayNames"

/**
 * The home dashboard — the web's `HomeClientView`, section for section: the
 * welcome banner, then active commissions, templates, competitions and
 * beverages, each with its cards, its empty state and "View all".
 *
 * The web lays these out as a bento grid on a desk and as one column on a
 * phone; this is the phone column. The header, tab bar and profile sheet are
 * the platform's own rather than the web's CSS versions of them.
 */
export default function HomeScreen() {
    const { t } = useTranslation()
    const router = useRouter()
    const open = useOpenDestination()
    const { data, reload } = useHome()
    const [isRefreshing, setIsRefreshing] = useState(false)

    const competitions = data.competitions.status === "ready" ? data.competitions.items : []
    const beverages = data.beverages.status === "ready" ? data.beverages.items : []
    const auids = useMemo(() => dashboardUsernameAuids(competitions, beverages), [competitions, beverages])
    const usernames = useDisplayNames(auids)

    const refresh = async () => {
        setIsRefreshing(true)
        await reload()
        setIsRefreshing(false)
    }

    const openProfile = () => {
        Haptics.selectionAsync()
        router.push("/profile")
    }

    const profileButton = (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.profile")}
            onPress={openProfile}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
        >
            <Avatar size={Platform.OS === "ios" ? 34 : 36} style={styles.headerAvatar} />
        </Pressable>
    )

    return (
        <>
            <Stack.Screen
                options={{
                    title: t("common.home"),
                    // iOS 26 would otherwise sit the avatar in a glass capsule;
                    // an account avatar stands on its own, as in the App Store.
                    unstable_headerRightItems: () => [
                        { type: "custom", element: profileButton, hidesSharedBackground: true },
                    ],
                    headerRight: () => profileButton,
                }}
            />
            <ScrollView
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
            >
                <View style={styles.banner}>
                    <Text style={styles.bannerTitle}>{t("dashboard.welcomeTitle")}</Text>
                    <Text style={styles.bannerSubtitle}>{t("dashboard.welcomeSubtitle")}</Text>
                </View>

                <DashboardPanel
                    icon="commission"
                    title={t("dashboard.activeCommissions")}
                    onViewAll={() => open(destinations.myCommissions)}
                    panel={data.commissions}
                    emptyIcon="emptyCheck"
                    emptyLabel={t("dashboard.noActiveCommissions")}
                    onRetry={reload}
                    renderItem={(commission) => <CommissionCard key={commission.id} commission={commission} />}
                />

                <DashboardPanel
                    icon="template"
                    title={t("dashboard.myTemplates")}
                    onViewAll={() => open(destinations.myTemplates)}
                    panel={data.templates}
                    emptyIcon="emptyDocument"
                    emptyLabel={t("dashboard.noTemplates")}
                    onRetry={reload}
                    skeleton="row"
                    renderItem={(template, index) => (
                        <TemplateCard key={`${template.id}-${index}`} template={template} />
                    )}
                />

                <DashboardPanel
                    icon="competition"
                    title={t("dashboard.myCompetitions")}
                    onViewAll={() => open(destinations.myCompetitions)}
                    panel={data.competitions}
                    emptyIcon="competition"
                    emptyLabel={t("dashboard.noRecentCompetitions")}
                    onRetry={reload}
                    renderItem={(competition) => (
                        <CompetitionCard key={competition.id} competition={competition} usernames={usernames} />
                    )}
                />

                <DashboardPanel
                    icon="beverage"
                    title={t("dashboard.myBeverages")}
                    onViewAll={() => open(destinations.myBeverages)}
                    panel={data.beverages}
                    emptyIcon="beverage"
                    emptyLabel={t("dashboard.noRecentBeverages")}
                    onRetry={reload}
                    renderItem={(beverage) => (
                        <BeverageCard
                            key={beverage.id}
                            beverage={beverage}
                            typeMap={data.beverageTypes}
                            usernames={usernames}
                        />
                    )}
                />
            </ScrollView>
        </>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32, gap: 28 },
    pressed: { opacity: 0.6 },
    headerAvatar: {
        borderWidth: 1,
        borderColor: palette.surface,
    },
    banner: {
        overflow: "hidden",
        padding: 20,
        gap: 4,
        borderRadius: radius.hero,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.surface,
        // The web's two blurred blobs (indigo-50 top right, violet-50 low and
        // right of centre), as soft radial washes.
        experimental_backgroundImage:
            "radial-gradient(circle at 95% 0%, rgba(224, 231, 255, 0.85) 0%, rgba(224, 231, 255, 0) 45%), radial-gradient(circle at 62% 130%, rgba(237, 233, 254, 0.9) 0%, rgba(237, 233, 254, 0) 45%)",
        ...cardShadow,
        ...continuous,
    },
    bannerTitle: {
        fontSize: 24,
        lineHeight: 30,
        fontWeight: "800",
        letterSpacing: -0.5,
        color: palette.text,
    },
    bannerSubtitle: { fontSize: 15, lineHeight: 21, fontWeight: "500", color: palette.textMuted },
})
