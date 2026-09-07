import { sdk } from '@/lib/apiClient';
import CompetitionsClientView from './CompetitionsClientView';

export const dynamic = "force-dynamic"

export default async function DashboardPage({
                                                searchParams,
                                            }: {
    searchParams: Promise<{ page?: string }>
}) {
    const resolvedParams = await searchParams;
    const parsedPage = parseInt(resolvedParams.page || "1", 10);
    const currentPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

    const LIMIT = 16;
    let rawCompetitions: any[] = [];
    let totalCount = 0;
    let hasError = false;

    try {
        const data = await sdk.GetDashboardCompetitions({ limit: LIMIT, offset: (currentPage - 1) * LIMIT });
        rawCompetitions = data.competitions?.items || [];
        totalCount = data.competitionCount || 0;
    } catch (error) {
        console.error("Failed to load dashboard competitions:", error);
        hasError = true;
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

    // Map backend competitions to the format expected by CompetitionsClientView
    const mappedCompetitions = rawCompetitions.map((comp: any) => ({
        id: comp.id,
        name: comp.name,
        status: comp.status,
        description: comp.description || "", // Fallback as backend doesn't have description
        holder: comp.holders ? comp.holders.flat() : [],
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

    return (
        <CompetitionsClientView
            initialCompetitions={mappedCompetitions}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            hasError={hasError}
        />
    );
}
