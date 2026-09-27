import { useEffect, useRef } from "react"
import { Animated, Easing, StyleSheet, View } from "react-native"
import { palette, radius } from "../theme"
import { cardSurface } from "./EntityCard"

interface SkeletonCardProps {
    /**
     * "card" and "row" are the dashboard's entity card and template row;
     * "list" is the roomier card of the list screens.
     */
    variant?: "card" | "row" | "list"
}

/** A card-shaped placeholder that pulses like the web's `animate-pulse`. */
export function SkeletonCard({ variant = "card" }: SkeletonCardProps) {
    const opacity = useRef(new Animated.Value(1)).current

    useEffect(() => {
        // animate-pulse: 2s, opacity 1 → 0.5 → 1, cubic-bezier(0.4, 0, 0.6, 1).
        const half = (toValue: number) =>
            Animated.timing(opacity, {
                toValue,
                duration: 1000,
                easing: Easing.bezier(0.4, 0, 0.6, 1),
                useNativeDriver: true,
            })
        const loop = Animated.loop(Animated.sequence([half(0.5), half(1)]))
        loop.start()
        return () => loop.stop()
    }, [opacity])

    const list = variant === "list"
    return (
        <Animated.View style={[styles.card, list && styles.listCard, { opacity }]}>
            <View style={styles.head}>
                <View style={[styles.block, variant === "card" ? styles.tile : styles.tileLarge]} />
                <View style={styles.lines}>
                    <View style={[styles.block, styles.kicker]} />
                    <View style={[styles.block, list ? styles.titleLarge : styles.title]} />
                </View>
            </View>
            {variant !== "row" ? <View style={[styles.block, styles.meta]} /> : null}
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    card: cardSurface,
    listCard: { padding: 20, borderRadius: radius.panel },
    head: { flexDirection: "row", alignItems: "center", gap: 12 },
    block: { backgroundColor: palette.borderSoft, borderRadius: 6 },
    tile: { width: 40, height: 40, borderRadius: radius.tile },
    tileLarge: { width: 48, height: 48, borderRadius: radius.tile },
    lines: { flex: 1, gap: 6 },
    kicker: { width: "35%", height: 10 },
    title: { width: "70%", height: 14 },
    titleLarge: { width: "70%", height: 18 },
    meta: { width: "55%", height: 10, marginTop: 16 },
})
