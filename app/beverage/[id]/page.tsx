export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { fetchGraphQL } from "@/lib/apiClient"
import { getGeographicInfo } from "@/lib/geocoding"
import { getUsernamesAction } from "@/app/userActions"
import { GET_BEVERAGE, GET_BEVERAGE_AWARDS, GET_COMMISSION_FOR_AWARD } from "./queries"
import BeverageClientView from "./BeverageClientView"

interface PageProps {
    params: Promise<{
        id: string
    }>
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

    let beverage: any = null
    let awards: any[] = []
    let awardsWithCompetitionInfo: any[] = []

    try {
        const beverageData = await fetchGraphQL(GET_BEVERAGE as any, { id: beverageId }) as any;
        beverage = beverageData?.beverage;

        if (!beverage) {
            return <BeverageClientView isNotFound={true} initialData={null} currentAuid={currentAuid} />
        }

        // 1. Отримуємо імена користувачів (Task Requirement #1)
        try {
            if (beverage.producers && beverage.producers.length > 0) {
                const auidsToFetch = beverage.producers.map((p: any) => String(p.auid[0]));
                const usernamesMap = await getUsernamesAction(auidsToFetch) as Record<string, any>;

                beverage.producers = beverage.producers.map((p: any) => {
                    const auidStr = String(p.auid[0]);
                    const userInfo = usernamesMap[auidStr];

                    let dName = null;
                    let uName = null;

                    if (typeof userInfo === 'string') {
                        uName = userInfo;
                    } else if (userInfo && typeof userInfo === 'object') {
                        dName = userInfo.displayName || null;
                        uName = userInfo.username || null;
                    }

                    return {
                        ...p,
                        displayName: dName,
                        username: uName
                    };
                });
            }
        } catch (err) {
            console.error("Failed to fetch producer usernames:", err);
        }

        let originParts: string[] = []
        if (beverage.origin && typeof beverage.origin.latitude === "number" && typeof beverage.origin.longitude === "number") {
            const info = await getGeographicInfo(beverage.origin.latitude, beverage.origin.longitude)
            if (info) {
                originParts = [info.country, info.district].filter(Boolean) as string[]
            }
        }

        let colorVal = "WINE"
        if (beverage.attributes) {
            try {
                const parsed = JSON.parse(beverage.attributes)
                if (parsed && parsed.color) {
                    colorVal = parsed.color
                }
            } catch (e) {
                console.error("Failed to parse beverage attributes:", e)
            }
        }

        try {
            const awardsData = await fetchGraphQL(GET_BEVERAGE_AWARDS as any, { id: beverageId }) as any;
            awards = awardsData?.beverageAwards || []

            awardsWithCompetitionInfo = await Promise.all(
                awards.map(async (award: any) => {
                    try {
                        const commissionData = await fetchGraphQL(GET_COMMISSION_FOR_AWARD as any, { id: award.commissionId }) as any;
                        return {
                            ...award,
                            commission: commissionData?.commission
                        }
                    } catch (error) {
                        console.error(`Failed to fetch commission ${award.commissionId}:`, error)
                        return { ...award, commission: null }
                    }
                })
            )
        } catch (error) {
            console.error("Failed to fetch beverage awards:", error)
        }

        const initialData = {
            beverage: {
                ...beverage,
                type: colorVal,
                originParts
            },
            awards: awardsWithCompetitionInfo
        }

        return <BeverageClientView initialData={initialData} currentAuid={currentAuid} />
    } catch (error) {
        console.error("Failed to fetch beverage:", error)
        return <BeverageClientView isError={true} initialData={null} currentAuid={currentAuid} />
    }
}