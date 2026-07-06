export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { fetchGraphQL } from "@/lib/apiClient"
import { getGeographicInfo } from "@/lib/geocoding"
import { GET_MY_BEVERAGES } from "./queries"
import MyBeveragesClientView from "./MyBeveragesClientView"

export default async function MyBeveragesPage() {
    const cookieStore = await cookies()
    const currentAuidStr = cookieStore.get("auid")?.value
    if (!currentAuidStr) {
        redirect("/auth/login")
    }
    const currentAuid = parseInt(currentAuidStr, 10);

    let myBeverages: any[] = [];

    try {
        const response = await fetchGraphQL(GET_MY_BEVERAGES, {
            filter: { producers: [[currentAuid]] }
        });
        const rawBeverages = response.beverages?.items || [];

        myBeverages = await Promise.all(
            rawBeverages.map(async (bev: any) => {
                const origin = bev.origin;
                let originParts: string[] = [];
                if (origin && typeof origin.latitude === "number" && typeof origin.longitude === "number") {
                    const info = await getGeographicInfo(origin.latitude, origin.longitude);
                    if (info) {
                        originParts = [info.country, info.district].filter(Boolean) as string[];
                    }
                }
                
                // Parse attributes for color to keep type formatting happy
                let colorVal = "WINE";
                if (bev.attributes) {
                    try {
                        const parsed = JSON.parse(bev.attributes);
                        if (parsed && parsed.color) {
                            colorVal = parsed.color;
                        }
                    } catch (e) {
                        console.error("Failed to parse beverage attributes in myBeverages page.tsx:", e);
                    }
                }

                return { ...bev, type: colorVal, originParts };
            })
        );
    } catch (error) {
        console.error("Failed to fetch beverages:", error)
    }

    return <MyBeveragesClientView initialData={{ beverages: myBeverages }} />
}