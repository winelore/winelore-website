import { sdk, fetchGraphQL } from '@/lib/apiClient';
import HomeClientView from './HomeClientView';
import { getBeverageTypesAction, getEvaluationTemplatesAction } from '@/app/templates/actions';
import { cookies } from "next/headers";
import { GET_MY_COMPETITIONS } from "@/app/myCompetitions/queries";
import { GET_COMMISSIONS } from "@/app/queries";

export const dynamic = "force-dynamic"

export default async function HomePage() {
    const cookieStore = await cookies()
    const currentAuidStr = cookieStore.get("auid")?.value
    const currentAuid = currentAuidStr ? parseInt(currentAuidStr, 10) : null;

    let recentCompetitions: any[] = [];
    let myCommissions: any[] = [];
    let recentBeverages: any[] = [];
    let myTemplates: any[] = [];
    let beverageTypesDict: Record<string, string> = {};

    try {
        const typesList = await getBeverageTypesAction();
        beverageTypesDict = typesList.reduce((acc, t) => {
            acc[t.id] = t.code;
            return acc;
        }, {} as Record<string, string>);
    } catch (e) {
        console.error("Failed to load beverage types map:", e);
    }

    if (currentAuid) {
        // 1. Recent Competitions (holders: [currentAuid])
        try {
            const response = await fetchGraphQL(GET_MY_COMPETITIONS, {
                limit: 5,
                filter: { holders: [[currentAuid]] }
            });
            const rawCompetitions = response.competitions?.items || [];
            recentCompetitions = rawCompetitions.map((comp: any) => ({
                id: comp.id,
                name: comp.name,
                status: comp.status,
                description: comp.description || "",
                holder: comp.holders ? comp.holders.flat() : [1],
                plannedStartAt: comp.plannedDates?.start || null,
                plannedEndAt: comp.plannedDates?.end || null,
                startedAt: comp.startedAt || null,
                endedAt: comp.endedAt || null,
                series: {
                    id: comp.series?.id,
                    name: comp.series?.name,
                    status: comp.series?.status
                }
            }));
        } catch (error) {
            console.error("Failed to fetch recent competitions:", error);
        }

        // 2. Active Commissions
        try {
            let allCommissions: any[] = [];
            let currentOffset = 0;
            let hasMore = true;
            
            while (hasMore) {
                const commData = await fetchGraphQL(GET_COMMISSIONS, { limit: 100, offset: currentOffset });
                const items = commData.commissions?.items || [];
                allCommissions = allCommissions.concat(items);
                
                if (items.length < 100) {
                    hasMore = false;
                } else {
                    currentOffset += 100;
                }
            }
            myCommissions = allCommissions.filter((comm: any) => {
                const isMember = comm.replicas?.some((r: any) => 
                    r.members?.some((m: any) => m.auid?.includes(currentAuid))
                );
                const isStatusValid = ["PLANNED", "APPROVED", "STARTED", "IN_PROGRESS"].includes(comm.status);
                return isMember && isStatusValid;
            }).slice(0, 8);
        } catch (error) {
            console.error("Failed to load commissions:", error);
        }

        // 3. Recent Beverages
        try {
            // GetMyBeverages automatically filters to current user beverages in backend
            const bevData = await sdk.GetMyBeverages({ limit: 5 });
            const rawBeverages = bevData.beverages?.items || [];
            recentBeverages = rawBeverages.map((bev: any) => {
                let beverageType = undefined;
                if (bev.attributes) {
                    try {
                        const parsed = JSON.parse(bev.attributes);
                        if (parsed && parsed.color) {
                            beverageType = parsed.color;
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
        }

        // 4. My Templates
        try {
            const templates = await getEvaluationTemplatesAction();
            myTemplates = templates.filter((t: any) => {
                return t.owners?.some((ownerArr: number[]) => ownerArr.includes(currentAuid));
            }).slice(0, 5);
        } catch (error) {
            console.error("Failed to fetch templates:", error);
        }
    }

    return (
        <HomeClientView
            recentCompetitions={recentCompetitions}
            myCommissions={myCommissions}
            recentBeverages={recentBeverages}
            myTemplates={myTemplates}
            beverageTypesMap={beverageTypesDict}
        />
    );
}
