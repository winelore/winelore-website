// app/competition/[id]/page.tsx

import { fetchGraphQL } from '@/lib/apiClient';
import { GET_COMPETITION_PAGE } from './queries';
import CompetitionClientView from './CompetitionClientView';
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
            const responseData = data.data || data;
            competition = responseData.competition;
            commissions = responseData.commissionsByCompetition?.items || [];
        } else {
            console.error("Порожня відповідь від GraphQL (data is undefined)");
        }
    } catch (error) {
        console.error("Помилка завантаження змагання:", error);
    }

    if (!competition) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-card-foreground mb-2">
                        Змагання не знайдено
                    </h2>
                    <p className="text-muted-foreground">
                        Перевірте правильність посилання або зверніться до адміністратора.
                    </p>
                </div>
            </div>
        );
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