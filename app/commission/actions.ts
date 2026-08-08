"use server"

import { fetchGraphQL, fetchGraphQLRaw, sdk } from '../../lib/apiClient';
import { axusSdk } from '../../lib/axusClient';
import { getGraphQLEndpoint } from '../../lib/graphqlEndpoint';
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
        const headers = await getActorHeaders();
        return await sdk.MarkReplicaMemberReady({ replicaId, memberId }, headers);
    } catch (err: any) {
        console.error("Server Action Error (markMemberReadyAction):", err);
        throw new Error(err.message || "Failed to mark member ready");
    }
}

export async function markMemberNotReadyAction(replicaId: string, memberId: string) {
    if (!isValidUuid(replicaId) || !isValidUuid(memberId)) throw new Error("Invalid UUID parameter");
    try {
        const headers = await getActorHeaders();
        return await sdk.MarkReplicaMemberNotReady({ replicaId, memberId }, headers);
    } catch (err: any) {
        console.error("Server Action Error (markMemberNotReadyAction):", err);
        throw new Error(err.message || "Failed to mark member not ready");
    }
}

export async function planCommissionReplicaAction(id: string) {
    if (!isValidUuid(id)) throw new Error("Invalid UUID parameter");
    try {
        const headers = await getActorHeaders();
        return await sdk.DevPlanCommissionReplica({ id }, { headers });
    } catch (err: any) {
        console.error("Server Action Error (planCommissionReplicaAction):", err);
        throw new Error(err.message || "Failed to plan commission replica");
    }
}

export async function startCommissionAction(id: string, commissionId?: string) {
    if (!isValidUuid(id)) throw new Error("Invalid UUID parameter");
    try {
        const headers = await getActorHeaders();

        // 1. Query replica hierarchy to discover competition, series, commission and candidate data
        let replicaData: any = null;
        try {
            const queryRes = await rawGraphQL(`
                query GetReplicaHierarchy($id: ID!) {
                    commissionReplica(id: $id) {
                        id
                        status
                        members {
                            id
                            auid
                            role
                            isReady
                        }
                        commission {
                            id
                            status
                            candidates {
                                id
                                beverageType {
                                    id
                                    code
                                    name
                                }
                                sample {
                                    id
                                    batch {
                                        id
                                        beverage {
                                            id
                                            name
                                        }
                                    }
                                }
                            }
                            templateEditions {
                                id
                                beverageType {
                                    id
                                    code
                                }
                                templateEdition {
                                    id
                                }
                            }
                            competition {
                                id
                                status
                                series {
                                    id
                                    status
                                }
                            }
                        }
                    }
                }
            `, { id }, headers);
            replicaData = queryRes?.commissionReplica;
        } catch (e: any) {
            console.error("Could not query replica hierarchy:", e?.message);
        }

        // Fallback: if commission candidates weren't fetched from replica, query commission directly
        let candidates = replicaData?.commission?.candidates || [];
        if (candidates.length === 0 && (commissionId || replicaData?.commission?.id)) {
            const targetCommId = commissionId || replicaData?.commission?.id;
            try {
                const commRes = await rawGraphQL(`
                    query GetCommissionCandidates($id: ID!) {
                        commission(id: $id) {
                            id
                            status
                            candidates {
                                id
                                beverageType {
                                    id
                                    code
                                    name
                                }
                                sample {
                                    id
                                    batch {
                                        id
                                        beverage {
                                            id
                                            name
                                        }
                                    }
                                }
                            }
                            templateEditions {
                                id
                                beverageType {
                                    id
                                    code
                                }
                                templateEdition {
                                    id
                                }
                            }
                            competition {
                                id
                                status
                                series {
                                    id
                                    status
                                }
                            }
                        }
                    }
                `, { id: targetCommId }, headers);
                if (commRes?.commission) {
                    if (!replicaData) replicaData = {};
                    replicaData.commission = commRes.commission;
                    candidates = commRes.commission.candidates || [];
                }
            } catch (fallbackErr: any) {
                console.error("Fallback commission query failed:", fallbackErr?.message);
            }
        }

        const seriesId = replicaData?.commission?.competition?.series?.id;
        const seriesStatus = replicaData?.commission?.competition?.series?.status;
        const compId = replicaData?.commission?.competition?.id;
        const compStatus = replicaData?.commission?.competition?.status;
        const commId = replicaData?.commission?.id || commissionId;
        const commStatus = replicaData?.commission?.status;
        const replStatus = replicaData?.status;

        // Validation: Commission must have at least one candidate
        if (candidates.length === 0) {
            throw new Error("Неможливо розпочати дегустацію: додайте щонайменше один зразок (кандидата) до комісії.");
        }

        // 2. Ensure parent Competition Series is APPROVED or PUBLISHED
        if (seriesId && seriesStatus !== 'APPROVED' && seriesStatus !== 'PUBLISHED') {
            if (seriesStatus === 'DRAFT') {
                try { await sdk.DevSubmitCompetitionSeriesForReview({ id: seriesId }, { headers }); } catch (_) {}
            }
            try { await sdk.DevApproveCompetitionSeries({ id: seriesId }, { headers }); } catch (_) {}
            console.log(`✅ Ensured Competition Series ${seriesId} is APPROVED`);
        }

        // 3. Ensure parent Competition is STARTED
        if (compId && compStatus !== 'STARTED') {
            if (compStatus === 'DRAFT') {
                try { await sdk.DevSubmitCompetitionForReview({ id: compId }, { headers }); } catch (_) {}
                try { await sdk.DevApproveCompetition({ id: compId }, { headers }); } catch (_) {}
            }
            if (compStatus === 'DRAFT' || compStatus === 'APPROVED') {
                try { await sdk.DevPlanCompetition({ id: compId }, { headers }); } catch (_) {}
            }
            try { await sdk.DevStartCompetition({ id: compId }, { headers }); } catch (_) {}
            console.log(`✅ Ensured Competition ${compId} is STARTED`);
        }

        // 4. Ensure Commission has template & is STARTED
        if (commId && commStatus !== 'STARTED') {
            if (commStatus === 'DRAFT') {
                // Discover all beverage types from candidates
                const boundBevTypeIds = new Set(
                    (replicaData?.commission?.templateEditions || []).map((te: any) => te.beverageType?.id).filter(Boolean)
                );

                const evalTemplatesRes = await sdk.DevGetEvaluationTemplateEditions();
                const items = evalTemplatesRes.evaluationTemplateEditions?.items || [];
                const activeEditions = items.filter((i: any) => (i.status === 'PUBLISHED' || i.status === 'ACTIVE') && i.categories && i.categories.length > 0);
                const defaultEdition = activeEditions.find((i: any) => i.categories && i.categories.length > 1) || activeEditions[0] || items[0];

                const candidateBevTypes = new Set<string>();
                for (const cand of candidates) {
                    const btId = cand?.beverageType?.id;
                    if (btId) candidateBevTypes.add(btId);
                }

                // If candidate beverage types exist, bind templates for all of them
                if (candidateBevTypes.size > 0) {
                    for (const btId of candidateBevTypes) {
                        if (!boundBevTypeIds.has(btId)) {
                            const editionForType = activeEditions.find((i: any) => i.template?.beverageType?.id === btId) || defaultEdition;
                            if (editionForType) {
                                try {
                                    await sdk.DevSetCommissionTemplateEdition({
                                        id: commId,
                                        beverageTypeId: btId,
                                        templateEditionId: editionForType.id
                                    }, { headers });
                                } catch (teErr: any) {
                                    console.warn(`Could not bind template for beverage type ${btId}:`, teErr?.message);
                                }
                            }
                        }
                    }
                } else if (boundBevTypeIds.size === 0 && defaultEdition) {
                    const beverageTypeId = defaultEdition.template?.beverageType?.id || "11111111-1111-4111-8111-111111111101";
                    try {
                        await sdk.DevSetCommissionTemplateEdition({
                            id: commId,
                            beverageTypeId,
                            templateEditionId: defaultEdition.id
                        }, { headers });
                    } catch (_) {}
                }

                try { await sdk.DevSubmitCommissionForReview({ id: commId }, { headers }); } catch (_) {}
                try { await sdk.DevApproveCommission({ id: commId }, { headers }); } catch (_) {}
            }

            if (commStatus === 'DRAFT' || commStatus === 'APPROVED') {
                try { await sdk.DevPlanCommission({ id: commId }, { headers }); } catch (_) {}
            }

            try {
                await sdk.DevStartCommission({ id: commId }, { headers });
                console.log(`✅ Ensured Commission ${commId} is STARTED`);
            } catch (startCommErr: any) {
                console.error("❌ Failed to start root commission:", startCommErr?.message);
                throw new Error(startCommErr.message || "Failed to start root commission");
            }
        }

        // 5. Ensure Replica is PLANNED
        if (replStatus !== 'PLANNED' && replStatus !== 'STARTED') {
            try {
                await sdk.DevPlanCommissionReplica({ id }, { headers });
                console.log(`✅ Ensured Replica ${id} is PLANNED`);
            } catch (planErr: any) {
                console.warn("DevPlanCommissionReplica:", planErr?.message);
            }
        }

        // 6. Start the Replica tasting session
        const startResult = await sdk.StartCommissionReplica({ id }, { headers });

        // 7. Initialize first candidate for the tasting session
        try {
            const candRes = await sdk.GetReplicaCandidates({ replicaId: id }, { headers });
            const replicaCandidates = candRes.commissionReplica?.replicaCandidates || [];
            const candidatesOrder = candRes.commissionReplica?.commission?.candidates?.map((c: any) => c.id) || [];
            let sortedCandidates = replicaCandidates;
            if (candidatesOrder.length > 0) {
                sortedCandidates = [...replicaCandidates].sort((a: any, b: any) => {
                    const idxA = a.candidate ? candidatesOrder.indexOf(a.candidate.id) : -1;
                    const idxB = b.candidate ? candidatesOrder.indexOf(b.candidate.id) : -1;
                    return idxA - idxB;
                });
            }
            const firstPending = sortedCandidates.find((rc: any) => rc.status === 'PENDING') || sortedCandidates[0];
            if (firstPending) {
                await rawGraphQL(`
                    mutation SetCommissionReplicaCurrentCandidate($id: ID!, $currentCandidateId: ID) {
                        setCommissionReplicaCurrentCandidate(id: $id, currentCandidateId: $currentCandidateId) {
                            id
                            currentCandidateId
                        }
                    }
                `, { id, currentCandidateId: firstPending.id }, headers);
                console.log(`✅ Set initial current candidate ${firstPending.id} for replica ${id}`);
            }
        } catch (setCandErr: any) {
            console.warn("Could not set initial candidate on start:", setCandErr?.message);
        }

        return startResult;
    } catch (err: any) {
        console.error("Server Action Error (startCommissionAction):", err);
        throw new Error(err.message || "Failed to start commission replica");
    }
}

export async function renameCommissionAction(commissionId: string, name: string) {
    if (!isValidUuid(commissionId)) throw new Error("Invalid UUID parameter");
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation RenameCommission($id: ID!, $name: String!) {
                renameCommission(id: $id, name: $name) { id name }
            }
        `, { id: commissionId, name }, headers);
        return { success: true, commission: data.renameCommission };
    } catch (err: any) {
        console.error("Server Action Error (renameCommissionAction):", err);
        return { success: false, error: err.message || "Failed to rename commission" };
    }
}

export async function updateCommissionDatesAction(
    commissionId: string,
    plannedStartDate: string | null,
    plannedEndDate: string | null
) {
    if (!isValidUuid(commissionId)) throw new Error("Invalid UUID parameter");
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation UpdateCommissionDates($id: ID!, $input: PlannedDatesInput!) {
                updateCommissionDates(id: $id, input: $input) { id }
            }
        `, {
            id: commissionId,
            input: {
                start: plannedStartDate ? new Date(plannedStartDate).toISOString() : null,
                end: plannedEndDate ? new Date(plannedEndDate).toISOString() : null
            }
        }, headers);
        return { success: true, commission: data.updateCommissionDates };
    } catch (err: any) {
        console.error("Server Action Error (updateCommissionDatesAction):", err);
        return { success: false, error: err.message || "Failed to update dates" };
    }
}

// CreateCommissionReplicaInput fields confirmed via introspection: commissionId (required),
// name (optional), type (required, CommissionReplicaType enum), chaoticCurrentCandidateChangesEnabled
// (optional Boolean), members (required — NON_NULL list of NON_NULL items, but an empty array is valid).
// We don't add members here since that's out of scope for now; the shape of each member item
// (CommissionReplicaMemberInput) is still unconfirmed — ask if member assignment gets added later.
export async function createCommissionReplicaAction(input: {
    commissionId: string;
    name?: string;
    type: "STANDARD" | "TRAINEE";
    chaoticCurrentCandidateChangesEnabled?: boolean;
}) {
    if (!isValidUuid(input.commissionId)) throw new Error("Invalid UUID parameter");
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation CreateCommissionReplica($input: CreateCommissionReplicaInput!) {
                createCommissionReplica(input: $input) {
                    id
                    name
                    type
                    status
                }
            }
        `, {
            input: {
                ...input,
                members: [],
            }
        }, headers);
        return { success: true, replica: data.createCommissionReplica };
    } catch (err: any) {
        console.error("Server Action Error (createCommissionReplicaAction):", err);
        return { success: false, error: err.message || "Failed to create replica" };
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
    if (!isValidUuid(candidateId)) return { success: false, error: "Invalid candidateId parameter" };
    try {
        console.log(`📤 Submitting evaluation for candidate ${candidateId}...`, scores);

        const cookieStore = await cookies();
        const auid = cookieStore.get("auid")?.value;
        if (!auid) {
            return { success: false, error: "Unauthorized: Please sign in" };
        }
        const headers: Record<string, string> = {
            "actor": auid,
            "x-actor": auid,
        };

        const response: any = await rawGraphQL(`
            mutation SubmitEvaluation($input: SubmitEvaluationInput!) {
                submitEvaluation(input: $input) {
                    id
                    isComplete
                    scores {
                        code
                        value
                    }
                }
            }
        `, {
            input: {
                candidateId,
                scores,
                ...(comments && comments.length > 0 ? { comments } : {}),
            }
        }, headers);

        if (response?.submitEvaluation) {
            return { success: true, evaluation: response.submitEvaluation };
        }

        return { success: false, error: "Не вдалося зберегти оцінку." };
    } catch (err: any) {
        console.error("Server Action Error (submitEvaluationAction):", err);
        return { success: false, error: err?.message || "Failed to submit evaluation" };
    }
}

export async function setCommissionTemplateAction(
    commissionId: string,
    beverageTypeId: string,
    templateEditionId: string
) {
    if (!isValidUuid(commissionId) || !isValidUuid(templateEditionId) || !isValidUuid(beverageTypeId)) {
        throw new Error("Invalid UUID parameter");
    }
    try {
        const headers = await getActorHeaders();
        const data = await sdk.SetCommissionTemplateEdition({
            id: commissionId,
            beverageTypeId,
            templateEditionId
        }, { headers });

        templatesCache.delete(commissionId);

        return { success: true, id: data.setCommissionTemplateEdition?.id };
    } catch (err: any) {
        console.error("Server Action Error (setCommissionTemplateAction):", err);
        return { success: false, error: err.message || "Failed to assign template" };
    }
}

export async function getCommissionDataAction(commissionId: string) {
    if (!isValidUuid(commissionId)) return null;
    try {
        const detailQuery = `
            query GetCommissionDetail($id: ID!) {
                commission(id: $id) {
                    id
                    name
                    status
                    plannedDates {
                        start
                        end
                    }
                    startedAt
                    endedAt
                    createdAt
                    wineJumperMiniGameEnabled
                    voiceCommentsEnabled
                    propertyCommentsEnabled
                    beverageOriginDuringEvaluationEnabled
                    panels {
                        id
                        name
                        candidates {
                            id
                            panelId
                            anonymizedCode
                            sample {
                                id
                                volumeMl
                                batch {
                                    id
                                    lotNumber
                                    volumeMl
                                    attributes
                                    beverage {
                                        id
                                        name
                                    }
                                }
                            }
                        }
                    }
                    candidates {
                        id
                        panelId
                        anonymizedCode
                        sample {
                            id
                            volumeMl
                            batch {
                                id
                                lotNumber
                                volumeMl
                                attributes
                                beverage {
                                    id
                                    name
                                }
                            }
                        }
                    }
                    competition {
                        id
                        name
                        holders
                    }
                    replicas {
                        id
                        name
                        type
                        status
                        currentCandidateId
                        members {
                            id
                            auid
                            role
                            isReady
                        }
                        replicaCandidates {
                            id
                            status
                            candidate {
                                id
                                anonymizedCode
                                panelId
                            }
                        }
                    }
                }
            }
        `;

        const [commissionRes, countData] = await Promise.all([
            rawGraphQL(detailQuery, { id: commissionId }),
            sdk.GetCommissionCandidateCount({ commissionId })
        ]);
        const commission = commissionRes?.commission;
        if (!commission) return null;

        // Fetch template editions
        let templateEditions: any[] = [];
        try {
            console.log(`🔍 Fetching templates for commission ${commissionId}...`);
            const templateResult = await getCommissionTemplatesWithResultMarkers(commissionId);
            const commissionWithTemplates = templateResult.commission;

            if (commissionWithTemplates && commissionWithTemplates.templateEditions) {
                templateEditions = commissionWithTemplates.templateEditions.map((link: any) => ({
                    id: link.id,
                    beverageType: link.beverageType,
                    templateEdition: link.templateEdition
                }));
            }
        } catch (err: any) {
            console.warn("❌ Failed to fetch template editions from backend:", err.message);
        }

        // Для зворотної сумісності залишаємо один legacy template
        const validEditions = templateEditions.filter((link: any) => {
            const te = link.templateEdition;
            return te && te.categories && te.categories.length > 0 &&
                te.categories.every((c: any) => c.properties && c.properties.length > 0 && c.properties.every((p: any) => p.id && p.code && p.name));
        });

const defaultLink = validEditions.find((l: any) => l.beverageType?.code === "WINE") || validEditions[0];
        let legacyTemplateEdition = defaultLink?.templateEdition || null;

        if (!legacyTemplateEdition) {
            if (commission.status === "DRAFT" || commission.status === "PLANNED") {
                try {
                    console.log(`⚡ Auto-bootstrapping template for commission ${commissionId}...`);
                    const evalTemplatesRes = await sdk.DevGetEvaluationTemplateEditions();
                    const items = evalTemplatesRes.evaluationTemplateEditions?.items || [];
                    const activeEdition = items.find((i: any) => 
                        (i.status === 'PUBLISHED' || i.status === 'ACTIVE') && 
                        i.categories && i.categories.length > 1
                    ) || items.find((i: any) => i.categories && i.categories.length > 0) || items[0];

                    if (activeEdition) {
                        const beverageTypeId = activeEdition.template?.beverageType?.id || "11111111-1111-4111-8111-111111111101";
                        const headers = await getActorHeaders();
                        await sdk.DevSetCommissionTemplateEdition({
                            id: commissionId,
                            beverageTypeId,
                            templateEditionId: activeEdition.id
                        }, { headers });
                        console.log(`✅ Auto-bound template edition "${activeEdition.template?.name || activeEdition.id}" to commission ${commissionId}`);

                        // Clear cache and re-fetch template edition
                        templatesCache.delete(commissionId);
                        const templateResult = await getCommissionTemplatesWithResultMarkers(commissionId);
                        const commissionWithTemplates = templateResult.commission;
                        if (commissionWithTemplates?.templateEditions?.length) {
                            templateEditions = commissionWithTemplates.templateEditions.map((link: any) => ({
                                id: link.id,
                                beverageType: link.beverageType,
                                templateEdition: link.templateEdition
                            }));
                            const link = commissionWithTemplates.templateEditions.find((l: any) => l.beverageType.code === "WINE") || commissionWithTemplates.templateEditions[0];
                            legacyTemplateEdition = link?.templateEdition || null;
                        }
                    }
                } catch (bootstrapErr: any) {
                    console.error("❌ Failed to auto-bootstrap template edition:", bootstrapErr.message);
                    legacyTemplateEdition = null;
                }
            } else {
                console.warn(`⚠️ Skipping template bootstrap: commission is in ${commission.status} status and cannot accept new templates.`);
                legacyTemplateEdition = null;
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
            candidateCount: (r.replicaCandidates && r.replicaCandidates.length > 0) ? r.replicaCandidates.length : (countData.commissionCandidateCount ?? (commission.candidates?.length || 0)),
            replicaCandidates: (r.replicaCandidates || []).map((rc: any) => ({
                id: rc.id,
                status: rc.status,
                candidate: rc.candidate ? {
                    id: rc.candidate.id,
                    anonymizedCode: rc.candidate.anonymizedCode || null,
                    beverageType: rc.candidate.beverageType || null,
                    panelId: rc.candidate.panelId || null,
                } : null
            })).sort((a: any, b: any) => {
                const idxA = a.candidate ? candidatesOrder.indexOf(a.candidate.id) : -1;
                const idxB = b.candidate ? candidatesOrder.indexOf(b.candidate.id) : -1;
                return idxA - idxB;
            })
        }));

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
                evaluationTemplateEdition: legacyTemplateEdition
            },
            templateEditions, // ПЕРЕДАЄМО НОВИЙ МАСИВ НА ФРОНТЕНД
            candidateCount: countData.commissionCandidateCount ?? (commission.candidates?.length || 0),
            panels: commission.panels || [],
            candidates: commission.candidates || [],
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

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || getGraphQLEndpoint() || 'https://winelore-dev.thewinelore.com/graphql';

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
    const text = await res.text();
    let json: any;
    try {
        json = JSON.parse(text);
    } catch {
        const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        console.error(`[rawGraphQL] Received non-JSON response (HTTP ${res.status}):`, text.slice(0, 500));
        throw new Error(
            res.status >= 500
                ? `GraphQL server error (${res.status}): Сервер тимчасово недоступний`
                : `GraphQL response error (${res.status}): ${cleanText.slice(0, 150) || 'Некоректна відповідь сервера'}`
        );
    }
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
        currentPanelId: null as string | null,
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
        let currentCandidateId = replica.currentCandidateId || null;
        if (!currentCandidateId && replica.status === 'STARTED' && replicaCandidates.length > 0) {
            const firstPending = replicaCandidates.find((rc: any) => rc.status === 'PENDING') || replicaCandidates[0];
            if (firstPending) {
                try {
                    const actorHeaders = await getActorHeaders().catch(() => ({}));
                    await rawGraphQL(`
                        mutation SetCommissionReplicaCurrentCandidate($id: ID!, $currentCandidateId: ID) {
                            setCommissionReplicaCurrentCandidate(id: $id, currentCandidateId: $currentCandidateId) {
                                id
                                currentCandidateId
                            }
                        }
                    `, { id: replicaId, currentCandidateId: firstPending.id }, actorHeaders);
                    currentCandidateId = firstPending.id;
                    console.log(`✅ Auto-initialized current candidate ${firstPending.id} for replica ${replicaId}`);
                } catch (autoSetErr: any) {
                    console.warn("Could not auto-set current candidate in getWaitDataAction:", autoSetErr?.message);
                    currentCandidateId = firstPending.id;
                }
            }
        }
        const currentCandidateObj = replicaCandidates.find((rc: any) => rc.id === currentCandidateId);
        const currentCandidateCode = currentCandidateObj?.candidate?.anonymizedCode || null;
        let currentPanelId = currentCandidateObj?.candidate?.panelId || null;
        if (!currentPanelId && replicaCandidates.length > 0) {
            const lastEvaluated = [...replicaCandidates].reverse().find((rc: any) => isReplicaCandidateFinished(rc.status));
            if (lastEvaluated) {
                currentPanelId = lastEvaluated.candidate?.panelId || null;
            } else {
                currentPanelId = replicaCandidates[0].candidate?.panelId || null;
            }
        }
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
            currentPanelId,
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

export async function renameCommissionReplicaAction(id: string, name?: string) {
    if (!isValidUuid(id)) throw new Error("Invalid UUID parameter");
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation RenameCommissionReplica($id: ID!, $name: String) {
                renameCommissionReplica(id: $id, name: $name) {
                    id
                    name
                    type
                    status
                }
            }
        `, {
            id,
            name
        }, headers);
        return {success: true, replica: data.renameCommissionReplica};
    } catch (err: any) {
        console.error("Server Action Error (renameCommissionReplicaAction):", err);
        return {success: false, error: err.message || "Failed to rename replica"};
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

const AXUS_GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_AXUS_GRAPHQL_ENDPOINT || 'https://axusid.thewinelore.com/graphql';

async function fetchAxusGraphQL(query: string, variables: Record<string, any> = {}) {
    const res = await fetch(AXUS_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
        next: { revalidate: 0 }
    });
    const json = await res.json();
    if (json.errors) {
        throw new Error(json.errors[0]?.message || 'AXUS ID GraphQL Query Error');
    }
    return json.data;
}

export async function searchUserByUsernameAction(username: string) {
    const trimmed = username.trim().replace(/^@/, "");
    if (!trimmed) return { success: false, error: "Введіть юзернейм" };
    try {
        const ownerRes = await axusSdk.OwnerByUsername({ username: trimmed });
        const auid = ownerRes?.ownerByUsername;
        if (!auid) {
            return { success: false, error: `Користувача @${trimmed} не знайдено` };
        }

        let displayName = `@${trimmed}`;
        try {
            const varData = await fetchAxusGraphQL(`
                query GetUserVars($auid: ID!) {
                    defaultVariation(auid: $auid) {
                        variationId
                    }
                    variations(auid: $auid) {
                        id
                    }
                }
            `, { auid: String(auid) });

            const variationId = varData?.defaultVariation?.variationId || varData?.variations?.[0]?.id;
            if (variationId) {
                const nameData = await fetchAxusGraphQL(`
                    query GetName($variationId: ID!) {
                        name(variationId: $variationId) {
                            displayName
                        }
                    }
                `, { variationId });
                
                if (nameData?.name?.displayName) {
                    displayName = nameData.name.displayName;
                }
            }
        } catch (detailErr) {
            console.warn("Failed to fetch user details for auid", auid, detailErr);
        }

        return {
            success: true,
            user: {
                auid: Number(auid),
                username: trimmed,
                displayName
            }
        };
    } catch (err: any) {
        console.error("searchUserByUsernameAction error:", err);
        return { success: false, error: err.message || "Помилка пошуку користувача" };
    }
}

export async function addCommissionReplicaMemberAction(
    replicaId: string,
    auid: number,
    role: "HEAD" | "EXPERT" = "EXPERT"
) {
    if (!isValidUuid(replicaId)) return { success: false, error: "Invalid replicaId parameter" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation AddCommissionReplicaMember($id: ID!, $input: CommissionReplicaMemberInput!) {
                addCommissionReplicaMember(id: $id, input: $input) {
                    id
                    name
                    members {
                        id
                        auid
                        role
                        isReady
                    }
                }
            }
        `, {
            id: replicaId,
            input: {
                auid: [auid],
                role
            }
        }, headers);
        return { success: true, replica: data.addCommissionReplicaMember };
    } catch (err: any) {
        console.error("Server Action Error (addCommissionReplicaMemberAction):", err);
        return { success: false, error: err.message || "Не вдалося додати учасника" };
    }
}

export async function removeCommissionReplicaMemberAction(replicaId: string, memberId: string) {
    if (!isValidUuid(replicaId) || !isValidUuid(memberId)) return { success: false, error: "Invalid parameters" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation RemoveCommissionReplicaMember($id: ID!, $memberId: ID!) {
                removeCommissionReplicaMember(id: $id, memberId: $memberId) {
                    id
                    name
                    members {
                        id
                        auid
                        role
                        isReady
                    }
                }
            }
        `, {
            id: replicaId,
            memberId
        }, headers);
        return { success: true, replica: data.removeCommissionReplicaMember };
    } catch (err: any) {
        console.error("Server Action Error (removeCommissionReplicaMemberAction):", err);
        return { success: false, error: err.message || "Не вдалося видалити учасника" };
    }
}

export async function addCommissionPanelAction(commissionId: string, name: string) {
    if (!isValidUuid(commissionId)) return { success: false, error: "Invalid commissionId parameter" };
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: "Вкажіть назву панелі" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation AddCommissionPanel($commissionId: ID!, $name: String!) {
                addCommissionPanel(commissionId: $commissionId, name: $name) {
                    id
                    name
                }
            }
        `, {
            commissionId,
            name: trimmed
        }, headers);
        return { success: true, panel: data.addCommissionPanel };
    } catch (err: any) {
        console.error("Server Action Error (addCommissionPanelAction):", err);
        return { success: false, error: err.message || "Не вдалося створити панель" };
    }
}

export async function renameCommissionPanelAction(commissionId: string, panelId: string, name: string) {
    if (!isValidUuid(commissionId) || !isValidUuid(panelId)) return { success: false, error: "Invalid parameters" };
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: "Вкажіть назву панелі" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation RenameCommissionPanel($commissionId: ID!, $panelId: ID!, $name: String!) {
                renameCommissionPanel(commissionId: $commissionId, panelId: $panelId, name: $name) {
                    id
                    name
                }
            }
        `, {
            commissionId,
            panelId,
            name: trimmed
        }, headers);
        return { success: true, panel: data.renameCommissionPanel };
    } catch (err: any) {
        console.error("Server Action Error (renameCommissionPanelAction):", err);
        return { success: false, error: err.message || "Не вдалося перейменувати панель" };
    }
}

export async function removeCommissionPanelAction(commissionId: string, panelId: string) {
    if (!isValidUuid(commissionId) || !isValidUuid(panelId)) return { success: false, error: "Invalid parameters" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation RemoveCommissionPanel($commissionId: ID!, $panelId: ID!) {
                removeCommissionPanel(commissionId: $commissionId, panelId: $panelId) {
                    id
                }
            }
        `, {
            commissionId,
            panelId
        }, headers);
        return { success: true, result: data.removeCommissionPanel };
    } catch (err: any) {
        console.error("Server Action Error (removeCommissionPanelAction):", err);
        return { success: false, error: err.message || "Не вдалося видалити панель" };
    }
}

export async function searchBeveragesAction(search?: string, page: number = 1, limit: number = 8) {
    try {
        const trimmed = search?.trim();
        const offset = Math.max(0, (page - 1) * limit);

        if (trimmed) {
            const data = await rawGraphQL(`
                query SearchBeverages($query: String!, $limit: Int!, $offset: Int!) {
                    search(query: $query, types: [BEVERAGE], limit: $limit, offset: $offset) {
                        items {
                            id
                            name
                        }
                    }
                }
            `, { query: trimmed, limit, offset });
            const items = (data?.search?.items || []).filter((b: any) => b?.id && b?.name);
            const hasMore = items.length === limit;
            const totalPages = hasMore ? Math.max(page + 1, 2) : page;
            return {
                success: true,
                items,
                page,
                limit,
                totalPages,
                hasMore,
            };
        } else {
            const data = await rawGraphQL(`
                query GetBeverages($limit: Int!, $offset: Int!) {
                    beverages(limit: $limit, offset: $offset) {
                        items {
                            id
                            name
                        }
                    }
                    beverageCount
                }
            `, { limit, offset });
            const items = (data?.beverages?.items || []).filter((b: any) => b?.id && b?.name);
            const totalCount = data?.beverageCount || items.length;
            const totalPages = Math.ceil(totalCount / limit);
            return {
                success: true,
                items,
                page,
                limit,
                totalCount,
                totalPages,
                hasMore: page < totalPages,
            };
        }
    } catch (err: any) {
        console.error("Server Action Error (searchBeveragesAction):", err);
        return { success: false, items: [], page, limit, totalPages: 1, hasMore: false, error: err.message || "Помилка пошуку напоїв" };
    }
}

export async function getBatchesForBeverageAction(beverageId: string, page: number = 1, limit: number = 8) {
    if (!isValidUuid(beverageId)) return { success: false, items: [], page, limit, totalPages: 1, hasMore: false };
    try {
        const offset = Math.max(0, (page - 1) * limit);
        const data = await rawGraphQL(`
            query GetBatches($beverageId: ID!, $limit: Int!, $offset: Int!) {
                batches(beverageId: $beverageId, limit: $limit, offset: $offset) {
                    items {
                        id
                        lotNumber
                        volumeMl
                        createdAt
                        attributes
                    }
                }
                batchCount(beverageId: $beverageId)
            }
        `, { beverageId, limit, offset });
        const items = data?.batches?.items || [];
        const totalCount = typeof data?.batchCount === 'number' ? data.batchCount : items.length;
        const totalPages = Math.max(1, Math.ceil(totalCount / limit));
        return {
            success: true,
            items,
            page,
            limit,
            totalCount,
            totalPages,
            hasMore: page < totalPages,
        };
    } catch (err: any) {
        console.error("Server Action Error (getBatchesForBeverageAction):", err);
        return { success: false, items: [], page, limit, totalPages: 1, hasMore: false, error: err.message || "Помилка отримання партій" };
    }
}

export async function getSamplesForBatchAction(batchId: string, page: number = 1, limit: number = 8) {
    if (!isValidUuid(batchId)) return { success: false, items: [], page, limit, totalPages: 1, hasMore: false };
    try {
        const offset = Math.max(0, (page - 1) * limit);
        const data = await rawGraphQL(`
            query GetSamples($batchId: ID!, $limit: Int!, $offset: Int!) {
                samples(batchId: $batchId, limit: $limit, offset: $offset) {
                    items {
                        id
                        volumeMl
                        createdAt
                    }
                }
                sampleCount(batchId: $batchId)
            }
        `, { batchId, limit, offset });
        const items = data?.samples?.items || [];
        const totalCount = typeof data?.sampleCount === 'number' ? data.sampleCount : items.length;
        const totalPages = Math.max(1, Math.ceil(totalCount / limit));
        return {
            success: true,
            items,
            page,
            limit,
            totalCount,
            totalPages,
            hasMore: page < totalPages,
        };
    } catch (err: any) {
        console.error("Server Action Error (getSamplesForBatchAction):", err);
        return { success: false, items: [], page, limit, totalPages: 1, hasMore: false, error: err.message || "Помилка отримання зразків" };
    }
}

export async function addCommissionCandidateAction(input: {
    commissionId: string;
    panelId: string;
    sampleId: string;
    anonymizedCode?: string;
}) {
    if (!isValidUuid(input.commissionId) || !isValidUuid(input.panelId) || !isValidUuid(input.sampleId)) {
        return { success: false, error: "Некоректні параметри кандидата" };
    }
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation AddCommissionCandidate($input: AddCommissionCandidateInput!) {
                addCommissionCandidate(input: $input) {
                    id
                    panelId
                    anonymizedCode
                    sample {
                        id
                        volumeMl
                        batch {
                            id
                            lotNumber
                            volumeMl
                            beverage {
                                id
                                name
                            }
                        }
                    }
                }
            }
        `, {
            input: {
                commissionId: input.commissionId,
                panelId: input.panelId,
                sampleId: input.sampleId,
                anonymizedCode: input.anonymizedCode ? input.anonymizedCode.trim() : null
            }
        }, headers);

        // Auto-bind template edition if needed while commission is in DRAFT
        try {
            const commRes = await rawGraphQL(`
                query CheckCommissionTemplates($id: ID!) {
                    commission(id: $id) {
                        id
                        status
                        templateEditions {
                            id
                            beverageType {
                                id
                                code
                            }
                        }
                    }
                }
            `, { id: input.commissionId }, headers);

            if (commRes?.commission?.status === 'DRAFT') {
                const existingBevTypeIds = new Set(
                    (commRes.commission.templateEditions || []).map((te: any) => te.beverageType?.id).filter(Boolean)
                );

                // Fetch beverage type for the sample's beverage
                const bevId = data?.addCommissionCandidate?.sample?.batch?.beverage?.id;
                let candidateBevTypeId: string | null = null;
                if (bevId) {
                    const bevRes = await rawGraphQL(`
                        query GetBeverageType($id: ID!) {
                            beverage(id: $id) {
                                id
                                type {
                                    id
                                    code
                                }
                            }
                        }
                    `, { id: bevId }, headers);
                    candidateBevTypeId = bevRes?.beverage?.type?.id || null;
                }

                // If template not set for this beverage type, bind active template edition
                if (candidateBevTypeId && !existingBevTypeIds.has(candidateBevTypeId)) {
                    const evalTemplatesRes = await sdk.DevGetEvaluationTemplateEditions();
                    const items = evalTemplatesRes.evaluationTemplateEditions?.items || [];
                    const matchingEdition = items.find((i: any) => 
                        (i.status === 'PUBLISHED' || i.status === 'ACTIVE') && 
                        i.template?.beverageType?.id === candidateBevTypeId &&
                        i.categories && i.categories.length > 0
                    ) || items.find((i: any) => (i.status === 'PUBLISHED' || i.status === 'ACTIVE') && i.categories && i.categories.length > 0) || items[0];

                    if (matchingEdition) {
                        await sdk.DevSetCommissionTemplateEdition({
                            id: input.commissionId,
                            beverageTypeId: candidateBevTypeId,
                            templateEditionId: matchingEdition.id
                        }, { headers });
                        templatesCache.delete(input.commissionId);
                    }
                }
            }
        } catch (autoTplErr: any) {
            console.warn("Could not auto-bind template for candidate beverage type:", autoTplErr?.message);
        }

        return { success: true, candidate: data.addCommissionCandidate };
    } catch (err: any) {
        console.error("Server Action Error (addCommissionCandidateAction):", err);
        return { success: false, error: err.message || "Не вдалося додати кандидата" };
    }
}

export async function removeCommissionCandidateAction(candidateId: string) {
    if (!isValidUuid(candidateId)) return { success: false, error: "Invalid candidateId parameter" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation RemoveCommissionCandidate($candidateId: ID!) {
                removeCommissionCandidate(candidateId: $candidateId)
            }
        `, { candidateId }, headers);
        return { success: true, result: data.removeCommissionCandidate };
    } catch (err: any) {
        console.error("Server Action Error (removeCommissionCandidateAction):", err);
        return { success: false, error: err.message || "Не вдалося видалити кандидата" };
    }
}

export async function changeCommissionCandidateCodeAction(candidateId: string, anonymizedCode: string) {
    if (!isValidUuid(candidateId)) return { success: false, error: "Invalid candidateId parameter" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation ChangeCommissionCandidateCode($id: ID!, $anonymizedCode: String) {
                changeCommissionCandidateCode(id: $id, anonymizedCode: $anonymizedCode) {
                    id
                    anonymizedCode
                }
            }
        `, {
            id: candidateId,
            anonymizedCode: anonymizedCode ? anonymizedCode.trim() : null
        }, headers);
        return { success: true, candidate: data.changeCommissionCandidateCode };
    } catch (err: any) {
        console.error("Server Action Error (changeCommissionCandidateCodeAction):", err);
        return { success: false, error: err.message || "Не вдалося змінити код" };
    }
}

export async function reorderCommissionCandidatesAction(commissionId: string, panelId: string, candidateIds: string[]) {
    if (!isValidUuid(commissionId)) return { success: false, error: "Invalid commissionId parameter" };
    if (!isValidUuid(panelId)) return { success: false, error: "Invalid panelId parameter" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation ReorderCommissionCandidates($commissionId: ID!, $panelId: ID!, $candidateIds: [ID!]!) {
                reorderCommissionCandidates(commissionId: $commissionId, panelId: $panelId, candidateIds: $candidateIds) {
                    id
                }
            }
        `, { commissionId, panelId, candidateIds }, headers);
        return { success: true, commission: data.reorderCommissionCandidates };
    } catch (err: any) {
        console.error("Server Action Error (reorderCommissionCandidatesAction):", err);
        return { success: false, error: err.message || "Не вдалося змінити порядок кандидатів" };
    }
}