import { cookies } from 'next/headers';
import { fetchGraphQL, fetchGraphQLRaw } from '@/lib/apiClient';
import { GET_COMPETITION_PAGE } from '../queries';
import CompetitionResultsClientView from './CompetitionResultsClientView';
import ResultsErrorView from './ResultsErrorView';

const GET_COMMISSION_RESULTS_ACCESS = `
  query GetCommissionResultsAccess($id: ID!) {
    commission(id: $id) {
      id
      replicas {
        status
        members {
          auid
        }
      }
    }
  }
`;

function normalizeAuidNumbers(value: unknown): number[] {
    if (Array.isArray(value)) return value.flatMap(normalizeAuidNumbers);
    if (value === null || value === undefined || value === "") return [];
    const parsed = Number(value);
    return Number.isFinite(parsed) ? [parsed] : [];
}

interface PageProps {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<{
        commission?: string | string[];
    }>;
}

export default async function CompetitionResultsPage({ params, searchParams }: PageProps) {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;
    const competitionId = resolvedParams.id;

    const cookieStore = await cookies();
    const auidStr = cookieStore.get("auid")?.value;
    const currentAuid = auidStr ? Number(auidStr) : null;

    let competition: any = null;
    let commissions: any[] = [];

    try {
        const data = await fetchGraphQL(GET_COMPETITION_PAGE, { id: competitionId });
        if (data) {
            const responseData = (data as any).data || data;
            competition = responseData.competition;
            commissions = responseData.commissionsByCompetition?.items || [];
        } else {
            console.error("[results] Empty GraphQL response for competition:", competitionId);
        }
    } catch (error) {
        console.error("[results] Error loading competition data:", error);
    }

    if (!competition) {
        return <ResultsErrorView competitionId={competitionId} />;
    }

    const holderAuids = normalizeAuidNumbers(competition.holders);
    const isHolder = currentAuid !== null && holderAuids.includes(currentAuid);

    if (!isHolder) {
        if (currentAuid === null) {
            return <ResultsErrorView competitionId={competitionId} variant="forbidden" />;
        }

        const accessChecks = await Promise.all(
            commissions.map(async (commission: any) => {
                try {
                    const response = await fetchGraphQLRaw<any, { id: string }>(
                        GET_COMMISSION_RESULTS_ACCESS,
                        { id: commission.id },
                    );
                    const isCompletedReplicaMember = (response?.commission?.replicas || []).some(
                        (replica: any) =>
                            replica.status === "COMPLETED" &&
                            (replica.members || []).some((member: any) =>
                                normalizeAuidNumbers(member.auid).includes(currentAuid),
                            ),
                    );
                    return isCompletedReplicaMember ? commission.id : null;
                } catch (error) {
                    console.error(`[results] Failed to check commission access (${commission.id}):`, error);
                    return null;
                }
            }),
        );
        const accessibleCommissionIds = new Set(accessChecks.filter(Boolean));
        commissions = commissions.filter((commission: any) => accessibleCommissionIds.has(commission.id));

        if (commissions.length === 0) {
            return <ResultsErrorView competitionId={competitionId} variant="forbidden" />;
        }
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
            id: competition.series?.id || "",
            name: competition.series?.name || "Series",
            status: competition.series?.status || "ACTIVE"
        },
        holders: holderAuids,
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

    const requestedCommissionId = Array.isArray(resolvedSearchParams.commission)
        ? resolvedSearchParams.commission[0]
        : resolvedSearchParams.commission;
    const initialCommissionId = commissions.some((commission: any) => commission.id === requestedCommissionId)
        ? requestedCommissionId
        : null;

    return (
        <CompetitionResultsClientView
            initialData={initialData}
            initialCommissionId={initialCommissionId}
        />
    );
}
