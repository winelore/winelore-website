"use server"

import { fetchGraphQL, fetchGraphQLRaw, sdk } from '../../lib/apiClient';
import { getAxusConfig } from '../../lib/axusConfig';
import { findUserByUsername } from '@winelore/core/auth';
import { GetCommissionTemplatesDocument as LegacyGetCommissionTemplatesDocument } from '@winelore/core/gql/graphql';
import {
    GET_COMMISSION_TEMPLATES_DEEP_QUERY,
    type GetCommissionTemplatesDeepResult,
    type GetCommissionTemplatesDeepVariables,
} from '@winelore/core';
import { cookies } from "next/headers";
import {
    findEvaluationForMember,
    memberMatchesActor,
} from '@winelore/core';
import { isReplicaCandidateFinished } from "./replicaUtils";
import {
    ADD_COMMISSION_REPLICA_MEMBER,
    ADD_COMMISSION_PANEL,
    CHANGE_COMMISSION_CANDIDATE_CODE,
    COMMISSION_SETTINGS,
    CREATE_COMMISSION_REPLICA,
    REMOVE_COMMISSION_CANDIDATE,
    REMOVE_COMMISSION_PANEL,
    REMOVE_COMMISSION_TEMPLATE_EDITION,
    RENAME_COMMISSION_PANEL,
    REORDER_COMMISSION_CANDIDATES,
    addCommissionCandidate,
    candidateCodeInput,
    loadBatchPage,
    loadBeveragePage,
    loadSamplePage,
    REMOVE_COMMISSION_REPLICA_MEMBER,
    RENAME_COMMISSION,
    RENAME_COMMISSION_REPLICA,
    SET_REPLICA_CHAOTIC_PANEL_CHANGES,
    SET_REPLICA_PANEL_CHAOTIC_CANDIDATE_CHANGES,
    UPDATE_COMMISSION_DATES,
    commissionDatesInput,
    loadCommissionPage,
    startCommissionReplica,
    type CommissionSetting,
} from '@winelore/core/commission';

const settingMutation = (key: CommissionSetting) => {
    const setting = COMMISSION_SETTINGS.find((setting) => setting.key === key);
    if (!setting) throw new Error(`Unknown commission setting: ${key}`);
    return setting.mutation;
};
import { buildPropertyMapFromCommissionTemplates } from '@winelore/core';
import type { PropertyMeta } from '@winelore/core';
import {
    AdvancePanelError,
    advancePanel,
    emptyTastingSummary,
    emptyWaitRoom,
    loadMyTastingSummary,
    loadWaitRoom,
    replicaCandidatesInTastingOrder,
    type MyTastingSummaryData,
    type SummaryCommission,
    type TastingSummarySource,
    type WaitRoomCommission,
} from '@winelore/core/commission';

export type { MyTastingSummaryData } from '@winelore/core/commission';
export type DiscussionPolicy = "ALWAYS" | "AFTER_EVALUATION" | "DISABLED";

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
        return await sdk.MarkReplicaMemberReady({ replicaId, memberId }, { headers });
    } catch (err: any) {
        console.error("Server Action Error (markMemberReadyAction):", err);
        throw new Error(err.message || "Failed to mark member ready");
    }
}

export async function markMemberNotReadyAction(replicaId: string, memberId: string) {
    if (!isValidUuid(replicaId) || !isValidUuid(memberId)) throw new Error("Invalid UUID parameter");
    try {
        const headers = await getActorHeaders();
        return await sdk.MarkReplicaMemberNotReady({ replicaId, memberId }, { headers });
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

export async function submitCommissionForReviewAction(id: string) {
    if (!isValidUuid(id)) throw new Error("Invalid UUID parameter");
    try {
        const headers = await getActorHeaders();
        return await sdk.DevSubmitCommissionForReview({ id }, { headers });
    } catch (err: any) {
        console.error("Server Action Error (submitCommissionForReviewAction):", err);
        throw new Error(err.message || "Failed to submit commission for review");
    }
}

export async function startCommissionAction(id: string, commissionId?: string) {
    if (!isValidUuid(id)) throw new Error("Invalid UUID parameter");
    try {
        const headers = await getActorHeaders();
        // The whole start sequence is core's, so a chair starting from the app does the same.
        return await startCommissionReplica(
            (query, variables) => rawGraphQL(query, variables ?? {}, headers),
            id,
            commissionId,
            (context, error: any) => console.warn(`startCommissionAction: ${context}:`, error?.message),
        );
    } catch (err: any) {
        console.error("Server Action Error (startCommissionAction):", err);
        throw new Error(err.message || "Failed to start commission replica");
    }
}

export async function renameCommissionAction(commissionId: string, name: string) {
    if (!isValidUuid(commissionId)) throw new Error("Invalid UUID parameter");
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(RENAME_COMMISSION, { id: commissionId, name }, headers);
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
        const data = await rawGraphQL(UPDATE_COMMISSION_DATES, {
            id: commissionId,
            input: commissionDatesInput(plannedStartDate, plannedEndDate),
        }, headers);
        return { success: true, commission: data.updateCommissionDates };
    } catch (err: any) {
        console.error("Server Action Error (updateCommissionDatesAction):", err);
        return { success: false, error: err.message || "Failed to update dates" };
    }
}

// CreateCommissionReplicaInput fields confirmed via introspection: commissionId (required),
// name (optional), type (required, CommissionReplicaType enum), chaoticCurrentPanelChangesEnabled
// (optional Boolean), members (required — NON_NULL list of NON_NULL items, but an empty array is valid).
// We don't add members here since that's out of scope for now; the shape of each member item
// (CommissionReplicaMemberInput) is still unconfirmed — ask if member assignment gets added later.
export async function createCommissionReplicaAction(input: {
    commissionId: string;
    name?: string;
    type: "STANDARD" | "TRAINEE";
    chaoticCurrentPanelChangesEnabled?: boolean;
}) {
    if (!isValidUuid(input.commissionId)) throw new Error("Invalid UUID parameter");
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(CREATE_COMMISSION_REPLICA, {
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

        const headers = await getActorHeaders();

        let submitResult: any = null;
        let evalId: string | null = null;

        try {
            const data = await sdk.SubmitEvaluation({
                input: {
                    candidateId,
                    scores,
                    ...(comments && comments.length > 0 ? { comments } : {}),
                }
            }, { headers });
            submitResult = data.submitEvaluation;
            evalId = submitResult?.id ?? null;
        } catch (submitErr: any) {
            const msg = String(submitErr?.message || "");
            if (
                msg.includes("already submitted") ||
                msg.includes("not pending") ||
                msg.includes("REPLICA_CANDIDATE_EVALUATION_ENDED") ||
                msg.includes("EVALUATION_ALREADY_EXISTS")
            ) {
                console.log("Evaluation already exists upon submit, attempting to retrieve and confirm it...");
                const existingEval = await getMyEvaluationForCandidateAction(candidateId);
                if (existingEval?.id) {
                    evalId = existingEval.id;
                    submitResult = existingEval;
                } else {
                    throw submitErr;
                }
            } else {
                throw submitErr;
            }
        }

        if (evalId) {
            let finalEvaluation: any = {
                ...submitResult,
                status: "CONFIRMED",
                isComplete: true,
            };

            try {
                let confirmData: any = null;
                for (let attempt = 0; attempt < 2; attempt++) {
                    try {
                        confirmData = await sdk.ConfirmEvaluation({ id: evalId }, { headers });
                        if (confirmData?.confirmEvaluation) break;
                    } catch (retryErr) {
                        if (attempt === 0) {
                            await new Promise((resolve) => setTimeout(resolve, 250));
                        } else {
                            throw retryErr;
                        }
                    }
                }

                if (confirmData?.confirmEvaluation) {
                    finalEvaluation = {
                        ...finalEvaluation,
                        ...confirmData.confirmEvaluation,
                    };
                }
            } catch (confirmErr: any) {
                console.warn("Auto-confirm evaluation warning:", confirmErr?.message);
            }

            return { success: true, evaluation: finalEvaluation };
        }

        return { success: false, error: "Failed to submit evaluation" };
    } catch (err: any) {
        console.error("Server Action Error (submitEvaluationAction):", err);
        return { success: false, error: err?.message || "Failed to submit evaluation" };
    }
}

export async function confirmEvaluationAction(evaluationId: string) {
    if (!isValidUuid(evaluationId)) return { success: false, error: "Invalid evaluationId parameter" };
    try {
        const headers = await getActorHeaders();
        const data = await sdk.ConfirmEvaluation({ id: evaluationId }, { headers });

        if (data?.confirmEvaluation) {
            return { success: true, evaluation: data.confirmEvaluation };
        }

        return { success: false, error: "Failed to confirm evaluation" };
    } catch (err: any) {
        console.error("Server Action Error (confirmEvaluationAction):", err);
        return { success: false, error: err?.message || "Failed to confirm evaluation" };
    }
}

export async function confirmMyEvaluationForCandidateAction(candidateId: string) {
    if (!isValidUuid(candidateId)) return { success: false, error: "Invalid candidateId parameter" };
    try {
        const myEval = await getMyEvaluationForCandidateAction(candidateId);
        if (!myEval?.id) return { success: false, error: "Evaluation not found" };
        return confirmEvaluationAction(myEval.id);
    } catch (err: any) {
        console.error("Server Action Error (confirmMyEvaluationForCandidateAction):", err);
        return { success: false, error: err?.message || "Failed to confirm evaluation" };
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

export async function removeCommissionTemplateAction(commissionId: string, beverageTypeId: string) {
    if (!isValidUuid(commissionId) || !isValidUuid(beverageTypeId)) {
        return { success: false, error: "Invalid parameters" };
    }
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(REMOVE_COMMISSION_TEMPLATE_EDITION, { id: commissionId, beverageTypeId }, headers);

        templatesCache.delete(commissionId);

        return { success: true, id: data.removeCommissionTemplateEdition?.id };
    } catch (err: any) {
        console.error("Server Action Error (removeCommissionTemplateAction):", err);
        return { success: false, error: err.message || "Failed to remove template" };
    }
}

export async function getCommissionDataAction(commissionId: string) {
    if (!isValidUuid(commissionId)) return null;
    try {
        // Shaped by core, which the app's commission screen loads through too.
        return await loadCommissionPage(
            async (id) => (await sdk.GetCommission({ id })).commission,
            getCommissionTemplatesWithResultMarkers,
            commissionId,
            (context, error: any) => console.warn(`❌ Failed to fetch ${context} from backend:`, error?.message),
        );
    } catch (err: any) {
        console.error("Server Action Error (getCommissionDataAction):", err);
        throw new Error(err.message || "Failed to fetch commission data");
    }
}

export async function getReplicaCandidatesAction(replicaId: string) {
    if (!isValidUuid(replicaId)) return [];
    try {
        const response = await sdk.GetReplicaCandidates({ replicaId });
        return replicaCandidatesInTastingOrder(response.commissionReplica);
    } catch (err: any) {
        console.error("Server Action Error (getReplicaCandidatesAction):", err);
        throw new Error(err.message || "Failed to fetch replica candidates");
    }
}

export async function getReplicaCandidateAction(id: string) {
    if (!isValidUuid(id)) return null;
    try {
        const response = await sdk.GetReplicaCandidate({ id });
        const candidate = response.commissionReplicaCandidate;
        if (!candidate) return null;
        return {
            ...candidate,
            replica: candidate.replicaPanel.replica,
            panelId: candidate.replicaPanel.panel.id,
            candidate: { ...candidate.candidate, panelId: candidate.replicaPanel.panel.id },
        };
    } catch (err: any) {
        console.error("Server Action Error (getReplicaCandidateAction):", err);
        throw new Error(err.message || "Failed to fetch replica candidate");
    }
}

/**
 * The summary's fetches, sent as the signed-in expert — core decides which
 * of their evaluations is theirs, as it does for the app.
 */
const tastingSummarySource: TastingSummarySource = {
    replica: async (replicaId) => (await sdk.GetReplicaCandidates({ replicaId })).commissionReplica,
    commission: async (id) => (await sdk.GetCommission({ id })).commission,
    templates: getCommissionTemplatesWithResultMarkers,
    myEvaluation: getMyEvaluationForCandidateAction,
    evaluations: getEvaluationsForCandidateAction,
};

async function fetchMyTastingSummary(replicaId: string, commission?: SummaryCommission): Promise<MyTastingSummaryData> {
    const actorAuid = (await cookies()).get("auid")?.value ?? null;
    return loadMyTastingSummary(tastingSummarySource, replicaId, actorAuid, { commission });
}

export async function getMyTastingSummaryAction(replicaId: string): Promise<MyTastingSummaryData> {
    if (!isValidUuid(replicaId)) return emptyTastingSummary();
    try {
        return await fetchMyTastingSummary(replicaId);
    } catch (err: any) {
        console.error("Server Action Error (getMyTastingSummaryAction):", err);
        return emptyTastingSummary();
    }
}

// Thin wrapper kept so the ~40 call sites below don't need to change; the
// actual HTTP transport and endpoint resolution now live in lib/apiClient.ts
// and lib/graphqlEndpoint.ts, which is the one place either can be reasoned
// about (see WIN consistency audit, item 1.4 — this used to have its own
// endpoint fallback that could silently diverge from every other caller's).
async function rawGraphQL(
    query: string,
    variables: Record<string, any>,
    headers?: Record<string, string>,
) {
    return fetchGraphQLRaw<any, Record<string, any>>(query, variables, headers);
}

async function getActorHeaders(): Promise<Record<string, string>> {
    const cookieStore = await cookies();
    const auid = cookieStore.get("auid")?.value;
    if (!auid) {
        throw new Error("Unauthorized: Please sign in");
    }
    return { "X-ACTOR": auid };
}


export async function getWaitDataAction(commissionId: string, replicaId: string) {
    const empty = emptyWaitRoom();
    const emptyResult = {
        ...empty,
        ...empty.flags,
        commissionName: "",
        discussionsEnabled: true,
        discussionPolicy: "ALWAYS" as DiscussionPolicy,
        myTastingSummary: null as MyTastingSummaryData | null,
        nextPanelId: null as string | null,
        nextPanelFirstCandidateId: null as string | null,
    };

    if (!isValidUuid(commissionId) || !isValidUuid(replicaId)) {
        return emptyResult;
    }
    try {
        const cookieStore = await cookies();
        const actorAuid = cookieStore.get("auid")?.value ?? null;

        // The room itself is core's, so the chair's dashboard and the app's
        // show the same progress from the same server state.
        const result = await sdk.GetCommission({ id: commissionId });
        const commission = result.commission;
        if (!commission) return emptyResult;

        const room = await loadWaitRoom(
            {
                commission: async () => commission as WaitRoomCommission,
                templates: (id) => getCommissionTemplatesWithResultMarkers(id),
                evaluations: (candidateId) => getEvaluationsForCandidateAction(candidateId),
                myEvaluation: (candidateId) => getMyEvaluationForCandidateAction(candidateId),
            },
            commissionId,
            replicaId,
            actorAuid,
        );

        // Which panel runs next is the panel summary's question, not the room's.
        const replica = (commission.replicas || []).find((r: any) => r.id === replicaId);
        const replicaPanels = replica?.replicaPanels || [];
        const currentPanelIndex = room.currentReplicaPanelId
            ? replicaPanels.findIndex((panel: any) => panel.id === room.currentReplicaPanelId)
            : -1;
        const nextPanel = replicaPanels
            .slice(currentPanelIndex + 1)
            .find((panel: any) => panel.status === "NOT_STARTED") || null;

        let myTastingSummary: MyTastingSummaryData | null = null;
        if (room.replicaStatus === "COMPLETED") {
            try {
                myTastingSummary = await fetchMyTastingSummary(replicaId, commission);
            } catch (err: any) {
                console.error("Failed to fetch expert tasting summary:", err);
                myTastingSummary = emptyTastingSummary(room.flags, commission.name || undefined);
            }
        }

        const policy = ((commission as any).discussionPolicy ?? "ALWAYS") as DiscussionPolicy;

        return {
            ...room,
            // The wait page and the panel summary read these flat.
            ...room.flags,
            commissionName: commission.name || "",
            discussionsEnabled: policy !== "DISABLED",
            discussionPolicy: policy,
            propertyMap: myTastingSummary?.propertyMap ?? room.propertyMap,
            myTastingSummary,
            nextPanelId: nextPanel?.panel?.id || null,
            nextPanelFirstCandidateId: nextPanel?.replicaCandidates?.[0]?.id || null,
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

const SET_REPLICA_PANEL_CURRENT_CANDIDATE_MUTATION = `
    mutation SetCommissionReplicaPanelCurrentCandidate($id: ID!, $panelId: ID!, $currentCandidateId: ID) {
        setCommissionReplicaPanelCurrentCandidate(id: $id, panelId: $panelId, currentCandidateId: $currentCandidateId) {
            id
            currentPanelId
        }
    }
`;

export async function markCandidateEvaluatedAction(replicaId: string, candidateId: string) {
    if (!isValidUuid(replicaId) || !isValidUuid(candidateId)) return null;
    try {
        // The backend authorizes these mutations against the acting member (the HEAD),
        // so the actor headers must be forwarded just like for the other mutations.
        const headers = await getActorHeaders();

        // The sequence itself is core's, shared with the app.
        const { nextCandidateId } = await advancePanel(
            {
                markEvaluated: async (id) => {
                    await sdk.MarkCommissionReplicaCandidateAsEvaluated({ id }, { headers });
                },
                panels: async (id) => {
                    const response = await sdk.GetReplicaCandidates({ replicaId: id });
                    return response.commissionReplica?.replicaPanels ?? [];
                },
                setCurrentCandidate: async (id, panelId, currentCandidateId) => {
                    await rawGraphQL(
                        SET_REPLICA_PANEL_CURRENT_CANDIDATE_MUTATION,
                        { id, panelId, currentCandidateId },
                        headers,
                    );
                },
                completePanel: async (id, panelId) => {
                    await rawGraphQL(`
                        mutation CompleteCommissionReplicaPanel($id: ID!, $panelId: ID!) {
                            completeCommissionReplicaPanel(id: $id, panelId: $panelId) { id currentPanelId }
                        }
                    `, { id, panelId }, headers);
                },
            },
            replicaId,
            candidateId,
        );

        return { nextCandidateId };
    } catch (err: any) {
        console.error("Server Action Error (markCandidateEvaluatedAction):", err);
        // Server actions only carry a message across, so the key travels as one.
        throw new Error(err instanceof AdvancePanelError ? err.key : err?.message || "Failed to mark candidate as evaluated");
    }
}

export async function setCommissionPartialCandidateEvaluationEnabledAction(commissionId: string, enabled: boolean) {
    if (!isValidUuid(commissionId)) return { success: false, error: "Invalid commissionId parameter" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(settingMutation("partialCandidateEvaluationEnabled"), { id: commissionId, enabled }, headers);
        return { success: true, commission: data?.setCommissionPartialCandidateEvaluationEnabled };
    } catch (err: any) {
        console.error("Server Action Error (setCommissionPartialCandidateEvaluationEnabledAction):", err);
        return { success: false, error: err?.message || "Failed to update partial candidate evaluation setting" };
    }
}

export async function setCommissionWineJumperMiniGameEnabledAction(commissionId: string, enabled: boolean) {
    if (!isValidUuid(commissionId)) return { success: false, error: "Invalid commissionId parameter" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(settingMutation("wineJumperMiniGameEnabled"), { id: commissionId, enabled }, headers);
        return { success: true, commission: data?.setCommissionWineJumperMiniGameEnabled };
    } catch (err: any) {
        console.error("Server Action Error (setCommissionWineJumperMiniGameEnabledAction):", err);
        return { success: false, error: err?.message || "Failed to update wine jumper setting" };
    }
}

export async function setCommissionVoiceCommentsEnabledAction(commissionId: string, enabled: boolean) {
    if (!isValidUuid(commissionId)) return { success: false, error: "Invalid commissionId parameter" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(settingMutation("voiceCommentsEnabled"), { id: commissionId, enabled }, headers);
        return { success: true, commission: data?.setCommissionVoiceCommentsEnabled };
    } catch (err: any) {
        console.error("Server Action Error (setCommissionVoiceCommentsEnabledAction):", err);
        return { success: false, error: err?.message || "Failed to update voice comments setting" };
    }
}

export async function setCommissionPropertyCommentsEnabledAction(commissionId: string, enabled: boolean) {
    if (!isValidUuid(commissionId)) return { success: false, error: "Invalid commissionId parameter" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(settingMutation("propertyCommentsEnabled"), { id: commissionId, enabled }, headers);
        return { success: true, commission: data?.setCommissionPropertyCommentsEnabled };
    } catch (err: any) {
        console.error("Server Action Error (setCommissionPropertyCommentsEnabledAction):", err);
        return { success: false, error: err?.message || "Failed to update property comments setting" };
    }
}

export async function setCommissionBeverageOriginDuringEvaluationEnabledAction(commissionId: string, enabled: boolean) {
    if (!isValidUuid(commissionId)) return { success: false, error: "Invalid commissionId parameter" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(settingMutation("beverageOriginDuringEvaluationEnabled"), { id: commissionId, enabled }, headers);
        return { success: true, commission: data?.setCommissionBeverageOriginDuringEvaluationEnabled };
    } catch (err: any) {
        console.error("Server Action Error (setCommissionBeverageOriginDuringEvaluationEnabledAction):", err);
        return { success: false, error: err?.message || "Failed to update beverage origin setting" };
    }
}

export async function setCommissionDiscussionPolicyAction(commissionId: string, policy: DiscussionPolicy) {
    if (!isValidUuid(commissionId)) return { success: false, error: "Invalid commissionId parameter" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation SetCommissionDiscussionPolicy($id: ID!, $policy: DiscussionPolicy!) {
                setCommissionDiscussionPolicy(id: $id, policy: $policy) {
                    id
                    discussionPolicy
                }
            }
        `, { id: commissionId, policy }, headers);
        return { success: true, policy: data?.setCommissionDiscussionPolicy?.discussionPolicy };
    } catch (err: any) {
        console.error("Server Action Error (setCommissionDiscussionPolicyAction):", err);
        return { success: false, error: err?.message || "Failed to update discussion policy setting" };
    }
}

export async function setCommissionEvaluationVisibleAttributesAction(
    commissionId: string,
    input: { beverage: string[]; batch: string[]; sample: string[] }
) {
    if (!isValidUuid(commissionId)) return { success: false, error: "Invalid commissionId parameter" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation SetCommissionEvaluationVisibleAttributes($id: ID!, $input: EvaluationVisibleAttributesInput!) {
                setCommissionEvaluationVisibleAttributes(id: $id, input: $input) {
                    id
                    evaluationVisibleAttributes {
                        beverage
                        batch
                        sample
                    }
                }
            }
        `, { id: commissionId, input }, headers);
        return { success: true, commission: data?.setCommissionEvaluationVisibleAttributes };
    } catch (err: any) {
        console.error("Server Action Error (setCommissionEvaluationVisibleAttributesAction):", err);
        return { success: false, error: err?.message || "Failed to update visible attributes setting" };
    }
}

export async function setCommissionReplicaPanelChaoticCurrentCandidateChangesEnabledAction(replicaId: string, panelId: string, enabled: boolean) {
    if (!isValidUuid(replicaId) || !isValidUuid(panelId)) return { success: false, error: "Invalid replica or panel ID" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(SET_REPLICA_PANEL_CHAOTIC_CANDIDATE_CHANGES, { id: replicaId, panelId, enabled }, headers);
        return { success: true, replica: data?.setCommissionReplicaPanelChaoticCurrentCandidateChangesEnabled };
    } catch (err: any) {
        console.error("Server Action Error (setCommissionReplicaPanelChaoticCurrentCandidateChangesEnabledAction):", err);
        return { success: false, error: err?.message || "Failed to update chaotic candidate setting" };
    }
}

export async function setCommissionReplicaChaoticCurrentPanelChangesEnabledAction(replicaId: string, enabled: boolean) {
    if (!isValidUuid(replicaId)) return { success: false, error: "Invalid replicaId parameter" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(SET_REPLICA_CHAOTIC_PANEL_CHANGES, { id: replicaId, enabled }, headers);
        return { success: true, replica: data?.setCommissionReplicaChaoticCurrentPanelChangesEnabled };
    } catch (err: any) {
        console.error("Server Action Error (setCommissionReplicaChaoticCurrentPanelChangesEnabledAction):", err);
        return { success: false, error: err?.message || "Failed to update chaotic panel setting" };
    }
}

export async function addOutcomePolicyOwnerAction(policyId: string, ownerAuid: number) {
    if (!isValidUuid(policyId)) return { success: false, error: "Invalid policyId parameter" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation AddOutcomePolicyOwner($id: ID!, $ownerAuid: AUID!) {
                addOutcomePolicyOwner(id: $id, ownerAuid: $ownerAuid) {
                    id
                    owners
                }
            }
        `, { id: policyId, ownerAuid: [ownerAuid] }, headers);
        return { success: true, policy: data?.addOutcomePolicyOwner };
    } catch (err: any) {
        console.error("Server Action Error (addOutcomePolicyOwnerAction):", err);
        return { success: false, error: err?.message || "Failed to add outcome policy owner" };
    }
}

export async function removeOutcomePolicyOwnerAction(policyId: string, ownerAuid: number) {
    if (!isValidUuid(policyId)) return { success: false, error: "Invalid policyId parameter" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation RemoveOutcomePolicyOwner($id: ID!, $ownerAuid: AUID!) {
                removeOutcomePolicyOwner(id: $id, ownerAuid: $ownerAuid) {
                    id
                    owners
                }
            }
        `, { id: policyId, ownerAuid: [ownerAuid] }, headers);
        return { success: true, policy: data?.removeOutcomePolicyOwner };
    } catch (err: any) {
        console.error("Server Action Error (removeOutcomePolicyOwnerAction):", err);
        return { success: false, error: err?.message || "Failed to remove outcome policy owner" };
    }
}

export async function getOutcomePoliciesAction(filter?: { owners?: number[] }, limit: number = 50, offset: number = 0) {
    try {
        const headers = await getActorHeaders().catch(() => ({}));
        const data = await rawGraphQL(`
            query GetOutcomePolicies($filter: OutcomePolicyFilterInput, $limit: Int, $offset: Int) {
                outcomePolicies(filter: $filter, limit: $limit, offset: $offset) {
                    items {
                        id
                        name
                        code
                        description
                        owners
                    }
                }
                outcomePolicyCount(filter: $filter)
            }
        `, {
            filter: filter?.owners?.length ? { owners: filter.owners.map(a => [a]) } : filter,
            limit,
            offset
        }, headers);
        return {
            success: true,
            items: data?.outcomePolicies?.items || [],
            count: data?.outcomePolicyCount || 0
        };
    } catch (err: any) {
        console.error("Server Action Error (getOutcomePoliciesAction):", err);
        return { success: false, items: [], count: 0, error: err?.message || "Failed to fetch outcome policies" };
    }
}

export async function renameCommissionReplicaAction(id: string, name?: string) {
    if (!isValidUuid(id)) throw new Error("Invalid UUID parameter");
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(RENAME_COMMISSION_REPLICA, { id, name }, headers);
        return {success: true, replica: data.renameCommissionReplica};
    } catch (err: any) {
        console.error("Server Action Error (renameCommissionReplicaAction):", err);
        return {success: false, error: err.message || "Failed to rename replica"};
    }
}
export async function startNextPanelAction(replicaId: string, nextPanelId: string, firstCandidateId: string) {
    if (!isValidUuid(replicaId) || !isValidUuid(nextPanelId) || !isValidUuid(firstCandidateId)) return null;
    try {
        const headers = await getActorHeaders();
        await rawGraphQL(`
            mutation SetCommissionReplicaCurrentPanel($id: ID!, $currentPanelId: ID) {
                setCommissionReplicaCurrentPanel(id: $id, currentPanelId: $currentPanelId) { id currentPanelId }
            }
        `, { id: replicaId, currentPanelId: nextPanelId }, headers);
        await rawGraphQL(
            SET_REPLICA_PANEL_CURRENT_CANDIDATE_MUTATION,
            { id: replicaId, panelId: nextPanelId, currentCandidateId: firstCandidateId },
            headers,
        );
        return true;
    } catch (err: any) {
        console.error("Server Action Error (startNextPanelAction):", err);
        throw new Error(err.message || "Failed to start next panel");
    }
}

export async function completeCommissionReplicaAction(replicaId: string) {
    if (!isValidUuid(replicaId)) return null;
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(`
            mutation CompleteCommissionReplica($id: ID!) {
                completeCommissionReplica(id: $id) {
                    id
                    status
                }
            }
        `, { id: replicaId }, headers);
        return data?.completeCommissionReplica ?? null;
    } catch (err: any) {
        console.error("Server Action Error (completeCommissionReplicaAction):", err);
        throw new Error(err.message || "Failed to complete commission replica");
    }
}

export async function searchUserByUsernameAction(username: string) {
    const trimmed = username.trim().replace(/^@/, "");
    if (!trimmed) return { success: false, error: "" };
    try {
        const user = await findUserByUsername(getAxusConfig(), trimmed);
        return user ? { success: true, user } : { success: false, error: "" };
    } catch (err: any) {
        console.error("searchUserByUsernameAction error:", err);
        return { success: false, error: err.message || "" };
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
        const data = await rawGraphQL(ADD_COMMISSION_REPLICA_MEMBER, {
            id: replicaId,
            input: {
                auid: [auid],
                role
            }
        }, headers);
        return { success: true, replica: data.addCommissionReplicaMember };
    } catch (err: any) {
        console.error("Server Action Error (addCommissionReplicaMemberAction):", err);
        return { success: false, error: err.message || "" };
    }
}

export async function removeCommissionReplicaMemberAction(replicaId: string, memberId: string) {
    if (!isValidUuid(replicaId) || !isValidUuid(memberId)) return { success: false, error: "Invalid parameters" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(REMOVE_COMMISSION_REPLICA_MEMBER, {
            id: replicaId,
            memberId
        }, headers);
        return { success: true, replica: data.removeCommissionReplicaMember };
    } catch (err: any) {
        console.error("Server Action Error (removeCommissionReplicaMemberAction):", err);
        return { success: false, error: err.message || "" };
    }
}

export async function addCommissionPanelAction(commissionId: string, name: string) {
    if (!isValidUuid(commissionId)) return { success: false, error: "Invalid commissionId parameter" };
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: "" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(ADD_COMMISSION_PANEL, {
            commissionId,
            name: trimmed
        }, headers);
        return { success: true, panel: data.addCommissionPanel };
    } catch (err: any) {
        console.error("Server Action Error (addCommissionPanelAction):", err);
        return { success: false, error: err.message || "" };
    }
}

export async function renameCommissionPanelAction(commissionId: string, panelId: string, name: string) {
    if (!isValidUuid(commissionId) || !isValidUuid(panelId)) return { success: false, error: "Invalid parameters" };
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: "" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(RENAME_COMMISSION_PANEL, {
            commissionId,
            panelId,
            name: trimmed
        }, headers);
        return { success: true, panel: data.renameCommissionPanel };
    } catch (err: any) {
        console.error("Server Action Error (renameCommissionPanelAction):", err);
        return { success: false, error: err.message || "" };
    }
}

export async function removeCommissionPanelAction(commissionId: string, panelId: string) {
    if (!isValidUuid(commissionId) || !isValidUuid(panelId)) return { success: false, error: "Invalid parameters" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(REMOVE_COMMISSION_PANEL, {
            commissionId,
            panelId
        }, headers);
        return { success: true, result: data.removeCommissionPanel };
    } catch (err: any) {
        console.error("Server Action Error (removeCommissionPanelAction):", err);
        return { success: false, error: err.message || "" };
    }
}

export async function searchBeveragesAction(search?: string, page: number = 1, limit: number = 8) {
    try {
        const result = await loadBeveragePage((query, variables) => rawGraphQL(query, variables ?? {}), search ?? "", page, limit);
        return { success: true, limit, ...result };
    } catch (err: any) {
        return { success: false, items: [], page, limit, totalPages: 1, hasMore: false, error: err.message || "" };
    }
}

export async function getBatchesForBeverageAction(beverageId: string, page: number = 1, limit: number = 8) {
    if (!isValidUuid(beverageId)) return { success: false, items: [], page, limit, totalPages: 1, hasMore: false };
    try {
        const result = await loadBatchPage((query, variables) => rawGraphQL(query, variables ?? {}), beverageId, page, limit);
        return { success: true, limit, ...result };
    } catch (err: any) {
        return { success: false, items: [], page, limit, totalPages: 1, hasMore: false, error: err.message || "" };
    }
}

export async function getSamplesForBatchAction(batchId: string, page: number = 1, limit: number = 8) {
    if (!isValidUuid(batchId)) return { success: false, items: [], page, limit, totalPages: 1, hasMore: false };
    try {
        const result = await loadSamplePage((query, variables) => rawGraphQL(query, variables ?? {}), batchId, page, limit);
        return { success: true, limit, ...result };
    } catch (err: any) {
        return { success: false, items: [], page, limit, totalPages: 1, hasMore: false, error: err.message || "" };
    }
}

export async function addCommissionCandidateAction(input: {
    commissionId: string;
    panelId: string;
    sampleId: string;
    anonymizedCode?: string;
}) {
    if (!isValidUuid(input.commissionId) || !isValidUuid(input.panelId) || !isValidUuid(input.sampleId)) {
        return { success: false, error: "" };
    }
    try {
        const headers = await getActorHeaders();
        // Core's, which also binds a template to a new beverage type while the commission is a draft.
        const candidate = await addCommissionCandidate(
            (query, variables) => rawGraphQL(query, variables ?? {}, headers),
            input,
            (context, error: any) => console.warn(`addCommissionCandidateAction: ${context}:`, error?.message),
        );
        templatesCache.delete(input.commissionId);
        return { success: true, candidate };
    } catch (err: any) {
        console.error("Server Action Error (addCommissionCandidateAction):", err);
        return { success: false, error: err.message || "" };
    }
}

export async function removeCommissionCandidateAction(candidateId: string) {
    if (!isValidUuid(candidateId)) return { success: false, error: "Invalid candidateId parameter" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(REMOVE_COMMISSION_CANDIDATE, { candidateId }, headers);
        return { success: true, result: data.removeCommissionCandidate };
    } catch (err: any) {
        console.error("Server Action Error (removeCommissionCandidateAction):", err);
        return { success: false, error: err.message || "" };
    }
}

export async function changeCommissionCandidateCodeAction(candidateId: string, anonymizedCode: string) {
    if (!isValidUuid(candidateId)) return { success: false, error: "Invalid candidateId parameter" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(CHANGE_COMMISSION_CANDIDATE_CODE, {
            id: candidateId,
            anonymizedCode: candidateCodeInput(anonymizedCode),
        }, headers);
        return { success: true, candidate: data.changeCommissionCandidateCode };
    } catch (err: any) {
        console.error("Server Action Error (changeCommissionCandidateCodeAction):", err);
        return { success: false, error: err.message || "" };
    }
}

export async function reorderCommissionCandidatesAction(commissionId: string, panelId: string, candidateIds: string[]) {
    if (!isValidUuid(commissionId)) return { success: false, error: "Invalid commissionId parameter" };
    if (!isValidUuid(panelId)) return { success: false, error: "Invalid panelId parameter" };
    try {
        const headers = await getActorHeaders();
        const data = await rawGraphQL(REORDER_COMMISSION_CANDIDATES, { panelId, candidateIds }, headers);
        return { success: true, commission: data.reorderCommissionCandidates };
    } catch (err: any) {
        console.error("Server Action Error (reorderCommissionCandidatesAction):", err);
        return { success: false, error: err.message || "" };
    }
}
