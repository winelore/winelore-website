import { SymbolView, type SymbolViewProps } from "expo-symbols"
import type { StyleProp, ViewStyle } from "react-native"
import type { StatusGlyph } from "@winelore/core/dashboard"

/**
 * The app's icons, by meaning rather than by name.
 *
 * The web draws lucide icons; here each meaning maps to the platform's own
 * set — SF Symbols on iOS, Material Symbols on Android — so glyphs match the
 * weight and optical size of the system chrome around them. The comment on
 * each entry is the lucide icon the web uses in the same place.
 */
const GLYPHS = {
    home: { ios: "house", android: "home" }, // Home
    competition: { ios: "trophy", android: "trophy" }, // Trophy
    beverage: { ios: "wineglass", android: "wine_bar" }, // Wine
    map: { ios: "map", android: "map" }, // Map
    commission: { ios: "waveform.path.ecg", android: "vital_signs" }, // Activity
    template: { ios: "list.bullet.clipboard", android: "assignment" }, // ClipboardList
    templates: { ios: "checklist", android: "checklist" }, // ListTodo
    outcomePolicy: { ios: "scroll", android: "receipt_long" }, // ScrollText
    series: { ios: "square.3.layers.3d", android: "layers" }, // Layers
    person: { ios: "person", android: "person" }, // User
    personFill: { ios: "person.fill", android: "person" },
    location: { ios: "mappin.and.ellipse", android: "location_on" }, // MapPin
    chevron: { ios: "chevron.right", android: "chevron_right" }, // ChevronRight
    emptyCheck: { ios: "checkmark.circle", android: "check_circle" }, // CheckCircle
    emptyDocument: { ios: "doc.text", android: "description" }, // FileText
    external: { ios: "arrow.up.right.square", android: "open_in_new" }, // ExternalLink
    logOut: { ios: "rectangle.portrait.and.arrow.right", android: "logout" }, // LogOut
    account: { ios: "person.crop.circle", android: "account_circle" }, // CircleUser
    verified: { ios: "checkmark.seal.fill", android: "verified" }, // BadgeCheck
    language: { ios: "globe", android: "language" }, // Globe
    arrow: { ios: "arrow.right", android: "arrow_forward" }, // ArrowRight
    retry: { ios: "arrow.clockwise", android: "refresh" },
    plus: { ios: "plus", android: "add" }, // Plus
    web: { ios: "safari", android: "public" },
    // Status glyphs — see StatusGlyph in @winelore/core/dashboard.
    play: { ios: "play.circle", android: "play_circle" }, // PlayCircle
    check: { ios: "checkmark.circle", android: "check_circle" }, // CheckCircle
    alert: { ios: "exclamationmark.circle", android: "error" }, // AlertCircle
    calendar: { ios: "calendar", android: "calendar_today" }, // Calendar
    tag: { ios: "tag", android: "sell" }, // Tag
} as const satisfies Record<string, Extract<SymbolViewProps["name"], object>> &
    Record<StatusGlyph, Extract<SymbolViewProps["name"], object>>

export type IconName = keyof typeof GLYPHS

interface IconProps {
    name: IconName
    size?: number
    color: string
    /** iOS symbol weight. The web's lucide strokes sit closest to "medium". */
    weight?: "regular" | "medium" | "semibold" | "bold"
    style?: StyleProp<ViewStyle>
}

export function Icon({ name, size = 20, color, weight = "medium", style }: IconProps) {
    return (
        <SymbolView
            name={GLYPHS[name]}
            size={size}
            tintColor={color}
            weight={weight}
            resizeMode="scaleAspectFit"
            style={style}
        />
    )
}
