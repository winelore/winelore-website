export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { beverageColor, beverageCreatorAuid, loadBeveragePage, producerAuid } from "@winelore/core/beverage"
import { beverageOriginParts } from "@winelore/core"
import { fetchGraphQLRaw } from "@/lib/apiClient"
import { getGeographicInfo } from "@/lib/geocoding.server"
import { getUsernamesAction } from "@/app/userActions"
import BeverageClientView from "./BeverageClientView"

interface PageProps {
    params: Promise<{
        id: string
    }>
}

type UserInfo = string | { displayName?: string | null; username?: string | null } | undefined

function nameParts(info: UserInfo): { displayName: string | null; username: string | null } {
    if (typeof info === "string") return { displayName: info, username: info }
    if (info && typeof info === "object") return { displayName: info.displayName || null, username: info.username || null }
    return { displayName: null, username: null }
}

export default async function BeveragePage({ params }: PageProps) {
    const resolvedParams = await params
    const beverageId = resolvedParams.id

    const cookieStore = await cookies()
    const auidStr = cookieStore.get("auid")?.value

    if (!auidStr) {
        redirect("/auth/login")
    }
    const currentAuid = parseInt(auidStr, 10)

    try {
        const page = await loadBeveragePage(
            (query, variables) => fetchGraphQLRaw(query, variables),
            beverageId,
            (context, error) => console.error(`Failed to fetch ${context}:`, error),
        )
        if (!page) {
            return <BeverageClientView isNotFound={true} initialData={null} currentAuid={currentAuid} />
        }
        const { beverage } = page

        const creator = beverageCreatorAuid(beverage)
        const producerAuids = (beverage.producers ?? []).map(producerAuid).filter((auid) => auid !== null)
        let producers = (beverage.producers ?? []).map((p) => ({ ...p, displayName: null as string | null, username: null as string | null }))
        let createdByUser = null
        try {
            const uniqueAuids = Array.from(new Set([...(creator !== null ? [creator] : []), ...producerAuids]))
            const usernamesMap = uniqueAuids.length > 0
                ? (await getUsernamesAction(uniqueAuids) as Record<string, UserInfo>)
                : {}

            producers = producers.map((p) => {
                const auid = producerAuid(p)
                return { ...p, ...nameParts(auid !== null ? usernamesMap[String(auid)] : undefined) }
            })
            if (creator !== null) {
                createdByUser = { auid: String(creator), ...nameParts(usernamesMap[String(creator)]) }
            }
        } catch (err) {
            console.error("Failed to fetch producer usernames:", err);
        }

        let originParts: string[] = []
        if (beverage.origin && typeof beverage.origin.latitude === "number" && typeof beverage.origin.longitude === "number") {
            originParts = beverageOriginParts(await getGeographicInfo(beverage.origin.latitude, beverage.origin.longitude))
        }

        const colorVal = beverageColor(beverage.attributes)
        const initialData = {
            beverage: {
                ...beverage,
                producers,
                createdByUser,
                type: colorVal || "WINE", // keep fallback to avoid TS issues
                colorType: colorVal,
                beverageTypeName: page.typeName,
                originParts
            },
            awards: page.awards,
            batches: page.batches
        }

        return <BeverageClientView initialData={initialData as any} currentAuid={currentAuid} />
    } catch (error) {
        console.error("Failed to fetch beverage:", error)
        return <BeverageClientView isError={true} initialData={null} currentAuid={currentAuid} />
    }
}
