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
                endedAt: comm.endedAt || null,
                wineJumperMiniGameEnabled: comm.wineJumperMiniGameEnabled || false,
                voiceCommentsEnabled: comm.voiceCommentsEnabled || false,
                propertyCommentsEnabled: comm.propertyCommentsEnabled || false,
                beverageOriginDuringEvaluationEnabled: comm.beverageOriginDuringEvaluationEnabled || false
            }))
        };
    } catch (err: any) {
        console.error("Server Action Error (getCompetitionDataAction):", err);
        throw new Error(err.message || "Failed to fetch competition data");
    }
}

export async function updateCompetitionSettingsAction(
    competitionId: string,
    plannedStartDate: string | null,
    plannedEndDate: string | null,
    commissions: {
        id: string;
        plannedStartDate: string | null;
        plannedEndDate: string | null;
        wineJumperMiniGameEnabled: boolean;
        voiceCommentsEnabled: boolean;
        propertyCommentsEnabled: boolean;
        beverageOriginDuringEvaluationEnabled: boolean;
    }[]
) {
    if (!isValidUuid(competitionId)) throw new Error("Invalid UUID parameter");

    const executeMutation = async (query: string, variables: any) => {
        const response = await fetch('http://hayabusa.proxy.rlwy.net:21675/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables }),
            cache: 'no-store'
        });
        const json = await response.json();
        if (json.errors && json.errors.length > 0) {
            throw new Error(json.errors[0].message);
        }
        return json.data;
    };

    try {
        // 1. Update competition dates
        const updateCompetitionDatesMutation = `
            mutation UpdateCompetitionDates($id: ID!, $input: PlannedDatesInput!) {
                updateCompetitionDates(id: $id, input: $input) { id }
            }
        `;
        await executeMutation(updateCompetitionDatesMutation, {
            id: competitionId,
            input: {
                start: plannedStartDate ? new Date(plannedStartDate).toISOString() : null,
                end: plannedEndDate ? new Date(plannedEndDate).toISOString() : null
            }
        });

        // 2. Loop through commissions and update their dates & toggles
        for (const comm of commissions) {
            const updateCommissionDatesMutation = `
                mutation UpdateCommissionDates($id: ID!, $input: PlannedDatesInput!) {
                    updateCommissionDates(id: $id, input: $input) { id }
                }
            `;
            await executeMutation(updateCommissionDatesMutation, {
                id: comm.id,
                input: {
                    start: comm.plannedStartDate ? new Date(comm.plannedStartDate).toISOString() : null,
                    end: comm.plannedEndDate ? new Date(comm.plannedEndDate).toISOString() : null
                }
            });

            const setWineJumper = `mutation SetWJ($id: ID!, $v: Boolean!) { setCommissionWineJumperMiniGameEnabled(id: $id, enabled: $v) { id } }`;
            const setVoice = `mutation SetVoice($id: ID!, $v: Boolean!) { setCommissionVoiceCommentsEnabled(id: $id, enabled: $v) { id } }`;
            const setProp = `mutation SetProp($id: ID!, $v: Boolean!) { setCommissionPropertyCommentsEnabled(id: $id, enabled: $v) { id } }`;
            const setOrigin = `mutation SetOrigin($id: ID!, $v: Boolean!) { setCommissionBeverageOriginDuringEvaluationEnabled(id: $id, enabled: $v) { id } }`;

            await Promise.all([
                executeMutation(setWineJumper, { id: comm.id, v: comm.wineJumperMiniGameEnabled }),
                executeMutation(setVoice, { id: comm.id, v: comm.voiceCommentsEnabled }),
                executeMutation(setProp, { id: comm.id, v: comm.propertyCommentsEnabled }),
                executeMutation(setOrigin, { id: comm.id, v: comm.beverageOriginDuringEvaluationEnabled })
            ]);
        }

        return { success: true };
    } catch (err: any) {
        console.error("Server Action Error (updateCompetitionSettingsAction):", err);
        return { success: false, error: err.message || "Failed to update settings" };
    }
}

export async function getCompetitionSeriesListAction() {
    try {
        const response = await fetch('http://hayabusa.proxy.rlwy.net:21675/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: '{ competitionSeriesList(limit: 100) { items { id name } } }'
            }),
            cache: 'no-store'
        });

        const json = await response.json();

        if (json.errors && json.errors.length > 0) {
            throw new Error(json.errors[0].message);
        }

        return json?.data?.competitionSeriesList?.items || [];
    } catch (err: any) {
        console.error("Server Action Error (getCompetitionSeriesListAction):", err);
        return [];
    }
}

interface CreateCommissionParams {
    competitionId: string;
    name: string;
    plannedStartDate?: string; // ISO string, optional
    plannedEndDate?: string;   // ISO string, optional
    wineJumperMiniGameEnabled?: boolean;
    voiceCommentsEnabled?: boolean;
    propertyCommentsEnabled?: boolean;
    beverageOriginDuringEvaluationEnabled?: boolean;
}

async function executeGraphQL(query: string, variables: any) {
    const response = await fetch('http://hayabusa.proxy.rlwy.net:21675/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
        cache: 'no-store'
    });

    if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
    }

    const json = await response.json();
    if (json.errors && json.errors.length > 0) {
        throw new Error(json.errors[0].message);
    }
    return json.data;
}

export async function createCommission(params: CreateCommissionParams) {
    try {
        const createCommissionMutation = `
            mutation CreateCommission($input: CreateCommissionInput!) {
                createCommission(input: $input) {
                    id
                    name
                }
            }
        `;

        const plannedDates = (params.plannedStartDate || params.plannedEndDate)
            ? {
                start: params.plannedStartDate ? new Date(params.plannedStartDate).toISOString() : null,
                end: params.plannedEndDate ? new Date(params.plannedEndDate).toISOString() : null,
            }
            : null;

        const data = await executeGraphQL(createCommissionMutation, {
            input: {
                competitionId: params.competitionId,
                name: params.name,
                plannedDates,
                wineJumperMiniGameEnabled: params.wineJumperMiniGameEnabled ?? false,
                voiceCommentsEnabled: params.voiceCommentsEnabled ?? false,
                propertyCommentsEnabled: params.propertyCommentsEnabled ?? false,
                beverageOriginDuringEvaluationEnabled: params.beverageOriginDuringEvaluationEnabled ?? false,
            }
        });

        const commission = data?.createCommission;
        if (!commission?.id) throw new Error("Failed to create commission.");

        return { success: true, commission };
    } catch (error: any) {
        console.error("Failed to create commission:", error);
        return { success: false, error: error.message || "Internal Server Error" };
    }
}
