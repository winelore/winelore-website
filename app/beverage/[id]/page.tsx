export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { fetchGraphQL } from "@/lib/apiClient"
import { getGeographicInfo } from "@/lib/geocoding"
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
    console.log("=== Beverage page loaded ===");
    console.log("params =", resolvedParams);
    console.log("beverageId =", beverageId);

    const cookieStore = await cookies()
    const auidStr = cookieStore.get("auid")?.value
    console.log("cookies =", cookieStore.getAll());
    console.log("auid =", auidStr);
    if (!auidStr) {
        redirect("/auth/login")
    }
    const currentAuid = parseInt(auidStr, 10)

    let beverage: any = null
    let awards: any[] = []
    let awardsWithCompetitionInfo: any[] = []

    try {
        // Fetch beverage details
        const beverageData = await fetchGraphQL(GET_BEVERAGE, { id: beverageId })
        console.log("beverageData =", JSON.stringify(beverageData, null, 2));
        beverage = beverageData.beverage

        if (!beverage) {
            return (
                <div className="flex h-screen items-center justify-center bg-slate-50/50">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-800 mb-2">
                            Beverage not found
                        </h2>
                        <p className="text-slate-500">
                            Please check the URL or contact support.
                        </p>
                    </div>
                </div>
            )
        }

        // Get geographic info for origin
        let originParts: string[] = []
        if (beverage.origin && typeof beverage.origin.latitude === "number" && typeof beverage.origin.longitude === "number") {
            const info = await getGeographicInfo(beverage.origin.latitude, beverage.origin.longitude)
            if (info) {
                originParts = [info.country, info.district].filter(Boolean) as string[]
            }
        }

        // Parse attributes for color
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

        // Fetch beverage awards
        try {
            const awardsData = await fetchGraphQL(GET_BEVERAGE_AWARDS, { id: beverageId })
            awards = awardsData.beverageAwards || []

            // Fetch competition info for each award
            awardsWithCompetitionInfo = await Promise.all(
                awards.map(async (award: any) => {
                    try {
                        const commissionData = await fetchGraphQL(GET_COMMISSION_FOR_AWARD, { id: award.commissionId })
                        return {
                            ...award,
                            commission: commissionData.commission
                        }
                    } catch (error) {
                        console.error(`Failed to fetch commission ${award.commissionId}:`, error)
                        return {
                            ...award,
                            commission: null
                        }
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
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50/50">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-800 mb-2">
                        Error loading beverage
                    </h2>
                    <p className="text-slate-500">
                        Please try again later.
                    </p>
                </div>
            </div>
        )
    }
}
