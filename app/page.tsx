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

    const load = async <T,>(label: string, run: () => Promise<T>, fallback: T): Promise<T> => {
        try {
            return await run();
        } catch (error) {
            console.error(`Failed to load ${label}:`, error);
            return fallback;
        }
    };

    // The panels are independent; fetch them together instead of making
    // navigation wait for the sum of five request chains.
    const [beverageTypesDict, recentCompetitions, myCommissions, recentBeverages, myTemplates] = await Promise.all([
        load("beverage types", async () => buildBeverageTypeCodeMap(await getBeverageTypesAction()), {} as Record<string, string>),
        load("recent competitions", async () => {
            const response = await fetchGraphQL(GET_MY_COMPETITIONS, {
                limit: DASHBOARD_PANEL_LIMIT,
                filter: { holders: [[currentAuid]] },
            });
            return (response.competitions?.items || []).map((comp: any) => toDashboardCompetition(comp, currentAuid));
        }, []),
        load("commissions", async () => {
            let allCommissions: any[] = [];
            let currentOffset = 0;
            while (true) {
                const commData: any = await fetchGraphQLRaw(GET_DASHBOARD_COMMISSIONS, {
                    limit: 100,
                    offset: currentOffset,
                });
                const items = commData.commissions?.items || [];
                allCommissions = allCommissions.concat(items);
                const active = selectActiveCommissions(allCommissions, String(currentAuid));
                if (items.length < 100 || active.length >= DASHBOARD_PANEL_LIMIT) return active;
                currentOffset += 100;
            }
        }, []),
        load("beverages", async () => {
            const data = await sdk.GetMyBeverages({
                limit: DASHBOARD_PANEL_LIMIT,
                filter: { producers: [[currentAuid]] },
                producer: [currentAuid],
            });
            return (data.beverages?.items || []).map((beverage) => withBeverageType(beverage));
        }, []),
        load("templates", async () => {
            const result = await getEvaluationTemplatesAction(currentAuid);
            return (result.templates || [])
                .filter((template: any) => isTemplateOwnedBy(template, currentAuid))
                .slice(0, DASHBOARD_PANEL_LIMIT);
        }, []),
    ]);

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
