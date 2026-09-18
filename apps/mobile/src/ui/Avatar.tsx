import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { palette } from "../theme"
import { Icon } from "./Icon"

/**
 * The web's `AvatarPlaceholder`: an indigo → purple → pink wash with a person
 * glyph. AXUS ID has no profile photos yet, so this is everyone's avatar.
 */
export function Avatar({ size, style }: { size: number; style?: StyleProp<ViewStyle> }) {
    return (
        <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }, style]}>
            <Icon name="personFill" size={size / 2} color={palette.accentMuted} weight="regular" />
        </View>
    )
}

const styles = StyleSheet.create({
    avatar: {
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        // from-indigo-200 via-purple-100 to-pink-100
        experimental_backgroundImage: "linear-gradient(to bottom right, #c6d2ff, #f3e8ff, #fce7f3)",
    },
})
