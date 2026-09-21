import { Platform, StyleSheet, Text, View } from "react-native"
import Constants from "expo-constants"
import { useTranslation } from "../i18n/LocaleProvider"
import { palette, type } from "../theme"
import { Icon } from "../ui/Icon"

/**
 * Whether this build can draw a map. Apple Maps needs nothing; Google Maps
 * crashes the app without an API key, which app.config.ts adds only when one
 * is set at build time.
 */
export const mapAvailable =
    Platform.OS === "ios" ||
    Boolean((Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.googleMapsEnabled)

/** What stands where the map would be in a build without one. */
export function MapUnavailable() {
    const { t } = useTranslation()
    return (
        <View style={styles.box}>
            <Icon name="map" size={28} color={palette.textFaint} />
            <Text style={styles.title}>{t("map.unavailableTitle")}</Text>
            <Text style={styles.body}>{t("map.unavailableDesc")}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    box: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24, backgroundColor: palette.background },
    title: { ...type.title, color: palette.text, textAlign: "center" },
    body: { ...type.body, color: palette.textMuted, textAlign: "center" },
})
