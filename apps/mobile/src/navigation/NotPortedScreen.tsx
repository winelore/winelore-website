import { ScrollView, StyleSheet, Text, View } from "react-native"
import { Stack } from "expo-router"
import { useTranslation } from "../i18n/LocaleProvider"
import { brandGradient, continuous, palette, radius } from "../theme"
import { Icon, type IconName } from "../ui/Icon"
import { PressableSurface } from "../ui/Pressable"
import { useOpenDestination, type Destination } from "./destinations"

interface NotPortedScreenProps {
    title: string
    icon: IconName
    /** The same page on the website. */
    destination: Destination
}

/**
 * A tab whose page has not been ported yet.
 *
 * The tab exists so the app's navigation matches the web's from the start;
 * until the page itself lands, this says so plainly and offers the website's
 * version, rather than pretending with an empty list.
 */
export function NotPortedScreen({ title, icon, destination }: NotPortedScreenProps) {
    const { t } = useTranslation()
    const open = useOpenDestination()

    return (
        <>
            <Stack.Screen options={{ title }} />
            <ScrollView
                style={styles.screen}
                contentContainerStyle={styles.content}
                contentInsetAdjustmentBehavior="automatic"
            >
                <View style={styles.card}>
                    <View style={styles.tile}>
                        <Icon name={icon} size={30} color={palette.accent} />
                    </View>
                    <Text style={styles.title}>{t("nativeApp.notPortedTitle")}</Text>
                    <Text style={styles.body}>{t("nativeApp.notPortedBody")}</Text>
                    <PressableSurface onPress={() => open(destination)} style={styles.button}>
                        <Text style={styles.buttonLabel}>{t("nativeApp.openOnWeb")}</Text>
                        <Icon name="external" size={16} color={palette.onAccent} weight="semibold" />
                    </PressableSurface>
                </View>
            </ScrollView>
        </>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    content: { padding: 16, paddingTop: 8 },
    card: {
        alignItems: "center",
        gap: 10,
        padding: 28,
        borderRadius: radius.hero,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.surface,
        // The welcome banner's washes, so the placeholder reads as ours.
        experimental_backgroundImage:
            "radial-gradient(circle at 100% 0%, rgba(224, 231, 255, 0.9) 0%, rgba(224, 231, 255, 0) 55%), radial-gradient(circle at 0% 100%, rgba(237, 233, 254, 0.8) 0%, rgba(237, 233, 254, 0) 50%)",
        ...continuous,
    },
    tile: {
        width: 64,
        height: 64,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: palette.accentSoft,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
        ...continuous,
    },
    title: { fontSize: 20, lineHeight: 26, fontWeight: "800", color: palette.text, textAlign: "center" },
    body: { fontSize: 15, lineHeight: 22, color: palette.textMuted, textAlign: "center", maxWidth: 320 },
    button: {
        marginTop: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 22,
        paddingVertical: 13,
        borderRadius: radius.pill,
        experimental_backgroundImage: brandGradient,
    },
    buttonLabel: { fontSize: 16, fontWeight: "600", color: palette.onAccent },
})
