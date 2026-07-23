'use server';

/**
 * Helper function to execute raw GraphQL queries/mutations directly on the backend.
 * Running this on the server side completely bypasses browser CORS restrictions.
 */
async function executeGraphQL(query: string, variables: any) {
    const response = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT!, {
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

export async function getCompetitionSeriesListAction() {
    try {
        const query = '{ competitionSeriesList(limit: 100) { items { id name owners} } }';
        const data = await executeGraphQL(query, {});
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
        const res = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT!, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                variables: { owner: [auid] },
            }),
        });

        const json = await res.json();

        if (json.errors) {
            console.error("GraphQL errors:", json.errors);
            return null;
        }

        return json.data.competitionSeriesCount;
    } catch (err) {
        console.error("Failed to fetch competition series count:", err);
        return null;
    }
}

/**
 * Server Action that creates a Competition with just a name and planned start/end dates.
 */
export async function createCompetitionInfrastructure(formData: any) {
    try {
        // 1. Initialize the core Competition node
        const createCompetitionMutation = `
            mutation CreateCompetition($input: CreateCompetitionInput!) {
                createCompetition(input: $input) { id }
            }
        `;
        const competitionResult = await executeGraphQL(createCompetitionMutation, {
            input: {
                name: formData.name,
                seriesId: formData.seriesId ? formData.seriesId : null,
                holders: formData.holders
            }
        });

        const competitionId = competitionResult?.createCompetition?.id;
        if (!competitionId) throw new Error("Failed to initialize competition root node.");

        // 2. Set planned timeline boundaries for the competition
        if (formData.plannedStartDate || formData.plannedEndDate) {
            const updateCompetitionDatesMutation = `
                mutation UpdateCompetitionDates($id: ID!, $input: PlannedDatesInput!) {
                    updateCompetitionDates(id: $id, input: $input) { id }
                }
            `;
            await executeGraphQL(updateCompetitionDatesMutation, {
                id: competitionId,
                input: {
                    start: formData.plannedStartDate ? new Date(formData.plannedStartDate).toISOString() : null,
                    end: formData.plannedEndDate ? new Date(formData.plannedEndDate).toISOString() : null
                }
            });
        }

        return { success: true, competitionId };
    } catch (error: any) {
        console.error("Server Action Execution Error:", error);
        return { success: false, error: error.message || "Internal Server Error" };
    }
}