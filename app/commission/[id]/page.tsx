import { fetchGraphQL } from '../../../lib/apiClient';
import { GET_COMMISSION, GET_CANDIDATE_COUNT } from './queries';
import CommissionClientView from './CommissionClientView';

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function CommissionStartPage({ params }: PageProps) {
    const resolvedParams = await params;
    const commissionId = resolvedParams.id;

    let commission = null;
    let candidateCount = 0;

    try {
        const [commissionData, countData] = await Promise.all([
            fetchGraphQL(GET_COMMISSION, { id: commissionId }),
            fetchGraphQL(GET_CANDIDATE_COUNT, { commissionId })
        ]);
        commission = commissionData.commission;
        candidateCount = countData.commissionCandidateCount ?? 0;
    } catch (error) {
        console.error("Error loading initial data:", error);
        commission = null;
    }

    if (!commission) {
        return (
            <div className="flex h-screen items-center justify-center bg-background text-white">
                <div className="text-center">
                    <h2 className="text-3xl font-bold mb-2">Commission not found</h2>
                    <p className="text-muted-foreground">Please check the link or contact your administrator.</p>
                </div>
            </div>
        );
    }

    const initialData = {
        id: commission.id,
        name: commission.name,
        status: commission.status,
        plannedStartAt: commission.plannedStartAt || null,
        startedAt: commission.startedAt || null,
        endedAt: commission.endedAt || null,
        competition: {
            id: commission.competition.id,
            name: commission.competition.name,
            holders: commission.competition.holders.flat(),
        },
        candidateCount: candidateCount,
        members: commission.members.map((m) => ({
            id: m.id,
            auid: m.auid.flat(),
            role: m.role,
            isReady: m.isReady,
        }))
    };

    return <CommissionClientView initialData={initialData} />;
}
