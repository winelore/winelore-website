import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import * as Haptics from "expo-haptics"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAuth } from "../src/auth/AuthProvider"
import { useTranslation } from "../src/i18n/LocaleProvider"
import { brandGradient, palette, radius } from "../src/theme"
import { Icon } from "../src/ui/Icon"
import { LanguagePicker } from "../src/ui/LanguagePicker"
import { PressableSurface } from "../src/ui/Pressable"

/**
 * The signed-out home — the web's `LandingClientView`: the wordmark and a
 * Sign In pill up top, the hero, and one call to action. Both buttons start
 * the same AXUS ID sign-in, as both links do on the web.
 *
 * The language control sits under the hero rather than behind a globe in the
 * header: there is no room for a dropdown there on a phone, and the web's own
 * phone layout moves it into a sheet for the same reason.
 */
export default function WelcomeScreen() {
    const { signIn, error } = useAuth()
    const { t, locale, setLocale } = useTranslation()
    const insets = useSafeAreaInsets()

    const startSignIn = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        await signIn()
    }

    return (
        <View style={styles.screen}>
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <Text style={styles.wordmark}>WineLore</Text>
                <Pressable
                    accessibilityRole="button"
                    onPress={startSignIn}
                    style={({ pressed }) => [styles.signInPill, pressed && styles.pressed]}
                >
                    <Text style={styles.signInPillLabel}>{t("common.signIn")}</Text>
                </Pressable>
            </View>

            <ScrollView
                contentContainerStyle={[styles.hero, { paddingBottom: insets.bottom + 24 }]}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.headline} accessibilityRole="header">
                    {t("landing.heroPrefix")}
                    <Text style={styles.highlight}>{t("landing.heroHighlight")}</Text>
                    {t("landing.heroSuffix")}
                </Text>
                <Text style={styles.subtitle}>{t("landing.subtitle")}</Text>

                <View style={styles.ctaWrap}>
                    <PressableSurface onPress={startSignIn} style={styles.cta}>
                        <Text style={styles.ctaLabel}>{t("landing.getStarted")}</Text>
                        <Icon name="arrow" size={18} color={palette.onAccent} weight="semibold" />
                    </PressableSurface>
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <View style={styles.language}>
                    <LanguagePicker
                        locale={locale}
                        onChange={setLocale}
                        accessibilityLabel={t("common.changeLanguage")}
                    />
                </View>
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: palette.background,
        // The web's two blurred blobs: indigo-200/30 at the left, violet-200/30
        // high on the right.
        experimental_backgroundImage:
            "radial-gradient(circle at 0% 52%, rgba(198, 210, 255, 0.45) 0%, rgba(198, 210, 255, 0) 40%), radial-gradient(circle at 100% 22%, rgba(221, 214, 254, 0.45) 0%, rgba(221, 214, 254, 0) 40%)",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: palette.border,
        backgroundColor: "rgba(255, 255, 255, 0.85)",
    },
    wordmark: { fontSize: 20, fontWeight: "700", letterSpacing: -0.4, color: palette.heading },
    signInPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: radius.pill,
        backgroundColor: palette.accent,
    },
    signInPillLabel: { fontSize: 14, fontWeight: "600", color: palette.onAccent },
    pressed: { opacity: 0.6 },
    hero: {
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingTop: 48,
        gap: 20,
    },
    headline: {
        fontSize: 42,
        lineHeight: 45,
        fontWeight: "800",
        letterSpacing: -1.2,
        color: palette.text,
        textAlign: "center",
    },
    highlight: { color: palette.accent },
    subtitle: {
        fontSize: 17,
        lineHeight: 27,
        color: "#45556c", // slate-600
        textAlign: "center",
        marginBottom: 20,
    },
    // w-full max-w-sm, as the web's phone layout sizes it.
    ctaWrap: { width: "100%", maxWidth: 384 },
    cta: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 16,
        borderRadius: radius.pill,
        experimental_backgroundImage: brandGradient,
        boxShadow: "0 4px 6px -1px rgba(97, 95, 255, 0.12), 0 2px 4px -2px rgba(97, 95, 255, 0.12)",
    },
    ctaLabel: { fontSize: 16, fontWeight: "600", color: palette.onAccent },
    error: { fontSize: 13, color: palette.danger, textAlign: "center" },
    language: { width: "100%", maxWidth: 384, marginTop: 16 },
})
