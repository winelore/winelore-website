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

    // Map backend competitions to the format expected by DashboardClientView
    const mappedCompetitions = competitions.map((comp: any) => ({
        id: comp.id,
        name: comp.name,
        status: comp.status,
        description: "", // Fallback as backend doesn't have description
        holder: comp.holders.flat(),
        plannedStartAt: comp.plannedDates?.start || null,
        plannedEndAt: comp.plannedDates?.end || null,
        startedAt: comp.startedAt || null,
        endedAt: comp.endedAt || null,
        series: {
            id: comp.series.id,
            name: comp.series.name,
            status: comp.series.status
        }
    }));

    return <WineLoreDashboard initialCompetitions={mappedCompetitions} />;
}
