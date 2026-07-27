"use server"

import { cookies } from "next/headers";
import { fetchGraphQL } from "@/lib/apiClient";
import { GET_MY_COMPETITIONS_SERIES } from "../myCompetitionSeries/queries";

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(id: string | null | undefined): boolean {
    if (!id) return false;
    return UUID_REGEX.test(id);
}

async function rawGraphQL(
    query: string,
    variables: Record<string, any>,
    headers?: Record<string, string>,
) {
    const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ query, variables }),
        next: { revalidate: 0 },
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0]?.message || 'GraphQL error');
    return json.data;
}

async function getActorHeaders(): Promise<Record<string, string>> {
    const cookieStore = await cookies();
    const auid = cookieStore.get("auid")?.value;
    if (!auid) {
        throw new Error("Unauthorized: Please sign in");
    }
    return { actor: auid, "x-actor": auid };
}

export type CompetitionSeriesStatus =
    | "DRAFT"
    | "IN_REVIEW"
    | "APPROVED"
    | "ARCHIVED"
    | "PUBLISHED"
    | "SUSPENDED";

export interface CompetitionSeries {
    id: string;
    name: string;
    status: CompetitionSeriesStatus;
    countriesType: string;
    countriesCodes: string[] | null;
    owners: number[][];
    createdAt: string;
}

// NOTE: there is no confirmed single-item query (e.g. `competitionSeries(id: ID!)`)
// in the schema yet — only `competitionSeriesList` was verified. So reads go through
// the list query and filter client-side. If a dedicated single-item query exists,
// swap this out for it (cheaper than fetching the whole list).
export async function getCompetitionSeriesAction(id: string): Promise<CompetitionSeries | null> {
    if (!isValidUuid(id)) return null;
    try {
        const response = await fetchGraphQL(GET_MY_COMPETITIONS_SERIES, { limit: 100 }) as any;
        const items: CompetitionSeries[] = response.competitionSeriesList?.items || [];
        return items.find((s) => s.id === id) ?? null;
    } catch (err: any) {
        console.error("Server Action Error (getCompetitionSeriesAction):", err);
        return null;
    }
}

export async function createCompetitionSeriesAction(input: {
    name: string;
    countriesType: string;
    countriesCodes?: string[];
    owners: number[][];
}) {
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation CreateCompetitionSeries($input: CreateCompetitionSeriesInput!) {
                createCompetitionSeries(input: $input) {
                    id
                    name
                    status
                    countriesType
                    countriesCodes
                    owners
                    createdAt
                }
            }
        `, { input }, headers);
        return { success: true, series: data.createCompetitionSeries as CompetitionSeries };
    } catch (err: any) {
        console.error("Server Action Error (createCompetitionSeriesAction):", err);
        return { success: false, error: err.message || "Failed to create competition series" };
    }
}

export async function changeCompetitionSeriesNameAction(id: string, newName: string) {
    if (!isValidUuid(id)) throw new Error("Invalid UUID parameter");
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation ChangeCompetitionSeriesName($id: ID!, $newName: String!) {
                changeCompetitionSeriesName(id: $id, newName: $newName) {
                    id
                    name
                }
            }
        `, { id, newName }, headers);
        return { success: true, series: data.changeCompetitionSeriesName };
    } catch (err: any) {
        console.error("Server Action Error (changeCompetitionSeriesNameAction):", err);
        return { success: false, error: err.message || "Failed to rename series" };
    }
}

export async function changeCompetitionSeriesCountriesAction(
    id: string,
    input: { countriesType: string; countriesCodes?: string[] },
) {
    if (!isValidUuid(id)) throw new Error("Invalid UUID parameter");
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation ChangeCompetitionSeriesCountries($id: ID!, $input: ChangeCompetitionSeriesCountriesInput!) {
                changeCompetitionSeriesCountries(id: $id, input: $input) {
                    id
                    countriesType
                    countriesCodes
                }
            }
        `, { id, input }, headers);
        return { success: true, series: data.changeCompetitionSeriesCountries };
    } catch (err: any) {
        console.error("Server Action Error (changeCompetitionSeriesCountriesAction):", err);
        return { success: false, error: err.message || "Failed to update countries" };
    }
}

export async function addCompetitionSeriesOwnerAction(id: string, auid: number[]) {
    if (!isValidUuid(id)) throw new Error("Invalid UUID parameter");
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation AddCompetitionSeriesOwner($id: ID!, $auid: [Int!]!) {
                addCompetitionSeriesOwner(id: $id, auid: $auid) {
                    id
                    owners
                }
            }
        `, { id, auid }, headers);
        return { success: true, series: data.addCompetitionSeriesOwner };
    } catch (err: any) {
        console.error("Server Action Error (addCompetitionSeriesOwnerAction):", err);
        return { success: false, error: err.message || "Failed to add owner" };
    }
}

export async function removeCompetitionSeriesOwnerAction(id: string, auid: number[]) {
    if (!isValidUuid(id)) throw new Error("Invalid UUID parameter");
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation RemoveCompetitionSeriesOwner($id: ID!, $auid: [Int!]!) {
                removeCompetitionSeriesOwner(id: $id, auid: $auid) {
                    id
                    owners
                }
            }
        `, { id, auid }, headers);
        return { success: true, series: data.removeCompetitionSeriesOwner };
    } catch (err: any) {
        console.error("Server Action Error (removeCompetitionSeriesOwnerAction):", err);
        return { success: false, error: err.message || "Failed to remove owner" };
    }
}

export async function submitCompetitionSeriesForReviewAction(id: string) {
    if (!isValidUuid(id)) throw new Error("Invalid UUID parameter");
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation SubmitCompetitionSeriesForReview($id: ID!) {
                submitCompetitionSeriesForReview(id: $id) {
                    id
                    status
                }
            }
        `, { id }, headers);
        return { success: true, series: data.submitCompetitionSeriesForReview };
    } catch (err: any) {
        console.error("Server Action Error (submitCompetitionSeriesForReviewAction):", err);
        return { success: false, error: err.message || "Failed to submit series for review" };
    }
}

export async function approveCompetitionSeriesAction(id: string) {
    if (!isValidUuid(id)) throw new Error("Invalid UUID parameter");
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation ApproveCompetitionSeries($id: ID!) {
                approveCompetitionSeries(id: $id) {
                    id
                    status
                }
            }
        `, { id }, headers);
        return { success: true, series: data.approveCompetitionSeries };
    } catch (err: any) {
        console.error("Server Action Error (approveCompetitionSeriesAction):", err);
        return { success: false, error: err.message || "Failed to approve series" };
    }
}

export async function publishCompetitionSeriesAction(id: string) {
    if (!isValidUuid(id)) throw new Error("Invalid UUID parameter");
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation PublishCompetitionSeries($id: ID!) {
                publishCompetitionSeries(id: $id) {
                    id
                    status
                }
            }
        `, { id }, headers);
        return { success: true, series: data.publishCompetitionSeries };
    } catch (err: any) {
        console.error("Server Action Error (publishCompetitionSeriesAction):", err);
        return { success: false, error: err.message || "Failed to publish series" };
    }
}

export async function suspendCompetitionSeriesAction(id: string) {
    if (!isValidUuid(id)) throw new Error("Invalid UUID parameter");
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation SuspendCompetitionSeries($id: ID!) {
                suspendCompetitionSeries(id: $id) {
                    id
                    status
                }
            }
        `, { id }, headers);
        return { success: true, series: data.suspendCompetitionSeries };
    } catch (err: any) {
        console.error("Server Action Error (suspendCompetitionSeriesAction):", err);
        return { success: false, error: err.message || "Failed to suspend series" };
    }
}

export async function archiveCompetitionSeriesAction(id: string) {
    if (!isValidUuid(id)) throw new Error("Invalid UUID parameter");
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation ArchiveCompetitionSeries($id: ID!) {
                archiveCompetitionSeries(id: $id) {
                    id
                    status
                }
            }
        `, { id }, headers);
        return { success: true, series: data.archiveCompetitionSeries };
    } catch (err: any) {
        console.error("Server Action Error (archiveCompetitionSeriesAction):", err);
        return { success: false, error: err.message || "Failed to archive series" };
    }
}