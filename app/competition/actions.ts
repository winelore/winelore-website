"use server"

import { sdk } from '../../lib/apiClient';
import { getGraphQLEndpoint } from '../../lib/graphqlEndpoint';
import { cookies } from 'next/headers';
import {
    CHANGE_COMPETITION_NAME,
    CREATE_COMMISSION,
    UPDATE_COMPETITION_DATES,
    createCommissionInput,
    plannedDatesInput,
    toCompetitionPage,
    type NewCommission,
} from '@winelore/core/competition';

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

export async function submitCompetitionForReviewAction(id: string) {
    if (!isValidUuid(id)) throw new Error("Invalid UUID parameter");
    try {
        const cookieStore = await cookies();
        const auid = cookieStore.get("auid")?.value;
        if (!auid) throw new Error("Unauthorized: Please sign in");
        return await sdk.DevSubmitCompetitionForReview(
            { id },
            { headers: { actor: auid, "x-actor": auid } },
        );
    } catch (err: any) {
        console.error("Server Action Error (submitCompetitionForReviewAction):", err);
        throw new Error(err.message || "Failed to submit competition for review");
    }
}

export async function getCompetitionDataAction(competitionId: string) {
    if (!isValidUuid(competitionId)) return null;
    try {
        const data = await sdk.GetCompetitionPage({ id: competitionId });
        const competition = data.competition;
        if (!competition) return null;
        return toCompetitionPage(competition, data.commissionsByCompetition?.items);
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
        const response = await fetch(getGraphQLEndpoint(), {
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
            throw new Error(`GraphQL server error (${response.status}): Invalid server response`);
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
        await executeGraphQL(UPDATE_COMPETITION_DATES, {
            id: competitionId,
            input: plannedDatesInput(plannedStartDate, plannedEndDate),
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
        await executeGraphQL(CHANGE_COMPETITION_NAME, { id: competitionId, newName });
        return { success: true };
    } catch (err: any) {
        console.error("Server Action Error (updateCompetitionNameAction):", err);
        return { success: false, error: err.message || "Failed to update name" };
    }
}

export async function getCompetitionSeriesListAction() {
    try {
        const response = await fetch(getGraphQLEndpoint(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: '{ competitionSeriesList(limit: 100) { items { id name owners } } }'
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


async function executeGraphQL(query: string, variables: any) {
    const response = await fetch(getGraphQLEndpoint(), {
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
        throw new Error(`GraphQL server error (${response.status}): Invalid server response`);
    }

    if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
    }

    if (json.errors && json.errors.length > 0) {
        throw new Error(json.errors[0].message);
    }
    return json.data;
}

export async function createCommission(params: NewCommission) {
    try {
        // The input is built in core, so the mobile app creates the same commission.
        const data = await executeGraphQL(CREATE_COMMISSION, { input: createCommissionInput(params) });

        const commission = data?.createCommission;
        if (!commission?.id) throw new Error("Failed to create commission.");

        return { success: true, commission };
    } catch (error: any) {
        console.error("Failed to create commission:", error);
        return { success: false, error: error.message || "Internal Server Error" };
    }
}
