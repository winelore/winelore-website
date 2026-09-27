import { cookies } from 'next/headers';
import { fetchGraphQLRaw } from '@/lib/apiClient';
import {
    GET_COMPETITION_RESULTS_SCOPE,
    resolveCompetitionResultsScope,
    type CompetitionResultsScopeResponse,
} from '@winelore/core/results';
import CompetitionResultsClientView from './CompetitionResultsClientView';
import ResultsErrorView from './ResultsErrorView';

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
    const auid = cookieStore.get("auid")?.value ?? null;

    let response: CompetitionResultsScopeResponse | null = null;
    try {
        response = await fetchGraphQLRaw<CompetitionResultsScopeResponse, { id: string }>(
            GET_COMPETITION_RESULTS_SCOPE,
            { id: competitionId },
        );
    } catch (error) {
        console.error("[results] Error loading competition data:", error);
    }

    const requestedCommissionId = Array.isArray(resolvedSearchParams.commission)
        ? resolvedSearchParams.commission[0]
        : resolvedSearchParams.commission;

    // Holders see every commission; judges only those whose replica they finished.
    const scope = resolveCompetitionResultsScope(response, auid, requestedCommissionId);

    if (scope.status === "unavailable") {
        return <ResultsErrorView competitionId={competitionId} />;
    }
    if (scope.status === "forbidden") {
        return <ResultsErrorView competitionId={competitionId} variant="forbidden" />;
    }

    return (
        <CompetitionResultsClientView
            initialData={scope.competition}
            initialCommissionId={scope.commissionId}
        />
    );
}
