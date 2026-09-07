// app/competition/[id]/page.tsx

import { fetchGraphQL } from '@/lib/apiClient';
import { GET_COMPETITION_PAGE } from './queries';
import CompetitionClientView from './CompetitionClientView';
import CompetitionNotFound from './CompetitionNotFound';
import { cookies } from 'next/headers';

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function CompetitionStartPage({ params }: PageProps) {
    const resolvedParams = await params;
    const competitionId = resolvedParams.id;

    const cookieStore = await cookies();
    const auidStr = cookieStore.get("auid")?.value;
    const serverAuid = auidStr ? parseInt(auidStr, 10) : null;

    let competition: any = null;
    let commissions: any[] = [];

    try {
        const data = await fetchGraphQL(GET_COMPETITION_PAGE, { id: competitionId });
        // console.log("GraphQL Data:", data);
        if (data) {
            const responseData = (data as any).data || data;
            competition = responseData.competition;
            commissions = responseData.commissionsByCompetition?.items || [];
        } else {
            console.error("Empty GraphQL response (data is undefined)");
        }
    } catch (error) {
        console.error("Failed to load competition:", error);
    }

    if (!competition) {
        return <CompetitionNotFound />;
    }

    const initialData = {
        id: competition.id,
        name: competition.name,
        status: competition.status,
        startedAt: competition.startedAt || null,
        plannedStartAt: competition.plannedDates?.start || null,
        plannedEndAt: competition.plannedDates?.end || null,
        endedAt: competition.endedAt || null,
        series: {
            id: competition.series.id,
            name: competition.series.name,
            status: competition.series.status
        },
        holders: competition.holders.flat(),
        commissions: commissions.map((comm: any) => ({
            id: comm.id,
            name: comm.name,
            status: comm.status,
            plannedStartAt: comm.plannedDates?.start || null,
            plannedEndAt: comm.plannedDates?.end || null,
            startedAt: comm.startedAt || null,
            endedAt: comm.endedAt || null,
            wineJumperMiniGameEnabled: comm.wineJumperMiniGameEnabled || false,
            voiceCommentsEnabled: comm.voiceCommentsEnabled || false,
            propertyCommentsEnabled: comm.propertyCommentsEnabled || false,
            beverageOriginDuringEvaluationEnabled: comm.beverageOriginDuringEvaluationEnabled || false
        }))
    };

    return (
        <CompetitionClientView initialData={initialData} serverAuid={serverAuid} />
    );
}