import { cookies } from "next/headers"
import { fetchGraphQL } from "@/lib/apiClient" // Перевір шлях
import { GET_WINES } from "./queries"
import MyBeveragesClientView from "./MyBeveragesClientView"

export const dynamic = "force-dynamic"

export default async function MyBeveragesPage() {
    // const cookieStore = cookies()
    // const currentAuidStr = cookieStore.get("auid")?.value
    // const currentAuid = currentAuidStr ? parseInt(currentAuidStr, 10) : 0
    const currentAuid = 1;

    let myBeverages: any[] = [];

    try {
        const response = await fetchGraphQL(GET_WINES, { limit: 500 })
        const allWines = response.wines?.items || []

        if (currentAuid) {
            myBeverages = allWines.filter((wine: any) =>
                wine.producers?.some((producer: any) => producer.auid.includes(currentAuid))
            )
        }
    } catch (error) {
        console.error("Failed to fetch beverages:", error)

        /*myBeverages = [
            {
                id: "bev-mock-1",
                name: "Chateau Margaux 2015",
                status: "APPROVED",
                type: "RED",
                producers: [{ id: "p1", auid: [1], role: "MAKER" }]
            },
            {
                id: "bev-mock-2",
                name: "Dom Perignon Vintage 2012",
                status: "DRAFT",
                type: "SPARKLING",
                producers: [{ id: "p2", auid: [1], role: "OWNER" }]
            },
            {
                id: "bev-mock-3",
                name: "Cloudy Bay Sauvignon Blanc",
                status: "SUSPENDED",
                type: "WHITE",
                producers: [{ id: "p3", auid: [1], role: "DISTRIBUTOR" }]
            }
        ];*/
    }

    return <MyBeveragesClientView initialData={{ beverages: myBeverages }} />
}