import test from "node:test";
import assert from "node:assert/strict";
import {
    isEvaluationRelevantEvent,
    EVALUATION_SSE_EVENT_NAMES,
    type EventNotification,
} from "../src/events";

test("evaluation events are always relevant during active tasting regardless of aggregateId", () => {
    const event: EventNotification = {
        id: "11111111-1111-1111-1111-111111111111",
        aggregateType: "evaluation",
        aggregateId: "eval-42",
        eventType: "ScoresUpdatedEvent",
        publishedAt: "2026-09-21T18:00:00Z",
    };

    assert.equal(isEvaluationRelevantEvent(event, { commissionId: "comm-1", replicaId: "rep-1" }), true);
    assert.equal(isEvaluationRelevantEvent(event, {}), true);
});

test("evaluation comments and confirmation events are relevant", () => {
    const commentsEvent: EventNotification = {
        id: "22222222-2222-2222-2222-222222222222",
        aggregateType: "evaluation",
        aggregateId: "eval-99",
        eventType: "CommentsUpdatedEvent",
        publishedAt: "2026-09-21T18:00:00Z",
    };
    const confirmedEvent: EventNotification = {
        id: "33333333-3333-3333-3333-333333333333",
        aggregateType: "evaluation",
        aggregateId: "eval-99",
        eventType: "ConfirmedEvent",
        publishedAt: "2026-09-21T18:00:00Z",
    };

    assert.equal(isEvaluationRelevantEvent(commentsEvent, { replicaId: "rep-1" }), true);
    assert.equal(isEvaluationRelevantEvent(confirmedEvent, { replicaId: "rep-1" }), true);
});

test("replicabeverageoutcome events are always relevant to update awards and outcomes", () => {
    const event: EventNotification = {
        id: "44444444-4444-4444-4444-444444444444",
        aggregateType: "replicabeverageoutcome",
        aggregateId: "outcome-1",
        eventType: "CreatedEvent",
        publishedAt: "2026-09-21T18:00:00Z",
    };

    assert.equal(isEvaluationRelevantEvent(event, { commissionId: "comm-1", replicaId: "rep-1" }), true);
});

test("commissionreplica events filter by replicaId when context is provided", () => {
    const matchingReplicaEvent: EventNotification = {
        id: "55555555-5555-5555-5555-555555555555",
        aggregateType: "commissionreplica",
        aggregateId: "rep-1",
        eventType: "ReplicaPanelCurrentCandidateChangedEvent",
        publishedAt: "2026-09-21T18:00:00Z",
    };
    const otherReplicaEvent: EventNotification = {
        id: "66666666-6666-6666-6666-666666666666",
        aggregateType: "commissionreplica",
        aggregateId: "rep-2",
        eventType: "ReplicaPanelCurrentCandidateChangedEvent",
        publishedAt: "2026-09-21T18:00:00Z",
    };

    assert.equal(isEvaluationRelevantEvent(matchingReplicaEvent, { replicaId: "rep-1" }), true);
    assert.equal(isEvaluationRelevantEvent(otherReplicaEvent, { replicaId: "rep-1" }), false);
    // If replicaId is omitted in context, accept all replica events
    assert.equal(isEvaluationRelevantEvent(otherReplicaEvent, {}), true);
});

test("commission events filter by commissionId when context is provided", () => {
    const matchingCommissionEvent: EventNotification = {
        id: "77777777-7777-7777-7777-777777777777",
        aggregateType: "commission",
        aggregateId: "comm-1",
        eventType: "StatusChangedEvent",
        publishedAt: "2026-09-21T18:00:00Z",
    };
    const otherCommissionEvent: EventNotification = {
        id: "88888888-8888-8888-8888-888888888888",
        aggregateType: "commission",
        aggregateId: "comm-2",
        eventType: "StatusChangedEvent",
        publishedAt: "2026-09-21T18:00:00Z",
    };

    assert.equal(isEvaluationRelevantEvent(matchingCommissionEvent, { commissionId: "comm-1" }), true);
    assert.equal(isEvaluationRelevantEvent(otherCommissionEvent, { commissionId: "comm-1" }), false);
});

test("unrelated aggregate types are ignored", () => {
    const userEvent: EventNotification = {
        id: "99999999-9999-9999-9999-999999999999",
        aggregateType: "producer",
        aggregateId: "prod-1",
        eventType: "NameChangedEvent",
        publishedAt: "2026-09-21T18:00:00Z",
    };

    assert.equal(isEvaluationRelevantEvent(userEvent, { commissionId: "comm-1", replicaId: "rep-1" }), false);
});

test("EVALUATION_SSE_EVENT_NAMES contains expected events", () => {
    assert.ok(EVALUATION_SSE_EVENT_NAMES.includes("evaluation.ScoresUpdatedEvent"));
    assert.ok(EVALUATION_SSE_EVENT_NAMES.includes("evaluation.ConfirmedEvent"));
    assert.ok(EVALUATION_SSE_EVENT_NAMES.includes("commissionreplica.ReplicaPanelCurrentCandidateChangedEvent"));
    assert.ok(EVALUATION_SSE_EVENT_NAMES.includes("commissionreplica.CompletedEvent"));
});
