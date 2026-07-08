import { sdk } from '@/lib/apiClient';
import WineLoreDashboard from './DashboardClientView';

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
    let competitions: any[] = [];
    try {
        const data = await sdk.GetDashboardCompetitions({ limit: 50 });
        competitions = data.competitions?.items || [];
    } catch (error) {
        console.error("Failed to load dashboard competitions:", error);
    }

    if (competitions.length === 0) {
        competitions = [
            {
                id: "11111111-1111-1111-1111-111111111111",
                name: "Червоні вина Бордо 2026 (Резервний режим)",
                status: "PLANNED",
                holders: [[1]],
                plannedDates: {
                    start: new Date().toISOString(),
                    end: new Date(Date.now() + 2 * 3600 * 1000).toISOString()
                },
                startedAt: null,
                endedAt: null,
                series: {
                    id: "33333333-3333-3333-3333-333333333333",
                    name: "Бордо Гран Крю",
                    status: "ACTIVE"
                }
            }
        ];
    }

    // Map backend competitions to the format expected by DashboardClientView
    const mappedCompetitions = competitions.map((comp: any) => ({
        id: comp.id,
        name: comp.name,
        status: comp.status,
        description: comp.description || "", // Fallback as backend doesn't have description
        holder: comp.holders ? comp.holders.flat() : [1],
        plannedStartAt: comp.plannedDates?.start || null,
        plannedEndAt: comp.plannedDates?.end || null,
        startedAt: comp.startedAt || null,
        endedAt: comp.endedAt || null,
        series: {
            id: comp.series?.id || "33333333-3333-3333-3333-333333333333",
            name: comp.series?.name || "Бордо Гран Крю",
            status: comp.series?.status || "ACTIVE"
        }
    }));

    return <WineLoreDashboard initialCompetitions={mappedCompetitions} />;
}
