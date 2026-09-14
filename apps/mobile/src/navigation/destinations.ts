import { useCallback } from "react"
import Constants from "expo-constants"
import { useRouter } from "expo-router"
import * as Haptics from "expo-haptics"
import * as WebBrowser from "expo-web-browser"
import { palette } from "../theme"

const DEFAULT_WEB_ORIGIN = "https://thewinelore.com"

export function getWebOrigin(): string {
    const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined
    return process.env.EXPO_PUBLIC_WEB_ORIGIN || extra?.EXPO_PUBLIC_WEB_ORIGIN || DEFAULT_WEB_ORIGIN
}

/**
 * Where a link goes: a native screen, or — for pages not ported yet — the same
 * page on the website.
 */
export type Destination = { kind: "app"; href: string } | { kind: "web"; path: string }

const app = (href: string): Destination => ({ kind: "app", href })
const web = (path: string): Destination => ({ kind: "web", path })

/**
 * Every place the home screen links to, and whether the app can show it yet.
 *
 * The paths are the web's own, so the web entries open exactly the page a
 * desktop user would reach from the same card. Porting a screen means flipping
 * its entry here from `web` to `app`; nothing that links to it changes.
 */
export const destinations = {
    commission: (id: string, replicaId: string | null) =>
        replicaId ? app(`/commission/${id}/${replicaId}`) : web(`/commission/${id}`),
    competition: (id: string) => web(`/competition/${id}`),
    beverage: (id: string) => web(`/beverage/${id}`),
    template: (id: string, version: number | undefined) =>
        web(`/myTemplates?templateId=${id}-${version || 0}`),

    myCommissions: app("/commissions"),
    myCompetitions: web("/myCompetitions"),
    myBeverages: web("/myBeverages"),
    myTemplates: web("/myTemplates"),
    myOutcomePolicies: web("/myOutcomePolicies"),

    competitions: web("/competitions"),
    beverages: web("/beverages"),
    map: web("/map"),
} as const

/**
 * Open a web page in the in-app browser — SFSafariViewController on iOS, a
 * Custom Tab on Android — tinted to match, so it reads as part of the app
 * rather than a hand-off to Safari or Chrome.
 */
export async function openWebPage(url: string) {
    await WebBrowser.openBrowserAsync(url, {
        controlsColor: palette.accent,
        toolbarColor: palette.surface,
        dismissButtonStyle: "close",
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    })
}

/** Returns a function that follows a `Destination`, with a selection tap. */
export function useOpenDestination() {
    const router = useRouter()
    return useCallback(
        async (destination: Destination) => {
            Haptics.selectionAsync()
            if (destination.kind === "app") {
                router.push(destination.href as never)
            } else {
                await openWebPage(getWebOrigin() + destination.path)
            }
        },
        [router],
    )
}
