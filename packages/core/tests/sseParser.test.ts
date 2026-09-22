import test from "node:test";
import assert from "node:assert/strict";
import { createSSEParserState, parseSSEChunk, type SSEEvent } from "../src/events";

test("parseSSEChunk parses single event in a single chunk", () => {
    const state = createSSEParserState();
    const events: SSEEvent[] = [];

    parseSSEChunk(
        "id: 123\nevent: commissionreplica.StatusChangedEvent\ndata: {\"status\":\"IN_PROGRESS\"}\n\n",
        state,
        (evt) => events.push(evt)
    );

    assert.equal(events.length, 1);
    assert.deepEqual(events[0], {
        id: "123",
        event: "commissionreplica.StatusChangedEvent",
        data: '{"status":"IN_PROGRESS"}',
    });
});

test("parseSSEChunk handles chunks split across packet boundaries", () => {
    const state = createSSEParserState();
    const events: SSEEvent[] = [];

    parseSSEChunk("event: commissionreplica.ReplicaPanelCurrentCandidate", state, (evt) => events.push(evt));
    assert.equal(events.length, 0);

    parseSSEChunk("ChangedEvent\ndata: {\"cand", state, (evt) => events.push(evt));
    assert.equal(events.length, 0);

    parseSSEChunk("idateId\":\"c-1\"}\n\n", state, (evt) => events.push(evt));
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "commissionreplica.ReplicaPanelCurrentCandidateChangedEvent");
    assert.equal(events[0].data, '{"candidateId":"c-1"}');
});

test("parseSSEChunk ignores keepalive comments and handles multiline data", () => {
    const state = createSSEParserState();
    const events: SSEEvent[] = [];

    const stream = [
        ":keepalive\n\n",
        "event: custom\n",
        "data: line1\n",
        "data: line2\n\n",
        ":another comment\n\n",
    ].join("");

    parseSSEChunk(stream, state, (evt) => events.push(evt));

    assert.equal(events.length, 1);
    assert.equal(events[0].event, "custom");
    assert.equal(events[0].data, "line1\nline2");
});

test("parseSSEChunk parses multiple consecutive events", () => {
    const state = createSSEParserState();
    const events: SSEEvent[] = [];

    const stream = "data: event1\n\ndata: event2\n\n";
    parseSSEChunk(stream, state, (evt) => events.push(evt));

    assert.equal(events.length, 2);
    assert.equal(events[0].data, "event1");
    assert.equal(events[1].data, "event2");
});
