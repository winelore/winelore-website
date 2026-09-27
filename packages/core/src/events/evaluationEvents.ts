import type { EventNotification } from "./types";

/**
 * All event names from asyncapi.yaml that can impact evaluation, replica wait room,
 * candidate progression, or panel summary views.
 */
export const EVALUATION_SSE_EVENT_NAMES = [
    // Evaluation events (expert submits scores, comments, or confirms)
    "evaluation.CreatedEvent",
    "evaluation.ScoresUpdatedEvent",
    "evaluation.ConfirmedEvent",
    "evaluation.CommentsUpdatedEvent",

    // CommissionReplica events (current candidate changed, panel status, replica completion)
    "commissionreplica.ReplicaPanelCurrentCandidateChangedEvent",
    "commissionreplica.ReplicaCandidateStatusChangedEvent",
    "commissionreplica.ReplicaPanelStatusChangedEvent",
    "commissionreplica.CurrentPanelChangedEvent",
    "commissionreplica.StatusChangedEvent",
    "commissionreplica.StartedEvent",
    "commissionreplica.CompletedEvent",
    "commissionreplica.MemberAddedEvent",
    "commissionreplica.MemberRemovedEvent",
    "commissionreplica.MemberReadinessChangedEvent",
    "commissionreplica.ChaoticCurrentPanelChangesChangedEvent",
    "commissionreplica.ReplicaPanelChaoticCurrentCandidateChangesChangedEvent",
    "commissionreplica.RenamedEvent",

    // Commission events (status, completion, feature flag toggles)
    "commission.StatusChangedEvent",
    "commission.StartedEvent",
    "commission.CompletedEvent",
    "commission.DiscussionPolicyChangedEvent",
    "commission.EvaluationVisibleAttributesChangedEvent",
    "commission.PropertyCommentsChangedEvent",
    "commission.VoiceCommentsChangedEvent",
    "commission.WineJumperMiniGameChangedEvent",
    "commission.PartialCandidateEvaluationChangedEvent",

    // Replica beverage outcome (awards, final aggregated outcomes)
    "replicabeverageoutcome.CreatedEvent",

    // Panel updates (candidate list modifications)
    "panel.CandidateAddedEvent",
    "panel.CandidateCodeChangedEvent",
    "panel.CandidateRemovedEvent",
    "panel.CandidatesReorderedEvent",
] as const;

export interface EvaluationEventContext {
    commissionId?: string;
    replicaId?: string;
}

/**
 * Determines whether an incoming Server-Sent Event notification should trigger
 * a refetch / view update during an active evaluation, wait room, or panel summary session.
 *
 * NOTE on aggregateId matching:
 * - For `evaluation.*`, `aggregateId` is the `evaluationId` (which the client does not
 *   necessarily know before receiving the submission). Any evaluation event must trigger a refetch.
 * - For `replicabeverageoutcome.*`, any outcome event must trigger a refetch.
 * - For `commissionreplica.*`, if a replicaId is specified in context, we check matching aggregateId.
 * - For `commission.*`, if a commissionId is specified in context, we check matching aggregateId.
 */
export function isEvaluationRelevantEvent(
    event: EventNotification,
    context: EvaluationEventContext = {}
): boolean {
    const { aggregateType, aggregateId } = event;

    // 1. Evaluation updates: scores, confirmations, comments
    if (aggregateType === "evaluation") {
        return true;
    }

    // 2. Replica beverage outcome updates
    if (aggregateType === "replicabeverageoutcome") {
        return true;
    }

    // 3. Commission replica events (candidate sequencing, panel changes, replica status)
    if (aggregateType === "commissionreplica") {
        if (!context.replicaId || !aggregateId) {
            return true;
        }
        return aggregateId === context.replicaId;
    }

    // 4. Commission events (status, flags)
    if (aggregateType === "commission") {
        if (!context.commissionId || !aggregateId) {
            return true;
        }
        return aggregateId === context.commissionId;
    }

    // 5. Panel events
    if (aggregateType === "panel") {
        return true;
    }

    return false;
}
