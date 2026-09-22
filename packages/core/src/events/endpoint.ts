/**
 * Shared endpoint derivation for the live event stream.
 *
 * Pure string logic only — no DOM, `node:*`, Next.js, or Expo APIs — so both
 * the Next.js web app and the Expo app can use it unchanged.
 */

export const DEFAULT_EVENTS_ENDPOINT = "https://winelore-dev.thewinelore.com/api/v1/events";

/**
 * Derives the SSE events endpoint from a GraphQL endpoint by swapping the
 * trailing `/graphql` for `/api/v1/events`. Falls back to the default when
 * the GraphQL endpoint is missing or has an unexpected shape, mirroring the
 * previous per-platform implementations.
 */
export function resolveEventsEndpointFromGraphql(
    graphqlEndpoint: string | undefined | null,
    fallback: string = DEFAULT_EVENTS_ENDPOINT,
): string {
    if (!graphqlEndpoint) return fallback;
    if (graphqlEndpoint.includes("/graphql")) {
        return graphqlEndpoint.replace(/\/graphql\/?$/, "/api/v1/events");
    }
    return fallback;
}
