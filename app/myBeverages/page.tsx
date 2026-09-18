export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { fetchGraphQL } from "@/lib/apiClient"
import { getGeographicInfo } from "@/lib/geocoding"
import { beverageOriginParts } from "@winelore/core"
import { withBeverageType } from "@winelore/core/dashboard"
import { GET_MY_BEVERAGES } from "./queries"
import { getBeverageTypesAction } from "@/app/myTemplates/actions"
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
                const hasOrigin = origin && typeof origin.latitude === "number" && typeof origin.longitude === "number";
                const originParts = hasOrigin
                    ? beverageOriginParts(await getGeographicInfo(origin.latitude, origin.longitude))
                    : [];
                // Shared with the mobile list, including reading an untyped beverage as wine.
                return { ...withBeverageType(bev, "WINE"), originParts };
            })
        );
    } catch (error) {
        console.error("Failed to fetch beverages:", error)
        hasError = true;
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

    // Same type dictionary the other beverage lists use, so the card kicker
    // reads the beverage type rather than the raw colour attribute.
    let beverageTypesDict: Record<string, string> = {};
    try {
        const typesList = await getBeverageTypesAction();
        beverageTypesDict = typesList.reduce((acc, type) => {
            acc[type.id] = type.code;
            return acc;
        }, {} as Record<string, string>);
    } catch (e) {
        console.error("Failed to load beverage types map:", e);
    }

    return (
        <MyBeveragesClientView
            initialData={{ beverages: myBeverages }}
            beverageTypesMap={beverageTypesDict}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            hasError={hasError}
        />
    )
}
