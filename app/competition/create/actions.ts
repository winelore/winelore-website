'use server';

import { getGraphQLEndpoint } from '@/lib/graphqlEndpoint';
import { GET_COMPETITION_SERIES_LIST, createCompetition, createCompetitionSeries } from '@winelore/core/competition';

/**
 * Helper function to execute raw GraphQL queries/mutations directly on the backend.
 * Running this on the server side completely bypasses browser CORS restrictions.
 */
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

export async function getCompetitionSeriesListAction() {
    try {
        const data = await executeGraphQL(GET_COMPETITION_SERIES_LIST, {});
        return data?.competitionSeriesList?.items || [];
    } catch (err) {
        console.error("Failed to fetch competition series list:", err);
        return [];
    }
}

export async function getCompetitionSeriesCount(auid: number) {
    const query = `
    query GetCompetitionSeriesCount($owner: [Int!]) {
      competitionSeriesCount(owner: $owner)
    }
  `;

    try {
        const res = await fetch(getGraphQLEndpoint(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                variables: { owner: [auid] },
            }),
        });

        const text = await res.text();
        let json: any;
        try {
            json = JSON.parse(text);
        } catch {
            return null;
        }

        if (json.errors) {
            console.error("GraphQL errors:", json.errors);
            return null;
        }

        return json.data?.competitionSeriesCount;
    } catch (err) {
        console.error("Failed to fetch competition series count:", err);
        return null;
    }
}

/**
 * Server Action that creates a Competition with just a name and planned start/end dates.
 * The sequence — and which series it lands in — is core's, which the app's form runs too.
 */
export async function createCompetitionInfrastructure(formData: any) {
    try {
        const competitionId = await createCompetition(executeGraphQL, {
            name: formData.name || "",
            seriesId: formData.seriesId || "",
            plannedStart: formData.plannedStartDate ? new Date(formData.plannedStartDate) : null,
            plannedEnd: formData.plannedEndDate ? new Date(formData.plannedEndDate) : null,
            holder: Number(formData.holders?.[0]?.[0]) || 1,
        });
        return { success: true, competitionId };
    } catch (error: any) {
        console.error("Server Action Execution Error:", error);
        return { success: false, error: error.message || "Internal Server Error" };
    }
}

/**
 * Creates a Competition Series owned by the given user. The create form offers
 * this inline so a first-time organizer does not have to leave the page (or
 * silently end up with an auto-generated "General Series" they never named).
 */
export async function createCompetitionSeriesAction(name: string, auid: number) {
    try {
        const series = await createCompetitionSeries(executeGraphQL, name, auid);
        return { success: true, id: series.id, name: series.name };
    } catch (error: any) {
        console.error("Failed to create competition series:", error);
        return { success: false, error: error.message || "Internal Server Error" };
    }
}
