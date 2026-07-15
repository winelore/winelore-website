'use server';

import Cookies from "js-cookie";

/**
 * Helper function to execute raw GraphQL queries/mutations directly on the backend.
 * Running this on the server side completely bypasses browser CORS restrictions.
 */



async function executeGraphQL(query: string, variables: any) {
    const response = await fetch('http://hayabusa.proxy.rlwy.net:21675/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
        // Disable caching for mutations to guarantee fresh state execution
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

export async function getCompetitionSeriesCount(auid:number) {
    const query = `
    query GetCompetitionSeriesCount($owner: [Int!]) {
      competitionSeriesCount(owner: $owner)
    }
  `;

    try {
        const res = await fetch('http://hayabusa.proxy.rlwy.net:21675/graphql', {
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

        return json.data.competitionSeriesCount; // это просто число
    } catch (err) {
        console.error("Failed to fetch competition series count:", err);
        return null;
    }
}


/**
 * Server Action that handles the cascade generation of the entire competition infrastructure.
 */
export async function createCompetitionSeriesAction(name: string, countriesType: string, owners: number[][]) {
    try {
        const mutation = `
            mutation CreateCompetitionSeries($input: CreateCompetitionSeriesInput!) {
                createCompetitionSeries(input: $input) {
                    id
                    name
                }
            }
        `;
        const result = await executeGraphQL(mutation, {
            input: {
                name,
                countriesType,
                owners
            }
        });

        return { success: true, data: result?.createCompetitionSeries };
    } catch (err: any) {
        console.error("Failed to create competition series:", err);
        return { success: false, error: err.message || "Failed to create competition series" };
    }
}