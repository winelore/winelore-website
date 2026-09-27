import test from "node:test"
import assert from "node:assert/strict"
import { sessionFromTokenResponse } from "../src/auth/session"

const jwtWith = (claims: Record<string, unknown>) =>
    `${Buffer.from('{"alg":"RS256"}').toString("base64url")}.` +
    `${Buffer.from(JSON.stringify(claims)).toString("base64url")}.signature`

test("session identity comes from the ID token while expiry follows the access token", async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => Response.json({ data: { usernames: { defaultUsername: "taster" } } })
    try {
        const now = Math.floor(Date.now() / 1000)
        const session = await sessionFromTokenResponse(
            { issuer: "https://axus.example", clientId: "test", graphqlEndpoint: "https://axus.example/graphql" },
            {
                id_token: jwtWith({ sub: "42", preferred_username: "taster", exp: now + 3600 }),
                access_token: jwtWith({ sub: "42", exp: now + 600 }),
                refresh_token: "refresh",
                expires_in: 1200,
            },
        )
        assert.equal(session.auid, "42")
        assert.equal(session.displayName, "@taster")
        assert.ok(session.expiresIn >= 598 && session.expiresIn <= 600)
    } finally {
        globalThis.fetch = originalFetch
    }
})
