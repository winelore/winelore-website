import type { ReactNode } from "react"
import { Platform, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import * as Haptics from "expo-haptics"
import type { MessageKey } from "@winelore/core/i18n"
import { useAuth } from "../src/auth/AuthProvider"
import { getAxusConfig } from "../src/auth/config"
import { useTranslation } from "../src/i18n/LocaleProvider"
import { destinations, openWebPage, useOpenDestination, type Destination } from "../src/navigation/destinations"
import { continuous, palette, radius } from "../src/theme"
import { Avatar } from "../src/ui/Avatar"
import { useAvatarUrls } from "../src/users/useAvatarUrls"
import { Icon, type IconName } from "../src/ui/Icon"
import { LanguagePicker } from "../src/ui/LanguagePicker"
import { PressableSurface } from "../src/ui/Pressable"

/** The web's PERSONAL_LINKS, in the same order. */
const PERSONAL_LINKS: { destination: Destination; labelKey: MessageKey; icon: IconName }[] = [
    { destination: destinations.myCommissions, labelKey: "common.myCommissions", icon: "commission" },
    { destination: destinations.myCompetitions, labelKey: "common.myCompetitions", icon: "competition" },
    { destination: destinations.myBeverages, labelKey: "common.myBeverages", icon: "beverage" },
    { destination: destinations.myTemplates, labelKey: "common.myTemplates", icon: "templates" },
    { destination: destinations.myOutcomePolicies, labelKey: "common.myOutcomePolicies", icon: "outcomePolicy" },
]

const axusAccountUrl = () => `${getAxusConfig().issuer}/account`

/**
 * The profile sheet — the web's `ProfileMenu` on a desk and `MobileProfileSheet`
 * on a phone: who you are, your personal lists, the language, AXUS ID and
 * sign-out. Presented as the system's form sheet, which is glass on iOS 26 and
 * a Material bottom sheet on Android.
 */
export default function ProfileSheet() {
    const { session, signOut } = useAuth()
    const avatarUrls = useAvatarUrls(session ? [session.auid] : [])
    const { t, locale, setLocale } = useTranslation()
    const router = useRouter()
    const open = useOpenDestination()

    const follow = (destination: Destination) => {
        // Close the sheet before a native push, or the new screen lands under it.
        if (destination.kind === "app") router.back()
        open(destination)
    }

    return (
        <View style={styles.sheet}>
            <PressableSurface
                onPress={() => {
                    Haptics.selectionAsync()
                    openWebPage(axusAccountUrl())
                }}
                accessibilityLabel={`${session?.displayName ?? ""}, ${t("common.axusIdProfile")}`}
                style={styles.identity}
            >
                <Avatar
                    size={56}
                    imageUrl={session ? avatarUrls[session.auid] : null}
                    accessibilityLabel={session?.displayName}
                />
                <View style={styles.identityText}>
                    <View style={styles.nameLine}>
                        <Text style={styles.name} numberOfLines={1}>
                            {session?.displayName}
                        </Text>
                        <Icon name="verified" size={18} color={palette.verified} weight="regular" />
                    </View>
                    <Text style={styles.identitySubtitle}>{t("common.axusIdProfile")}</Text>
                </View>
                <Icon name="chevron" size={16} color={palette.textGhost} weight="semibold" />
            </PressableSurface>

            <Group>
                {PERSONAL_LINKS.map(({ destination, labelKey, icon }) => (
                    <Row
                        key={labelKey}
                        label={t(labelKey)}
                        icon={icon}
                        onPress={() => follow(destination)}
                        trailing={<Icon name="chevron" size={16} color={palette.textGhost} weight="semibold" />}
                    />
                ))}
            </Group>

            <View style={styles.languageBlock}>
                <Text style={styles.sectionLabel}>{t("common.language")}</Text>
                <LanguagePicker
                    locale={locale}
                    onChange={(next) => {
                        Haptics.selectionAsync()
                        setLocale(next)
                    }}
                    accessibilityLabel={t("common.changeLanguage")}
                />
            </View>

            <Group>
                <Row
                    label={t("common.axusIdProfile")}
                    icon="account"
                    tone="neutral"
                    onPress={() => openWebPage(axusAccountUrl())}
                    trailing={<Icon name="external" size={16} color={palette.textGhost} />}
                />
                <Row
                    label={t("common.logOut")}
                    icon="logOut"
                    tone="destructive"
                    onPress={async () => {
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
                        // Signing out flips the root to the landing page, which
                        // dismisses this sheet with it.
                        await signOut()
                    }}
                />
            </Group>
        </View>
    )
}

/** An inset-grouped list section, as in iOS Settings and the web's sheet. */
function Group({ children }: { children: ReactNode[] | ReactNode }) {
    const rows = Array.isArray(children) ? children : [children]
    return (
        <View style={styles.group}>
            {rows.map((row, index) => (
                <View key={index}>
                    {index > 0 ? <View style={styles.separator} /> : null}
                    {row}
                </View>
            ))}
        </View>
    )
}

function Row({
    label,
    icon,
    onPress,
    trailing,
    tone = "accent",
}: {
    label: string
    icon: IconName
    onPress: () => void
    trailing?: ReactNode
    tone?: "accent" | "neutral" | "destructive"
}) {
    const tile = {
        accent: { background: palette.accentSoft, border: palette.accentBorder, glyph: palette.accent },
        neutral: { background: palette.surface, border: palette.border, glyph: palette.textMuted },
        destructive: { background: palette.dangerSoft, border: palette.dangerBorder, glyph: palette.danger },
    }[tone]

    return (
        <PressableSurface onPress={onPress} accessibilityLabel={label} feedback="highlight" style={styles.row}>
            <View style={[styles.rowTile, { backgroundColor: tile.background, borderColor: tile.border }]}>
                <Icon name={icon} size={18} color={tile.glyph} />
            </View>
            <Text
                style={[styles.rowLabel, tone === "destructive" && { color: palette.danger }]}
                numberOfLines={1}
            >
                {label}
            </Text>
            {trailing}
        </PressableSurface>
    )
}

const groupSurface = {
    backgroundColor: palette.surface,
    borderRadius: radius.tile,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    overflow: "hidden",
    ...continuous,
} as const

const styles = StyleSheet.create({
    sheet: {
        gap: 20,
        paddingHorizontal: 16,
        // The grabber sits in the top inset on iOS; Android's sheet has none.
        paddingTop: Platform.OS === "ios" ? 28 : 12,
        paddingBottom: Platform.OS === "ios" ? 20 : 28,
    },
    identity: { ...groupSurface, flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
    identityText: { flex: 1, minWidth: 0 },
    nameLine: { flexDirection: "row", alignItems: "center", gap: 6 },
    name: { flexShrink: 1, fontSize: 18, lineHeight: 24, fontWeight: "700", color: palette.text },
    identitySubtitle: { fontSize: 14, lineHeight: 19, color: palette.textMuted },
    group: groupSurface,
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: palette.border, marginLeft: 60 },
    row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 50, paddingHorizontal: 16, paddingVertical: 9 },
    rowTile: {
        width: 32,
        height: 32,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        ...continuous,
    },
    rowLabel: { flex: 1, fontSize: 16, color: palette.heading },
    languageBlock: { gap: 8 },
    sectionLabel: {
        paddingHorizontal: 16,
        fontSize: 13,
        fontWeight: "500",
        letterSpacing: 0.4,
        textTransform: "uppercase",
        color: palette.textMuted,
    },
})
