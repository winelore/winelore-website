import { sdk, fetchGraphQL } from '@/lib/apiClient';
import HomeClientView from './HomeClientView';
import { getBeverageTypesAction, getEvaluationTemplatesAction } from '@/app/myTemplates/actions';
import { cookies } from "next/headers";
import { GET_MY_COMPETITIONS } from "@/app/myCompetitions/queries";
import { fetchGraphQLRaw } from '@/lib/apiClient';
import {
    DASHBOARD_PANEL_LIMIT,
    GET_DASHBOARD_COMMISSIONS,
    buildBeverageTypeCodeMap,
    isTemplateOwnedBy,
    selectActiveCommissions,
    toDashboardCompetition,
    withBeverageType,
} from "@winelore/core/dashboard";
import LandingClientView from '@/app/LandingClientView';

export const dynamic = "force-dynamic"

export default async function HomePage() {
    const cookieStore = await cookies();
    const currentAuidStr = cookieStore.get("auid")?.value;
    const currentAuid = currentAuidStr ? parseInt(currentAuidStr, 10) : null;

    if (!currentAuid) {
        return <LandingClientView />;
    }

    let recentCompetitions: any[] = [];
    let myCommissions: any[] = [];
    let recentBeverages: any[] = [];
    let myTemplates: any[] = [];
    let beverageTypesDict: Record<string, string> = {};

    try {
        beverageTypesDict = buildBeverageTypeCodeMap(await getBeverageTypesAction());
    } catch (e) {
        console.error("Failed to load beverage types map:", e);
    }

    // 1. Recent Competitions
    try {
        const response = await fetchGraphQL(GET_MY_COMPETITIONS, {
            limit: DASHBOARD_PANEL_LIMIT,
            filter: { holders: [[currentAuid]] }
        });
        // Shaping is shared with the mobile home screen.
        recentCompetitions = (response.competitions?.items || []).map((comp: any) =>
            toDashboardCompetition(comp, currentAuid)
        );
    } catch (error) {
        console.error("Failed to fetch recent competitions:", error);
    }

    // 2. Active Commissions
    try {
        let allCommissions: any[] = [];
        let currentOffset = 0;
        let hasMore = true;

        while (hasMore) {
            const commData: any = await fetchGraphQLRaw(GET_DASHBOARD_COMMISSIONS, {
                limit: 100,
                offset: currentOffset,
            });
            const items = commData.commissions?.items || [];
            allCommissions = allCommissions.concat(items);

            if (items.length < 100) {
                hasMore = false;
            } else {
                currentOffset += 100;
            }
        }
        // Membership and status filtering is shared with the mobile app, and
        // matches nested auid arrays that a plain `includes` would miss.
        myCommissions = selectActiveCommissions(allCommissions, String(currentAuid));
    } catch (error) {
        console.error("Failed to load commissions:", error);
    }

    // 3. Recent Beverages
    try {
        const bevData = await sdk.GetMyBeverages({
            limit: DASHBOARD_PANEL_LIMIT,
            filter: { producers: [[currentAuid]] },
            producer: [currentAuid]
        });
        recentBeverages = (bevData.beverages?.items || []).map((beverage) => withBeverageType(beverage));
    } catch (error) {
        console.error("Failed to load beverages:", error);
    }

    // 4. My Templates
    try {
        const result = await getEvaluationTemplatesAction(currentAuid);
        const templatesArray = result.templates || [];
        myTemplates = templatesArray
            .filter((t: any) => isTemplateOwnedBy(t, currentAuid))
            .slice(0, DASHBOARD_PANEL_LIMIT);
    } catch (error) {
        console.error("Failed to fetch templates:", error);
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
