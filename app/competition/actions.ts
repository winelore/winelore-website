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
        const response = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT!, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables }),
            cache: 'no-store'
        });
        const text = await response.text();
        let json: any;
        try {
            json = JSON.parse(text);
        } catch {
            throw new Error(`GraphQL server error (${response.status}): Некоректна відповідь сервера`);
        }
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

export async function updateCompetitionDatesAction(
    competitionId: string,
    plannedStartDate: string | null,
    plannedEndDate: string | null
) {
    if (!isValidUuid(competitionId)) throw new Error("Invalid UUID parameter");
    try {
        const mutation = `
            mutation UpdateCompetitionDates($id: ID!, $input: PlannedDatesInput!) {
                updateCompetitionDates(id: $id, input: $input) { id }
            }
        `;
        await executeGraphQL(mutation, {
            id: competitionId,
            input: {
                start: plannedStartDate ? new Date(plannedStartDate).toISOString() : null,
                end: plannedEndDate ? new Date(plannedEndDate).toISOString() : null
            }
        });
        return { success: true };
    } catch (err: any) {
        console.error("Server Action Error (updateCompetitionDatesAction):", err);
        return { success: false, error: err.message || "Failed to update dates" };
    }
}

export async function updateCompetitionNameAction(competitionId: string, newName: string) {
    if (!isValidUuid(competitionId)) throw new Error("Invalid UUID parameter");
    try {
        const mutation = `
            mutation ChangeCompetitionName($id: ID!, $newName: String!) {
                changeCompetitionName(id: $id, newName: $newName) { id name }
            }
        `;
        await executeGraphQL(mutation, { id: competitionId, newName });
        return { success: true };
    } catch (err: any) {
        console.error("Server Action Error (updateCompetitionNameAction):", err);
        return { success: false, error: err.message || "Failed to update name" };
    }
}

export async function getCompetitionSeriesListAction() {
    try {
        const response = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT!, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: '{ competitionSeriesList(limit: 100) { items { id name } } }'
            }),
            cache: 'no-store'
        });

        const text = await response.text();
        let json: any;
        try {
            json = JSON.parse(text);
        } catch {
            return [];
        }

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
    const response = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT!, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
        cache: 'no-store'
    });

    const text = await response.text();
    let json: any;
    try {
        json = JSON.parse(text);
    } catch {
        throw new Error(`GraphQL server error (${response.status}): Некоректна відповідь сервера`);
    }

    if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
    }

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

export async function createQuickCompetitionAction(name: string, clientAuid?: number | null, seriesId?: string | null) {
    try {
        let userAuid = clientAuid;
        if (!userAuid) {
            const { cookies } = await import("next/headers");
            const cookieStore = await cookies();
            const cookieAuid = cookieStore.get("auid")?.value;
            if (cookieAuid) userAuid = parseInt(cookieAuid, 10);
        }

        if (!userAuid) {
            return { success: false, error: "User authentication required." };
        }

        let finalSeriesId = seriesId;
        if (!finalSeriesId) {
            const seriesList = await getCompetitionSeriesListAction();
            if (seriesList && seriesList.length > 0) {
                const mySeries = seriesList.find((s: any) =>
                    s.owners && s.owners.flat().includes(Number(userAuid))
                );
                finalSeriesId = mySeries ? mySeries.id : seriesList[0].id;
            } else {
                const createSeriesMutation = `
                    mutation CreateSeries($input: CreateCompetitionSeriesInput!) {
                        createCompetitionSeries(input: $input) { id }
                    }
                `;
                const seriesRes = await executeGraphQL(createSeriesMutation, {
                    input: {
                        name: "General Series",
                        countriesType: "GLOBAL",
                        countriesCodes: [],
                        owners: [[userAuid]]
                    }
                });
                finalSeriesId = seriesRes?.createCompetitionSeries?.id;
            }
        }

        if (!finalSeriesId) {
            throw new Error("Unable to locate or create a Competition Series.");
        }

        const createCompetitionMutation = `
            mutation CreateCompetition($input: CreateCompetitionInput!) {
                createCompetition(input: $input) {
                    id
                    name
                }
            }
        `;

        const finalName = name.trim() || "New Competition";
        const holders = [[userAuid]];

        const data = await executeGraphQL(createCompetitionMutation, {
            input: {
                name: finalName,
                seriesId: finalSeriesId,
                holders
            }
        });

        const competitionId = data?.createCompetition?.id;
        if (!competitionId) throw new Error("Failed to create competition.");

        return { success: true, competitionId };
    } catch (error: any) {
        console.error("Failed to create quick competition:", error);
        return { success: false, error: error.message || "Failed to create competition" };
    }
}