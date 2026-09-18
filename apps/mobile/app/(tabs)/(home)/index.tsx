import { useMemo, useRef, useState } from "react"
import {
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
    type LayoutChangeEvent,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
} from "react-native"
import { Stack, useRouter } from "expo-router"
import { useHeaderHeight } from "expo-router/react-navigation"
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
    const headerHeight = useHeaderHeight()
    const titleBottom = useRef(0)
    const [titleShown, setTitleShown] = useState(false)

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
            <Avatar size={36} style={styles.headerAvatar} />
        </Pressable>
    )

    // The bar's own title takes over once the large one has scrolled away.
    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const shown = event.nativeEvent.contentOffset.y + headerHeight > titleBottom.current
        if (shown !== titleShown) setTitleShown(shown)
    }

    return (
        <>
            {Platform.OS === "ios" ? (
                // The App Store and Music put the account on the large title's
                // own row, trailing it, and let both scroll away together. A
                // native large title takes no views beside it, so this one is
                // drawn in the page and the bar keeps only the inline title.
                <Stack.Screen options={{ title: titleShown ? t("common.home") : "", headerLargeTitle: false }} />
            ) : (
                <Stack.Screen options={{ title: t("common.home"), headerRight: () => profileButton }} />
            )}
            <ScrollView
                style={styles.screen}
                contentContainerStyle={styles.content}
                contentInsetAdjustmentBehavior="automatic"
                onScroll={Platform.OS === "ios" ? onScroll : undefined}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={refresh}
                        tintColor={palette.accent}
                        colors={[palette.accent]}
                    />
                }
            >
                {Platform.OS === "ios" ? (
                    <View
                        style={styles.titleRow}
                        onLayout={(event: LayoutChangeEvent) => {
                            const { y, height } = event.nativeEvent.layout
                            titleBottom.current = y + height
                        }}
                    >
                        <Text style={styles.largeTitle} accessibilityRole="header" numberOfLines={1}>
                            {t("common.home")}
                        </Text>
                        {profileButton}
                    </View>
                ) : null}

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
    // UIKit's large title: 34 pt bold, the avatar centred on its line.
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        // The page's gap is for sections; the title sits closer to the first.
        marginBottom: -14,
    },
    largeTitle: { flexShrink: 1, fontSize: 34, lineHeight: 41, fontWeight: "700", letterSpacing: 0.4, color: palette.text },
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
