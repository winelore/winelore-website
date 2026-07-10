"use server"

import { fetchGraphQL, fetchGraphQLRaw, sdk } from '../../lib/apiClient';
import { GetCommissionTemplatesDocument as LegacyGetCommissionTemplatesDocument } from '../../src/gql/graphql';
import {
    GET_COMMISSION_TEMPLATES_DEEP_QUERY,
    type GetCommissionTemplatesDeepResult,
    type GetCommissionTemplatesDeepVariables,
} from '../../lib/commissionTemplatesQuery';
import { cookies } from "next/headers";
import {
    findEvaluationForMember,
    memberMatchesActor,
} from "./auidUtils";
import { isReplicaCandidateFinished } from "./replicaUtils";
import { buildPropertyMapFromCommissionTemplates } from "./propertyMap";
import {
    buildExpertBeverageSummary,
    type MyTastingSummaryData,
} from "./expertRanking";
import type { PropertyMeta } from "./propertyMap";

export type { MyTastingSummaryData } from "./expertRanking";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(id: string | null | undefined): boolean {
    if (!id) return false;
    return UUID_REGEX.test(id);
}

const templatesCache = new Map<string, { data: GetCommissionTemplatesDeepResult; expiresAt: number }>();

export async function getCommissionTemplatesWithResultMarkers(commissionId: string): Promise<GetCommissionTemplatesDeepResult> {
    const cached = templatesCache.get(commissionId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }

    try {
        // Use the deep expression query so SmartProperty formulas (left-leaning weighted
        // sums that can be many levels deep) are fetched in full rather than truncated.
        const res = await fetchGraphQLRaw<GetCommissionTemplatesDeepResult, GetCommissionTemplatesDeepVariables>(
            GET_COMMISSION_TEMPLATES_DEEP_QUERY,
            { id: commissionId },
        );
        templatesCache.set(commissionId, { data: res, expiresAt: Date.now() + 5 * 60 * 1000 }); // 5 minutes TTL
        return res;
    } catch (err: any) {
        const message = String(err?.message || err);
        if (!message.includes("isResult")) {
            throw err;
        }

        console.warn("Backend does not expose EvaluationProperty.isResult yet; falling back to legacy template query.");
        const res = await fetchGraphQL(LegacyGetCommissionTemplatesDocument, { id: commissionId });
        templatesCache.set(commissionId, { data: res, expiresAt: Date.now() + 5 * 60 * 1000 }); // 5 minutes TTL
        return res as unknown as GetCommissionTemplatesDeepResult;
    }
}

export async function markMemberReadyAction(replicaId: string, memberId: string) {
    if (!isValidUuid(replicaId) || !isValidUuid(memberId)) throw new Error("Invalid UUID parameter");
    try {
        return await sdk.MarkReplicaMemberReady({ replicaId, memberId });
    } catch (err: any) {
        console.error("Server Action Error (markMemberReadyAction):", err);
        throw new Error(err.message || "Failed to mark member ready");
    }
}

export async function markMemberNotReadyAction(replicaId: string, memberId: string) {
    if (!isValidUuid(replicaId) || !isValidUuid(memberId)) throw new Error("Invalid UUID parameter");
    try {
        return await sdk.MarkReplicaMemberNotReady({ replicaId, memberId });
    } catch (err: any) {
        console.error("Server Action Error (markMemberNotReadyAction):", err);
        throw new Error(err.message || "Failed to mark member not ready");
    }
}

export async function startCommissionAction(id: string) {
    if (!isValidUuid(id)) throw new Error("Invalid UUID parameter");
    try {
        return await sdk.StartCommissionReplica({ id });
    } catch (err: any) {
        console.error("Server Action Error (startCommissionAction):", err);
        throw new Error(err.message || "Failed to start commission replica");
    }
}
export async function getVoiceUploadUrlAction(
    fileName: string,
    contentType: string,
): Promise<{ uploadUrl: string; fileUrl: string } | null> {
    try {
        const data = await rawGraphQL(`
            mutation GetAudioUploadUrl($fileName: String!, $contentType: String!) {
                getPresignedAudioUploadUrl(fileName: $fileName, contentType: $contentType) {
                    uploadUrl
                    fileUrl
                }
            }
        `, { fileName, contentType });
        return data?.getPresignedAudioUploadUrl ?? null;
    } catch {
        return null;
    }
}

export async function submitEvaluationAction(
    candidateId: string,
    scores: { code: string, value: string }[],
    comments?: { propertyId?: string | number | null, text?: string, sortOrder: number, voiceUrl?: string }[],
) {
    if (!isValidUuid(candidateId)) throw new Error("Invalid candidateId parameter");
    try {
        console.log(`📤 Submitting evaluation for candidate ${candidateId}...`, scores);
        
        const cookieStore = await cookies();
        const auid = cookieStore.get("auid")?.value;
        if (!auid) {
            throw new Error("Unauthorized: Please sign in");
        }
        const headers: Record<string, string> = {
            "actor": auid,
            "x-actor": auid,
        };

        const submitResponse = await sdk.SubmitEvaluation({
            input: {
                candidateId,
                scores,
                ...(comments && comments.length > 0 ? { comments } : {}),
            }
        }, {
            headers
        });
        
        // Note: We do not mark the candidate as evaluated here because other commission members
        // still need to submit their evaluations. The HEAD of the commission will advance/mark
        // the candidate as evaluated from the waiting dashboard.

        return submitResponse.submitEvaluation;
    } catch (err: any) {
        console.error("Server Action Error (submitEvaluationAction):", err);
        throw new Error(err.message || "Failed to submit evaluation");
    }
}

export async function getCommissionDataAction(commissionId: string) {
    if (!isValidUuid(commissionId)) return null;
    try {
        const [commissionData, countData] = await Promise.all([
            sdk.GetCommission({ id: commissionId }),
            sdk.GetCommissionCandidateCount({ commissionId })
        ]);
        const commission = commissionData.commission;
        if (!commission) return null;

        // Fetch template editions dynamically with bootstrapping fallback
        let templateEdition: any = null;
        try {
            console.log(`🔍 Fetching templates for commission ${commissionId}...`);
            const templateResult = await getCommissionTemplatesWithResultMarkers(commissionId);
            const commissionWithTemplates = templateResult.commission;
            
            if (commissionWithTemplates && commissionWithTemplates.templateEditions && commissionWithTemplates.templateEditions.length > 0) {
                // Find WINE template or default to the first template link
                const link = commissionWithTemplates.templateEditions.find(l => l.beverageType.code === "WINE") || commissionWithTemplates.templateEditions[0];
                templateEdition = link?.templateEdition || null;
                console.log(`✅ Found template edition: ${templateEdition?.id}`);
            }
        } catch (err: any) {
            console.warn("❌ Failed to fetch template editions from backend, will try to bootstrap:", err.message);
        }

        // Check if template edition is valid (categories exist, properties are non-null and not empty)
        const isValidTemplate = templateEdition && templateEdition.categories && templateEdition.categories.length > 0 && 
            templateEdition.categories.every((c: any) => c.properties && c.properties.length > 0 && c.properties.every((p: any) => p.id && p.code && p.name));

        if (!isValidTemplate) {
            if (commission.status === "DRAFT" || commission.status === "PLANNED") {
                console.error("❌ Failed to bootstrap template edition: Template is invalid, empty, or missing required properties.");
                templateEdition = null;
            } else {
                console.warn(`⚠️ Skipping template bootstrap: commission is in ${commission.status} status and cannot accept new templates.`);
                templateEdition = null;
            }
        }

        const candidatesOrder = (commission.candidates || []).map((c: any) => c.id);

        const replicas = (commission.replicas || []).map((r: any) => ({
            id: r.id,
            name: r.name || `${r.type} Replica`,
            type: r.type,
            status: r.status,
            currentCandidateId: r.currentCandidateId || null,
            members: (r.members || []).map((m: any) => ({
                id: m.id,
                auid: m.auid ? m.auid.flat() : [],
                role: m.role,
                isReady: m.isReady,
            })),
            candidateCount: r.replicaCandidates ? r.replicaCandidates.length : 0,
            replicaCandidates: (r.replicaCandidates || []).map((rc: any) => ({
                id: rc.id,
                status: rc.status,
                candidate: rc.candidate ? {
                    id: rc.candidate.id,
                    anonymizedCode: rc.candidate.anonymizedCode || null
                } : null
            })).sort((a: any, b: any) => {
                const idxA = a.candidate ? candidatesOrder.indexOf(a.candidate.id) : -1;
                const idxB = b.candidate ? candidatesOrder.indexOf(b.candidate.id) : -1;
                return idxA - idxB;
            })
        }));

        // Backwards compatible members representation (from first standard replica or first replica)
        const defaultReplica = replicas.find((r: any) => r.type === "STANDARD") || replicas[0] || null;
        const defaultMembers = defaultReplica ? defaultReplica.members : [];

        return {
            id: commission.id,
            name: commission.name,
            status: commission.status,
            plannedStartAt: commission.plannedDates?.start || null,
            plannedEndAt: commission.plannedDates?.end || null,
            startedAt: commission.startedAt || null,
            endedAt: commission.endedAt || null,
            competition: {
                id: commission.competition.id,
                name: commission.competition.name,
                holders: commission.competition.holders.flat(),
                wineJumperMiniGameEnabled: commission.wineJumperMiniGameEnabled,
                voiceCommentsEnabled: commission.voiceCommentsEnabled,
                propertyCommentsEnabled: commission.propertyCommentsEnabled,
                beverageOriginDuringEvaluationEnabled: commission.beverageOriginDuringEvaluationEnabled,
                evaluationTemplateEdition: templateEdition
            },
            candidateCount: countData.commissionCandidateCount ?? 0,
            panels: commission.panels || [],
            replicas,
            members: defaultMembers
        };
    } catch (err: any) {
        console.error("Server Action Error (getCommissionDataAction):", err);
        throw new Error(err.message || "Failed to fetch commission data");
    }
}

export async function getReplicaCandidatesAction(replicaId: string) {
    if (!isValidUuid(replicaId)) return [];
    try {
        const response = await sdk.GetReplicaCandidates({ replicaId });
        const replicaCandidates = response.commissionReplica?.replicaCandidates || [];
        const candidatesOrder = response.commissionReplica?.commission?.candidates?.map((c: any) => c.id) || [];
        if (candidatesOrder.length > 0) {
            return [...replicaCandidates].sort((a: any, b: any) => {
                const idxA = a.candidate ? candidatesOrder.indexOf(a.candidate.id) : -1;
                const idxB = b.candidate ? candidatesOrder.indexOf(b.candidate.id) : -1;
                return idxA - idxB;
            });
        }
        return replicaCandidates;
    } catch (err: any) {
        console.error("Server Action Error (getReplicaCandidatesAction):", err);
        throw new Error(err.message || "Failed to fetch replica candidates");
    }
}

export async function getReplicaCandidateAction(id: string) {
    if (!isValidUuid(id)) return null;
    try {
        const response = await sdk.GetReplicaCandidate({ id });
        return response.commissionReplicaCandidate;
    } catch (err: any) {
        console.error("Server Action Error (getReplicaCandidateAction):", err);
        throw new Error(err.message || "Failed to fetch replica candidate");
    }
}

async function fetchMyTastingSummary(
    replicaId: string,
    commissionId: string,
    featureFlags: {
        propertyCommentsEnabled: boolean;
        voiceCommentsEnabled: boolean;
    },
): Promise<MyTastingSummaryData> {
    const [candidatesWithBeverage, templateResult] = await Promise.all([
        getReplicaCandidatesAction(replicaId),
        getCommissionTemplatesWithResultMarkers(commissionId),
    ]);
    const myEvaluations = await Promise.all(
        candidatesWithBeverage.map((rc) => getMyEvaluationForCandidateAction(rc.id)),
    );
    const evalMap = new Map<string, any>();
    candidatesWithBeverage.forEach((rc, index) => {
        evalMap.set(rc.id, myEvaluations[index]);
    });
    const propertyMap = buildPropertyMapFromCommissionTemplates(templateResult);
    const entries = buildExpertBeverageSummary(
        candidatesWithBeverage,
        evalMap,
        "Unknown Beverage",
        propertyMap,
    );
    return {
        entries,
        propertyMap,
        propertyCommentsEnabled: featureFlags.propertyCommentsEnabled,
        voiceCommentsEnabled: featureFlags.voiceCommentsEnabled,
    };
}

export async function getMyTastingSummaryAction(replicaId: string): Promise<MyTastingSummaryData> {
    const empty: MyTastingSummaryData = {
        entries: [],
        propertyMap: {},
        propertyCommentsEnabled: false,
        voiceCommentsEnabled: false,
    };
    if (!isValidUuid(replicaId)) return empty;
    try {
        const response = await sdk.GetReplicaCandidates({ replicaId });
        const commissionId = response.commissionReplica?.commission?.id;
        if (!commissionId) return empty;

        const commission = await sdk.GetCommission({ id: commissionId });
        const featureFlags = getCompetitionFeatureFlags(commission.commission);
        const summary = await fetchMyTastingSummary(replicaId, commissionId, featureFlags);
        return {
            ...summary,
            commissionName: commission.commission?.name || undefined
        };
    } catch (err: any) {
        console.error("Server Action Error (getMyTastingSummaryAction):", err);
        return empty;
    }
}

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://switchback.proxy.rlwy.net:43233/graphql';

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


function getCompetitionFeatureFlags(competition: {
    wineJumperMiniGameEnabled?: boolean;
    voiceCommentsEnabled?: boolean;
    propertyCommentsEnabled?: boolean;
} | null | undefined) {
    return {
        wineJumperMiniGameEnabled: competition?.wineJumperMiniGameEnabled ?? false,
        voiceCommentsEnabled: competition?.voiceCommentsEnabled ?? false,
        propertyCommentsEnabled: competition?.propertyCommentsEnabled ?? false,
    };
}

export async function getWaitDataAction(commissionId: string, replicaId: string) {
    const emptyFeatureFlags = getCompetitionFeatureFlags(null);
    const emptyResult = {
        members: [] as any[],
        currentCandidateId: null as string | null,
        currentCandidateCode: null as string | null,
        allCandidatesEvaluated: false,
        evaluations: [] as any[],
        propertyMap: {} as Record<string, PropertyMeta>,
        totalCandidates: 0,
        currentCandidateIndex: -1,
        candidatesLeft: 0,
        candidatesLeftAfterCurrent: 0,
        myEvaluation: null as any,
        hasCompletedCurrentCandidate: false,
        myTastingSummary: null as MyTastingSummaryData | null,
        isPanelFinished: false,
        currentPanelName: "",
        nextPanelFirstCandidateId: null as string | null,
        ...emptyFeatureFlags,
    };

    if (!isValidUuid(commissionId) || !isValidUuid(replicaId)) {
        return emptyResult;
    }
    try {
        const result = await sdk.GetCommission({ id: commissionId });
        const commission = result.commission;
        if (!commission) return emptyResult;

        const featureFlags = getCompetitionFeatureFlags(commission);

        // Find the specific replica
        const replica = (commission.replicas || []).find((r: any) => r.id === replicaId);
        if (!replica) return emptyResult;

        // Members of this replica only
        const members = (replica.members || []).map((m: any) => ({
            ...m,
            auid: Array.isArray(m.auid) ? m.auid.flat() : m.auid,
        }));

        const candidatesOrder = (commission.candidates || []).map((c: any) => c.id);
        const replicaCandidates = [...(replica.replicaCandidates || [])].sort((a: any, b: any) => {
            const idxA = a.candidate ? candidatesOrder.indexOf(a.candidate.id) : -1;
            const idxB = b.candidate ? candidatesOrder.indexOf(b.candidate.id) : -1;
            return idxA - idxB;
        });
        // The backend is the single source of truth for which candidate is current.
        // Never compute a "next" candidate on the frontend: the backend advances
        // currentCandidateId itself when the HEAD marks a candidate as evaluated, and
        // it rejects evaluations for any candidate that is not the current one.
        const currentCandidateId = replica.currentCandidateId || null;
        const currentCandidateObj = replicaCandidates.find((rc: any) => rc.id === currentCandidateId);
        const currentCandidateCode = currentCandidateObj?.candidate?.anonymizedCode || null;
        const currentPanelId = currentCandidateObj?.candidate?.panelId || null;
        const panels = commission.panels || [];
        const currentPanelName = panels.find((p: any) => p.id === currentPanelId)?.name || "Panel";

        const currentPanelCandidates = currentPanelId
            ? replicaCandidates.filter((rc: any) => rc.candidate?.panelId === currentPanelId)
            : replicaCandidates;

        const totalCandidates = currentPanelCandidates.length;
        const evaluatedCount = currentPanelCandidates.filter((rc: any) => isReplicaCandidateFinished(rc.status)).length;
        const currentCandidateIndex = currentCandidateId
            ? currentPanelCandidates.findIndex((rc: any) => rc.id === currentCandidateId)
            : -1;

        const candidatesLeft = totalCandidates - evaluatedCount;
        const candidatesLeftAfterCurrent = currentCandidateIndex >= 0
            ? totalCandidates - currentCandidateIndex - 1
            : candidatesLeft;

        const isPanelFinished = currentPanelCandidates.length > 0 &&
            currentPanelCandidates.every((rc: any) => isReplicaCandidateFinished(rc.status));

        const allCandidatesEvaluated = replicaCandidates.length > 0
            && replicaCandidates.every((rc: any) => isReplicaCandidateFinished(rc.status));

        const nextPanelFirstCandidateId = replicaCandidates.find((rc: any) =>
            rc.status === "PENDING" && rc.candidate?.panelId !== currentPanelId)?.id || null;

        let evaluations: any[] = [];
        const propertyMap: Record<string, PropertyMeta> = {};
        let myCurrentCandidateEvaluation: any = null;

        if (currentCandidateId) {
            try {
                // Fetch evaluations, template details, and my current evaluation in parallel
                const [evalsRes, templateResult, myCurrentEvalRes] = await Promise.all([
                    getEvaluationsForCandidateAction(currentCandidateId),
                    getCommissionTemplatesWithResultMarkers(commissionId),
                    getMyEvaluationForCandidateAction(currentCandidateId),
                ]);

                evaluations = evalsRes || [];
                myCurrentCandidateEvaluation = myCurrentEvalRes;

                Object.assign(propertyMap, buildPropertyMapFromCommissionTemplates(templateResult));
            } catch (err: any) {
                console.error("Failed to fetch evaluations or template details for wait page:", err);
            }
        }

        const cookieStore = await cookies();
        const actorAuid = cookieStore.get("auid")?.value;
        const myMember = actorAuid ? members.find((m: any) => memberMatchesActor(m.auid, actorAuid)) : null;

        let myEvaluation = myCurrentCandidateEvaluation;
        if (!myEvaluation && myMember) {
            myEvaluation = findEvaluationForMember(evaluations, myMember.auid);
        }
        if (!myEvaluation && actorAuid) {
            myEvaluation = findEvaluationForMember(evaluations, actorAuid);
        }
        const hasCompletedCurrentCandidate = myEvaluation?.isComplete === true;

        let myTastingSummary: MyTastingSummaryData | null = null;
        if (allCandidatesEvaluated) {
            try {
                myTastingSummary = await fetchMyTastingSummary(replicaId, commissionId, featureFlags);
                if (myTastingSummary) {
                    myTastingSummary.commissionName = commission.name || undefined;
                }
            } catch (err: any) {
                console.error("Failed to fetch expert tasting summary:", err);
                myTastingSummary = {
                    entries: [],
                    propertyMap: {},
                    propertyCommentsEnabled: featureFlags.propertyCommentsEnabled,
                    voiceCommentsEnabled: featureFlags.voiceCommentsEnabled,
                    commissionName: commission.name || undefined,
                };
            }
        }

        return {
            members,
            currentCandidateId,
            currentCandidateCode,
            allCandidatesEvaluated,
            evaluations,
            propertyMap: myTastingSummary?.propertyMap ?? propertyMap,
            totalCandidates,
            currentCandidateIndex,
            candidatesLeft,
            candidatesLeftAfterCurrent,
            myEvaluation: myEvaluation ?? null,
            hasCompletedCurrentCandidate,
            myTastingSummary,
            isPanelFinished,
            currentPanelName,
            nextPanelFirstCandidateId,
            ...featureFlags,
        };
    } catch (err: any) {
        console.error("Server Action Error (getWaitDataAction):", err);
        throw new Error(err.message || "Failed to fetch wait data");
    }
}

export async function getMyEvaluationForCandidateAction(candidateId: string) {
    if (!isValidUuid(candidateId)) return null;
    try {
        const headers = await getActorHeaders();
        const data = await sdk.GetMyEvaluationForCandidate(
            { replicaCandidateId: candidateId },
            { headers },
        );
        return data.evaluationByReplicaCandidateAndEvaluator ?? null;
    } catch (err: any) {
        console.error("Server Action Error (getMyEvaluationForCandidateAction):", err);
        return null;
    }
}

export async function getEvaluationsForCandidateAction(candidateId: string) {
    if (!isValidUuid(candidateId)) return [];
    try {
        const headers = await getActorHeaders();
        const data = await sdk.GetEvaluationsForCandidate({
            replicaCandidateId: candidateId,
            limit: 50,
        }, { headers });
        return data.evaluationsByReplicaCandidate?.items || [];
    } catch (err: any) {
        console.error("Server Action Error (getEvaluationsForCandidateAction):", err);
        throw new Error(err.message || "Failed to fetch evaluations");
    }
}

const SET_REPLICA_CURRENT_CANDIDATE_MUTATION = `
    mutation SetCommissionReplicaCurrentCandidate($id: ID!, $currentCandidateId: ID) {
        setCommissionReplicaCurrentCandidate(id: $id, currentCandidateId: $currentCandidateId) {
            id
            currentCandidateId
        }
    }
`;

export async function markCandidateEvaluatedAction(replicaId: string, candidateId: string) {
    if (!isValidUuid(replicaId) || !isValidUuid(candidateId)) return null;
    try {
        // The backend authorizes these mutations against the acting member (the HEAD),
        // so the actor headers must be forwarded just like for the other mutations.
        const headers = await getActorHeaders();

        // 1. Mark the current candidate as evaluated. This only flips the candidate's
        //    status; it does NOT move the replica's current candidate pointer.
        const data = await sdk.MarkCommissionReplicaCandidateAsEvaluated({ id: candidateId }, { headers });

        const candidatesResponse = await sdk.GetReplicaCandidates({ replicaId });
        const replicaCandidates = candidatesResponse.commissionReplica?.replicaCandidates || [];
        const candidatesOrder = candidatesResponse.commissionReplica?.commission?.candidates?.map((c: any) => c.id) || [];
        let sortedCandidates = replicaCandidates;
        if (candidatesOrder.length > 0) {
            sortedCandidates = [...replicaCandidates].sort((a: any, b: any) => {
                const idxA = a.candidate ? candidatesOrder.indexOf(a.candidate.id) : -1;
                const idxB = b.candidate ? candidatesOrder.indexOf(b.candidate.id) : -1;
                return idxA - idxB;
            });
        }
        const currentReplicaCandidate = sortedCandidates.find((c: any) => c.id === candidateId);
        const currentPanelId = currentReplicaCandidate?.candidate?.panelId;

        const nextCandidate = sortedCandidates.find((rc: any) =>
            rc.status === "PENDING" && rc.candidate?.panelId === currentPanelId
        );

        const nextCandidateId = nextCandidate?.id ?? null;

        // 3. Explicitly advance (or clear, when finished) the replica's current candidate.
        //    The backend treats currentCandidateId as the single source of truth and
        //    rejects evaluations for any other candidate.
        await rawGraphQL(
            SET_REPLICA_CURRENT_CANDIDATE_MUTATION,
            { id: replicaId, currentCandidateId: nextCandidateId },
            headers,
        );

        return { ...data.markCommissionReplicaCandidateAsEvaluated, nextCandidateId };
    } catch (err: any) {
        console.error("Server Action Error (markCandidateEvaluatedAction):", err);
        throw new Error(err.message || "Failed to mark candidate as evaluated");
    }
}

export async function startNextPanelAction(replicaId: string, nextCandidateId: string) {
    if (!isValidUuid(replicaId) || !isValidUuid(nextCandidateId)) return null;
    try {
        const headers = await getActorHeaders();
        await rawGraphQL(
            SET_REPLICA_CURRENT_CANDIDATE_MUTATION,
            { id: replicaId, currentCandidateId: nextCandidateId },
            headers,
        );
        return true;
    } catch (err: any) {
        console.error("Server Action Error (startNextPanelAction):", err);
        throw new Error(err.message || "Failed to start next panel");
    }
}