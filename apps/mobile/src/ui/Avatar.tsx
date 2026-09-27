import { useState } from "react"
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { palette } from "../theme"
import { Icon } from "./Icon"

/**
 * The web's `AvatarPlaceholder`: an indigo → purple → pink wash with a person
 * glyph, shown until the AXUS ID photo loads — or when the user has none.
 */
export function Avatar({
    size,
    style,
    imageUrl,
    accessibilityLabel,
}: {
    size: number
    style?: StyleProp<ViewStyle>
    /** Absolute AXUS ID avatar download URL; placeholder while missing. */
    imageUrl?: string | null
    accessibilityLabel?: string
}) {
    const [failed, setFailed] = useState(false)

    return (
        <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }, style]}>
            {imageUrl && !failed ? (
                <Image
                    source={{ uri: imageUrl }}
                    style={{ width: size, height: size }}
                    accessibilityLabel={accessibilityLabel}
                    onError={() => setFailed(true)}
                />
            ) : (
                <Icon name="personFill" size={size / 2} color={palette.accentMuted} weight="regular" />
            )}
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
