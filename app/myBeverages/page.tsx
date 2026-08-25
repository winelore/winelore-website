export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { fetchGraphQL } from "@/lib/apiClient"
import { getGeographicInfo } from "@/lib/geocoding"
import { GET_MY_BEVERAGES } from "./queries"
import MyBeveragesClientView from "./MyBeveragesClientView"

export default async function MyBeveragesPage({ searchParams, }: { searchParams: Promise<{ page?: string }> }) {
    const resolvedParams = await searchParams;
    const parsedPage = parseInt(resolvedParams.page || "1", 10);
    const currentPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

    const LIMIT = 16;

    const cookieStore = await cookies()
    const currentAuidStr = cookieStore.get("auid")?.value
    if (!currentAuidStr) {
        redirect("/auth/login")
    }
    const currentAuid = parseInt(currentAuidStr, 10);

    let myBeverages: any[] = [];
    let totalCount = 0;
    let hasError = false;

    try {
        const response = await fetchGraphQL(GET_MY_BEVERAGES, {
            limit: LIMIT,
            offset: (currentPage - 1) * LIMIT,
            filter: { producers: [[currentAuid]] },
            producer: [currentAuid]
        });
        const rawBeverages = response.beverages?.items || [];
        totalCount = response.beverageCount || 0;

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
                    if (typeof bev.attributes === "object" && bev.attributes !== null) {
                        colorVal = (bev.attributes as any).color || "WINE";
                    } else if (typeof bev.attributes === "string") {
                        try {
                            const parsed = JSON.parse(bev.attributes);
                            if (parsed && parsed.color) {
                                colorVal = parsed.color;
                            }
                        } catch (e) {
                            const match = bev.attributes.match(/color=([^,\}]+)/);
                            if (match) {
                                colorVal = match[1].trim().replace(/^["']|["']$/g, "");
                            }
                        }
                    }
                }

                return { ...bev, type: colorVal, originParts };
            })
        );
    } catch (error) {
        console.error("Failed to fetch beverages:", error)
        hasError = true;
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

    return (
        <MyBeveragesClientView
            initialData={{ beverages: myBeverages }}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            hasError={hasError}
        />
    )
}
