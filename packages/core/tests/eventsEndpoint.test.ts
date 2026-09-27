import test from "node:test";
import assert from "node:assert/strict";
import {
    DEFAULT_EVENTS_ENDPOINT,
    resolveEventsEndpointFromGraphql,
} from "../src/events/endpoint";

test("resolveEventsEndpointFromGraphql swaps /graphql for /api/v1/events", () => {
    assert.equal(
        resolveEventsEndpointFromGraphql("https://winelore-dev.thewinelore.com/graphql"),
        "https://winelore-dev.thewinelore.com/api/v1/events",
    );
    assert.equal(
        resolveEventsEndpointFromGraphql("https://example.com/graphql/"),
        "https://example.com/api/v1/events",
    );
});

test("resolveEventsEndpointFromGraphql falls back on missing or unexpected endpoints", () => {
    assert.equal(resolveEventsEndpointFromGraphql(undefined), DEFAULT_EVENTS_ENDPOINT);
    assert.equal(resolveEventsEndpointFromGraphql(null), DEFAULT_EVENTS_ENDPOINT);
    assert.equal(resolveEventsEndpointFromGraphql(""), DEFAULT_EVENTS_ENDPOINT);
    assert.equal(
        resolveEventsEndpointFromGraphql("https://example.com/api"),
        DEFAULT_EVENTS_ENDPOINT,
    );
});

test("resolveEventsEndpointFromGraphql honors a custom fallback", () => {
    assert.equal(
        resolveEventsEndpointFromGraphql(undefined, "https://custom.local/events"),
        "https://custom.local/events",
    );
});
