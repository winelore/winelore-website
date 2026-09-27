import { cardShadow, continuous, palette, radius } from "../theme"

/**
 * A page section — the web's `bg-white border border-slate-100
 * rounded-[24px] p-5 shadow-sm`, as its detail pages draw every block on a
 * phone.
 */
export const panelSurface = {
    backgroundColor: palette.surface,
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    padding: 20,
    ...cardShadow,
    ...continuous,
} as const
