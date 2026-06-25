"use server"

import { sdk } from '../../lib/apiClient';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(id: string | null | undefined): boolean {
    if (!id) return false;
    return UUID_REGEX.test(id);
}

export async function startCompetitionAction(id: string) {
    if (!isValidUuid(id)) throw new Error("Invalid UUID parameter");
    try {
        return await sdk.StartCompetition({ id });
    } catch (err: any) {
        console.error("Server Action Error (startCompetitionAction):", err);
        throw new Error(err.message || "Failed to start competition");
    }
}

export async function getCompetitionDataAction(competitionId: string) {
    if (!isValidUuid(competitionId)) return null;
    try {
        const data = await sdk.GetCompetitionPage({ id: competitionId });
        const competition = data.competition;
        if (!competition) return null;
        const commissions = data.commissionsByCompetition?.items || [];

        return {
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
                endedAt: comm.endedAt || null
            }))
        };
    } catch (err: any) {
        console.error("Server Action Error (getCompetitionDataAction):", err);
        throw new Error(err.message || "Failed to fetch competition data");
    }
}

