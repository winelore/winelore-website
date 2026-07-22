import { sdk } from '@/lib/apiClient';
import BeveragesClientView from './BeveragesClientView';
import { getBeverageTypesAction } from '@/app/templates/actions';

import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

export default async function DashboardPage({
                                                searchParams,
                                            }: {
    searchParams: Promise<{ cursor?: string; page?: string }>
}) {
    const resolvedParams = await searchParams;
    const cursor = resolvedParams.cursor;
    const currentPage = parseInt(resolvedParams.page || "1", 10);
    const LIMIT = 16;
    
    let allBeverages: any[] | undefined = [];
    let totalCount = 0;
    let nextCursor: string | null = null;

    try {
        const cookieStore = await cookies()
        const currentAuidStr = cookieStore.get("auid")?.value
        const currentAuid = currentAuidStr ? parseInt(currentAuidStr, 10) : undefined;

        const args: any = { limit: LIMIT };
        if (cursor) {
            args.cursor = cursor;
        } else if (currentPage > 1) {
            args.offset = (currentPage - 1) * LIMIT;
        }
        if (currentAuid) {
            args.producer = [currentAuid];
        }

        const bevData = await sdk.GetMyBeverages(args);
        const rawBeverages = bevData.beverages?.items || [];
        totalCount = bevData.beverageCount || 0;

        if (rawBeverages.length > 0) {
            nextCursor = rawBeverages[rawBeverages.length - 1].id;
        }

        allBeverages = rawBeverages.map((bev: any) => {
            let beverageType = undefined;
            if (bev.attributes) {
                try {
                    const parsed = JSON.parse(bev.attributes);
                    if (parsed && parsed.color) {
                        beverageType = parsed.color; // E.g.: "RED", "WHITE"
                    }
                } catch (e) {
                    const match = bev.attributes.match(/color=([^,\}]+)/);
                    if (match) {
                        beverageType = match[1].trim().replace(/^["']|["']$/g, "");
                    }
                }
            }
            return { ...bev, type: beverageType };
        });
    } catch (error) {
        console.error("Failed to load beverages:", error);
        allBeverages = undefined; // undefined indicates an error state to the client
    }
    
    const totalPages = Math.ceil(totalCount / LIMIT);
    let beverageTypesDict: Record<string, string> = {};
    try {
        const typesList = await getBeverageTypesAction();
        beverageTypesDict = typesList.reduce((acc, t) => {
            acc[t.id] = t.code; // Use code (e.g. "WINE") so frontend can translate it
            return acc;
        }, {} as Record<string, string>);
    } catch (e) {
        console.error("Failed to load beverage types map:", e);
    }

    return (
        <BeveragesClientView
            initialBeverages={allBeverages}
            beverageTypesMap={beverageTypesDict}
            nextCursor={nextCursor}
            currentPage={currentPage}
            totalPages={totalPages}
        />
    );
}
