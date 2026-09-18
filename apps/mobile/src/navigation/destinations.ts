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
 * Where a link goes: a native screen, or a page of the website in the in-app
 * browser. Every page the website links to is now native; the web kind stays
 * for what is the website's by nature.
 */
export type Destination = { kind: "app"; href: string } | { kind: "web"; path: string }

const app = (href: string): Destination => ({ kind: "app", href })

/**
 * Every place the app links to, and whether it can show it natively yet.
 *
 * The paths are the web's own wherever the web has one, so a link means the
 * same thing on both.
 */
export const destinations = {
    /** Opened on the judge's own replica when they sit on one. */
    commission: (id: string, replicaId: string | null) =>
        app(replicaId ? `/commission/${id}/${replicaId}` : `/commission/${id}`),
    tastingSummary: (commissionId: string, replicaId: string) =>
        app(`/commission/${commissionId}/replica/${replicaId}/summary`),
    competition: (id: string) => app(`/competition/${id}`),
    competitionResults: (id: string, commissionId?: string) =>
        app(`/competition/${id}/results${commissionId ? `?commission=${encodeURIComponent(commissionId)}` : ""}`),
    beverage: (id: string) => app(`/beverage/${id}`),
    /**
     * A template from a card. The web opens My Templates with its row
     * expanded; a phone shows the template's own page, on its latest edition.
     */
    template: (id: string, version: number | undefined) => app(`/templates/${id}${version ? `?version=${version}` : ""}`),
    /** A template's own page, at one edition — where the commission page links a template. */
    templateEdition: (id: string, version: number) => app(`/templates/${id}?version=${version}`),
    /** A template's editor — on the web a dialog, which its template page opens at once for `?edit=1`. */
    editTemplate: (id: string) => app(`/templates/${id}/edit`),

    myCommissions: app("/commissions"),
    myCompetitions: app("/myCompetitions"),
    myBeverages: app("/myBeverages"),
    myTemplates: app("/myTemplates"),
    myOutcomePolicies: app("/myOutcomePolicies"),
    /** A policy's editor — the web's edit dialog, at the path of its own page. */
    outcomePolicy: (id: string) => app(`/outcome-policy/${id}`),
    createOutcomePolicy: app("/outcome-policy/new"),

    competitions: app("/competitions"),
    beverages: app("/beverages"),
    map: app("/map"),

    createCompetition: app("/competition/create"),
    createBeverage: app("/beverage/create"),
    /** The template editor on a new template — on the web, My Templates' dialog, open at once for `?create=1`. */
    createTemplate: app("/templates/new"),
    createBatch: (beverageId: string) => app(`/batch/create?beverageId=${beverageId}`),
    createSample: (batchId: string, beverageId: string) => app(`/sample/create?batchId=${batchId}&beverageId=${beverageId}`),
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
