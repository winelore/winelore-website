import { useRef, useState, type ReactNode } from "react"
import { Animated, Easing, Platform, Pressable, type StyleProp, type ViewStyle } from "react-native"
import { palette, ripple } from "../theme"

interface PressableSurfaceProps {
    onPress?: () => void
    disabled?: boolean
    accessibilityLabel?: string
    accessibilityHint?: string
    /**
     * "scale" for a free-standing card, "highlight" for a row inside a
     * grouped list, which iOS tints rather than shrinks.
     */
    feedback?: "scale" | "highlight"
    /** Applied to the surface itself — background, border, radius, padding. */
    style?: StyleProp<ViewStyle>
    children: ReactNode
}

/** The web's `pressable` curve. */
const EASE_IOS = Easing.bezier(0.32, 0.72, 0, 1)

/**
 * A tappable card or row.
 *
 * On iOS a card settles to 97.5% and back over 200ms on the web's `pressable`
 * curve — which the web copied from iOS in the first place — and a row takes
 * the grouped-list highlight. Android gets the Material ripple for both,
 * clipped to the surface's corners.
 */
export function PressableSurface({
    onPress,
    disabled,
    accessibilityLabel,
    accessibilityHint,
    feedback = "scale",
    style,
    children,
}: PressableSurfaceProps) {
    const [highlighted, setHighlighted] = useState(false)
    const press = useRef(new Animated.Value(0)).current

    if (Platform.OS === "android") {
        return (
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                accessibilityHint={accessibilityHint}
                disabled={disabled}
                onPress={onPress}
                android_ripple={ripple}
                style={[style, { overflow: "hidden" }]}
            >
                {children}
            </Pressable>
        )
    }

    const animateTo = (value: number) =>
        Animated.timing(press, { toValue: value, duration: 200, easing: EASE_IOS, useNativeDriver: true }).start()

    const onPressIn = () => (feedback === "scale" ? animateTo(1) : setHighlighted(true))
    const onPressOut = () => (feedback === "scale" ? animateTo(0) : setHighlighted(false))

    const feedbackStyle =
        feedback === "scale"
            ? {
                  transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.975] }) }],
                  opacity: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }),
              }
            : highlighted
              ? { backgroundColor: palette.borderSoft }
              : null

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            disabled={disabled}
            onPress={onPress}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
        >
            <Animated.View style={[style, feedbackStyle]}>{children}</Animated.View>
        </Pressable>
    )
}
