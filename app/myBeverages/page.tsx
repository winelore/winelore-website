export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { fetchGraphQL } from "@/lib/apiClient"
import { GET_MY_BEVERAGES } from "./queries"
import MyBeveragesClientView from "./MyBeveragesClientView"

export default async function MyBeveragesPage() {
    // const cookieStore = cookies()
    // const currentAuidStr = cookieStore.get("auid")?.value
    // const currentAuid = currentAuidStr ? parseInt(currentAuidStr, 10) : 0
    const currentAuid = 1;

    let myBeverages: any[] = [];

    try {
        const response = await fetchGraphQL(GET_MY_BEVERAGES, {
            filter: { producers: [[currentAuid]] }
        });
        myBeverages = response.wines?.items || [];
    } catch (error) {
        console.error("Failed to fetch beverages:", error)

    }
    return <MyBeveragesClientView initialData={{ beverages: myBeverages }} />
}