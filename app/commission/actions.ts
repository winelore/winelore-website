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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(id: string | null | undefined): boolean {
    if (!id) return false;
    return UUID_REGEX.test(id);
}

async function getCommissionTemplatesWithResultMarkers(commissionId: string) {
    try {
        // Use the deep expression query so SmartProperty formulas (left-leaning weighted
        // sums that can be many levels deep) are fetched in full rather than truncated.
        return await fetchGraphQLRaw<GetCommissionTemplatesDeepResult, GetCommissionTemplatesDeepVariables>(
            GET_COMMISSION_TEMPLATES_DEEP_QUERY,
            { id: commissionId },
        );
    } catch (err: any) {
        const message = String(err?.message || err);
        if (!message.includes("isResult")) {
            throw err;
        }

        console.warn("Backend does not expose EvaluationProperty.isResult yet; falling back to legacy template query.");
        return await fetchGraphQL(LegacyGetCommissionTemplatesDocument, { id: commissionId });
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

async function bootstrapTemplateEditionForCommission(commissionId: string) {
    console.log(`🚀 Bootstrapping real template edition for commission ${commissionId}...`);
    // 1. Create a new evaluation template
    const templateName = `Wine Evaluation Template ${Date.now()}`;
    const templateRes = await sdk.CreateEvaluationTemplate({
        input: {
            name: templateName,
            beverageType: "WINE",
            owners: [[1]] // likespro with AUID [1]
        }
    });
    const templateId = templateRes.createEvaluationTemplate.id;
    console.log(`  Created template: ${templateId}`);

    // 2. Create the template edition
    const categoriesInput = [
        {
            name: "Visual Assessment",
            properties: [
                {
                    type: "Boolean",
                    code: "clarity",
                    name: "Clarity",
                    description: "Color and clarity characteristics of the wine",
                    isRequired: true,
                    defaultValue: "true"
                },
                {
                    type: "Int",
                    code: "color_intensity",
                    name: "Color Intensity",
                    description: "Depth of color from 1 to 10",
                    isRequired: true,
                    defaultValue: "5",
                    minLimit: 1,
                    maxLimit: 10
                }
            ]
        },
        {
            name: "Sensory & Overall Evaluation",
            properties: [
                {
                    type: "Double",
                    code: "aroma_score",
                    name: "Aroma Score",
                    description: "Fragrance quality and balance (1.0 to 20.0)",
                    isRequired: true,
                    defaultValue: "10.0",
                    minLimit: 1.0,
                    maxLimit: 20.0
                },
                {
                    type: "Discrete",
                    code: "off_odors",
                    name: "Off-odors count",
                    description: "Count of perceived defects",
                    isRequired: true,
                    defaultValue: "0",
                    allowedValues: ["0", "1", "2", "3", "5"]
                },
                {
                    type: "Enum",
                    code: "sweetness",
                    name: "Sweetness Level",
                    description: "Residual sugar perception",
                    isRequired: true,
                    defaultValue: "DRY",
                    allowedValues: ["DRY", "MEDIUM_DRY", "SWEET"]
                },
                {
                    type: "Double",
                    code: "taste_score",
                    name: "Taste Score",
                    description: "Overall palate balance (1.0 to 50.0)",
                    isRequired: true,
                    defaultValue: "25.0",
                    minLimit: 1.0,
                    maxLimit: 50.0
                },
                {
                    type: "Smart",
                    code: "total_score",
                    name: "Total Score",
                    description: "Automatically calculated weighted score",
                    isRequired: true,
                    expression: {
                        type: "ADD",
                        left: {
                            type: "MULTIPLY",
                            left: {
                                type: "VARIABLE",
                                variableCode: "aroma_score"
                            },
                            right: {
                                type: "CONSTANT",
                                constantValue: "0.4"
                            }
                        },
                        right: {
                            type: "MULTIPLY",
                            left: {
                                type: "VARIABLE",
                                variableCode: "taste_score"
                            },
                            right: {
                                type: "CONSTANT",
                                constantValue: "0.6"
                            }
                        }
                    }
                }
            ]
        }
    ];

    const editionRes = await sdk.CreateEvaluationTemplateEdition({
        input: {
            templateId,
            version: 1,
            categories: categoriesInput
        }
    });
    const editionId = editionRes.createEvaluationTemplateEdition.id;
    console.log(`  Created template edition: ${editionId}`);

    // 3. Activate the edition
    await sdk.ActivateEvaluationTemplateEdition({ id: editionId });
    console.log(`  Activated template edition: ${editionId}`);

    // 4. Link it to the commission
    await sdk.SetCommissionTemplateEdition({
        id: commissionId,
        beverageType: "WINE",
        templateEditionId: editionId
    });
    console.log(`  Linked template edition ${editionId} to commission ${commissionId}`);

    // 5. Fetch the template edition using GetCommissionTemplates
    const result = await getCommissionTemplatesWithResultMarkers(commissionId);
    const commissionWithTemplates = result.commission;
    const link = commissionWithTemplates?.templateEditions?.find(l => l.beverageType === "WINE") || commissionWithTemplates?.templateEditions?.[0];
    return link?.templateEdition || null;
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
        const auid = cookieStore.get("auid")?.value ?? "1";
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
        
        try {
            console.log(`Updating candidate ${candidateId} status to EVALUATED...`);
            await sdk.MarkCommissionReplicaCandidateAsEvaluated({ id: candidateId });
        } catch (statusErr: any) {
            console.warn(`⚠️ Failed to update candidate status to EVALUATED:`, statusErr.message);
        }

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
                const link = commissionWithTemplates.templateEditions.find(l => l.beverageType === "WINE") || commissionWithTemplates.templateEditions[0];
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
                try {
                    templateEdition = await bootstrapTemplateEditionForCommission(commissionId);
                } catch (bootstrapErr: any) {
                    console.error("❌ Failed to bootstrap template edition:", bootstrapErr.message);
                    templateEdition = null;
                }
            } else {
                console.warn(`⚠️ Skipping template bootstrap: commission is in ${commission.status} status and cannot accept new templates.`);
                templateEdition = null;
            }
        }

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
            }))
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
                wineJumperMiniGameEnabled: commission.competition.wineJumperMiniGameEnabled,
                voiceCommentsEnabled: commission.competition.voiceCommentsEnabled,
                propertyCommentsEnabled: commission.competition.propertyCommentsEnabled,
                evaluationTemplateEdition: templateEdition
            },
            candidateCount: countData.commissionCandidateCount ?? 0,
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
        return response.commissionReplica?.replicaCandidates || [];
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
    const auid = cookieStore.get("auid")?.value ?? "1";
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
        propertyMap: {} as Record<string, { name: string; isResult: boolean }>,
        totalCandidates: 0,
        currentCandidateIndex: -1,
        candidatesLeft: 0,
        candidatesLeftAfterCurrent: 0,
        myEvaluation: null as any,
        ...emptyFeatureFlags,
    };

    if (!isValidUuid(commissionId) || !isValidUuid(replicaId)) {
        return emptyResult;
    }
    try {
        const result = await sdk.GetCommission({ id: commissionId });
        const commission = result.commission;
        if (!commission) return emptyResult;

        const featureFlags = getCompetitionFeatureFlags(commission.competition);

        // Find the specific replica
        const replica = (commission.replicas || []).find((r: any) => r.id === replicaId);
        if (!replica) return emptyResult;

        // Members of this replica only
        const members = (replica.members || []).map((m: any) => ({
            ...m,
            auid: Array.isArray(m.auid) ? m.auid.flat() : m.auid,
        }));

        const currentCandidateId = replica.currentCandidateId || null;
        const currentCandidateObj = (replica.replicaCandidates || []).find((rc: any) => rc.id === currentCandidateId);
        const currentCandidateCode = currentCandidateObj?.candidate?.anonymizedCode || null;

        // All done when there's no current candidate and all replica candidates are EVALUATED
        const replicaCandidates = replica.replicaCandidates || [];
        const totalCandidates = replicaCandidates.length;
        const evaluatedCount = replicaCandidates.filter((rc: any) => rc.status === 'EVALUATED').length;
        const currentCandidateIndex = currentCandidateId
            ? replicaCandidates.findIndex((rc: any) => rc.id === currentCandidateId)
            : -1;
        const candidatesLeft = totalCandidates - evaluatedCount;
        const candidatesLeftAfterCurrent = currentCandidateIndex >= 0
            ? totalCandidates - currentCandidateIndex - 1
            : candidatesLeft;

        const allCandidatesEvaluated = replicaCandidates.length > 0
            && replicaCandidates.every((rc: any) => rc.status === 'EVALUATED');

        let evaluations: any[] = [];
        const propertyMap: Record<string, { name: string; isResult: boolean }> = {};

        if (currentCandidateId) {
            try {
                // Fetch evaluations for this specific replica candidate ID
                evaluations = await getEvaluationsForCandidateAction(currentCandidateId);

                // Fetch template properties to map codes to user-friendly names
                const templateResult = await getCommissionTemplatesWithResultMarkers(commissionId);
                const commissionWithTemplates = templateResult.commission;
                if (commissionWithTemplates && commissionWithTemplates.templateEditions && commissionWithTemplates.templateEditions.length > 0) {
                    const link = commissionWithTemplates.templateEditions.find(l => l.beverageType === "WINE") || commissionWithTemplates.templateEditions[0];
                    const templateEdition = link?.templateEdition;
                    if (templateEdition && templateEdition.categories) {
                        for (const cat of templateEdition.categories) {
                            if (cat.properties) {
                                  for (const prop of cat.properties) {
                                    const meta = {
                                        name: prop.name,
                                        isResult: (prop as { isResult?: boolean }).isResult === true,
                                    };
                                    propertyMap[prop.code] = meta;
                                    // Also index by ID so evaluation comments (which use propertyId) resolve correctly
                                    if (prop.id) propertyMap[String(prop.id)] = meta;
                                }
                            }
                        }
                    }
                }
            } catch (err: any) {
                console.error("Failed to fetch evaluations or template details for wait page:", err);
            }
        }

        const cookieStore = await cookies();
        const actorAuid = cookieStore.get("auid")?.value ?? "1";
        const myMember = members.find((m: any) => memberMatchesActor(m.auid, actorAuid));

        let myEvaluation: any = null;
        if (currentCandidateId) {
            myEvaluation = await getMyEvaluationForCandidateAction(currentCandidateId);
        }
        if (!myEvaluation) {
            for (const rc of [...replicaCandidates].reverse()) {
                try {
                    const candidateEval = await getMyEvaluationForCandidateAction(rc.id);
                    if (candidateEval) {
                        myEvaluation = candidateEval;
                        break;
                    }
                } catch {
                    // try next replica candidate
                }
            }
        }
        if (!myEvaluation && myMember) {
            myEvaluation = findEvaluationForMember(evaluations, myMember.auid);
        }
        if (!myEvaluation) {
            myEvaluation = findEvaluationForMember(evaluations, actorAuid);
        }

        return {
            members,
            currentCandidateId,
            currentCandidateCode,
            allCandidatesEvaluated,
            evaluations,
            propertyMap,
            totalCandidates,
            currentCandidateIndex,
            candidatesLeft,
            candidatesLeftAfterCurrent,
            myEvaluation: myEvaluation ?? null,
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
        const data = await sdk.GetEvaluationsForCandidate({
            replicaCandidateId: candidateId,
            limit: 50,
        });
        return data.evaluationsByReplicaCandidate?.items || [];
    } catch (err: any) {
        console.error("Server Action Error (getEvaluationsForCandidateAction):", err);
        throw new Error(err.message || "Failed to fetch evaluations");
    }
}

export async function markCandidateEvaluatedAction(candidateId: string) {
    if (!isValidUuid(candidateId)) return null;
    try {
        const data = await sdk.MarkCommissionReplicaCandidateAsEvaluated({ id: candidateId });
        return data.markCommissionReplicaCandidateAsEvaluated;
    } catch (err: any) {
        console.error("Server Action Error (markCandidateEvaluatedAction):", err);
        throw new Error(err.message || "Failed to mark candidate as evaluated");
    }
}
