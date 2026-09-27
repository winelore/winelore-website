/**
 * AsyncAPI 3.0.0 Event Notifications definition for WineLore live event stream.
 */

export interface EventNotification {
    id: string;
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    publishedAt: string;
}

export type EvaluationEventType =
    | "CreatedEvent"
    | "ScoresUpdatedEvent"
    | "ConfirmedEvent"
    | "CommentsUpdatedEvent";

export type CommissionReplicaEventType =
    | "ChaoticCurrentPanelChangesChangedEvent"
    | "CompletedEvent"
    | "CreatedEvent"
    | "CurrentPanelChangedEvent"
    | "MemberAddedEvent"
    | "MemberReadinessChangedEvent"
    | "MemberRemovedEvent"
    | "RenamedEvent"
    | "ReplicaCandidateStatusChangedEvent"
    | "ReplicaPanelChaoticCurrentCandidateChangesChangedEvent"
    | "ReplicaPanelCurrentCandidateChangedEvent"
    | "ReplicaPanelStatusChangedEvent"
    | "StartedEvent"
    | "StatusChangedEvent";

export type CommissionEventType =
    | "AwardTypeEditionRemovedEvent"
    | "AwardTypeEditionSetEvent"
    | "BeverageOriginDuringEvaluationChangedEvent"
    | "CompletedEvent"
    | "CreatedEvent"
    | "DiscussionPolicyChangedEvent"
    | "EvaluationVisibleAttributesChangedEvent"
    | "OutcomePolicyEditionRemovedEvent"
    | "OutcomePolicyEditionSetEvent"
    | "PartialCandidateEvaluationChangedEvent"
    | "PlannedDatesChangedEvent"
    | "PropertyCommentsChangedEvent"
    | "RenamedEvent"
    | "StartedEvent"
    | "StatusChangedEvent"
    | "TemplateEditionRemovedEvent"
    | "TemplateEditionSetEvent"
    | "VoiceCommentsChangedEvent"
    | "WineJumperMiniGameChangedEvent";

export type ReplicaBeverageOutcomeEventType = "CreatedEvent";

export type PanelEventType =
    | "CandidateAddedEvent"
    | "CandidateCodeChangedEvent"
    | "CandidateRemovedEvent"
    | "CandidatesReorderedEvent"
    | "CreatedEvent"
    | "RenamedEvent";
