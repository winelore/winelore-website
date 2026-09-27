// app/competition/[id]/page.tsx

import { fetchGraphQL } from '@/lib/apiClient';
import { GET_COMPETITION_PAGE } from './queries';
import CompetitionClientView from './CompetitionClientView';
import CompetitionNotFound from './CompetitionNotFound';
import { cookies } from 'next/headers';
import { toCompetitionPage } from '@winelore/core/competition';

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

    const initialData = toCompetitionPage(competition, commissions);

    return (
        <CompetitionClientView initialData={initialData} serverAuid={serverAuid} />
    );
}