import assert from "node:assert/strict"
import { test } from "node:test"
import { getAxusConfig, getAxusRateLimitToken } from "../lib/axusConfig"
import { axusSdk, getAxusSdkWithToken } from "../lib/axusClient"
import {
    findUserByUsername,
    refreshAccessToken,
    resolveAvatarUrl,
    resolveDisplayName,
    revokeRefreshToken,
} from "../packages/core/src/auth"

test("AXUS directory and SDK requests use the configured account budget; explicit bearers win", async (t) => {
    const originalFetch = globalThis.fetch
    const originalToken = process.env.AXUS_RATE_LIMIT_TOKEN
    const originalClientId = process.env.NEXT_PUBLIC_AXUS_ID_CLIENT_ID
    t.after(() => {
        globalThis.fetch = originalFetch
        if (originalToken === undefined) delete process.env.AXUS_RATE_LIMIT_TOKEN
        else process.env.AXUS_RATE_LIMIT_TOKEN = originalToken
        if (originalClientId === undefined) delete process.env.NEXT_PUBLIC_AXUS_ID_CLIENT_ID
        else process.env.NEXT_PUBLIC_AXUS_ID_CLIENT_ID = originalClientId
    })
    process.env.AXUS_RATE_LIMIT_TOKEN = "  deployment-bearer  "
    process.env.NEXT_PUBLIC_AXUS_ID_CLIENT_ID = "test-client"
    const requests: Array<{ url: string; headers: Headers; body: string }> = []
    globalThis.fetch = async (url, init) => {
        requests.push({ url: String(url), headers: new Headers(init?.headers), body: String(init?.body) })
        return Response.json({
            data: {
                ownerByUsername: "42",
                usernames: { defaultUsername: "taster" },
                defaultVariation: { variationId: "persona" },
                name: { displayName: "Taster" },
                avatar: { objectKey: "photo" },
            },
        })
    }
    const config = getAxusConfig()
    assert.equal(config.graphqlToken, "deployment-bearer")
    assert.equal(await resolveDisplayName(config, "42", "taster"), "Taster")
    const avatarUrl = await resolveAvatarUrl(config, "42")
    assert.ok(avatarUrl?.endsWith("/v1/variations/persona/avatar"))
    assert.ok(!avatarUrl?.includes("deployment-bearer"))
    assert.deepEqual(await findUserByUsername(config, "@taster"), {
        auid: 42, username: "taster", displayName: "Taster",
    })
    await axusSdk.OwnerByUsername({ username: "taster" })
    assert.equal(requests.length, 8)
    for (const request of requests) {
        assert.equal(request.headers.get("authorization"), "Bearer deployment-bearer")
        assert.equal(request.headers.get("content-type"), "application/json")
        assert.ok(!request.body.includes("deployment-bearer"))
    }

    await getAxusSdkWithToken("user-bearer").OwnerByUsername({ username: "taster" })
    assert.equal(requests.at(-1)?.headers.get("authorization"), "Bearer user-bearer")
    await axusSdk.OwnerByUsername({ username: "taster" }, { headers: { authorization: "Bearer override" } })
    assert.equal(requests.at(-1)?.headers.get("authorization"), "Bearer override")
    await getAxusSdkWithToken("user-bearer").OwnerByUsername(
        { username: "taster" }, { headers: { authorization: "Bearer override" } },
    )
    assert.equal(requests.at(-1)?.headers.get("authorization"), "Bearer override")

    // The GraphQL deployment bearer must never accompany OAuth credentials.
    await refreshAccessToken(config, "refresh-token")
    await revokeRefreshToken(config, "refresh-token")
    for (const request of requests.slice(-2)) {
        assert.equal(request.headers.get("authorization"), null)
    }

    process.env.AXUS_RATE_LIMIT_TOKEN = "   "
    assert.equal(getAxusRateLimitToken(), undefined)
    await resolveDisplayName(getAxusConfig(), "42", "taster")
    await axusSdk.OwnerByUsername({ username: "taster" })
    for (const request of requests.slice(-3)) {
        assert.equal(request.headers.get("authorization"), null)
    }

    delete process.env.AXUS_RATE_LIMIT_TOKEN
    assert.equal(getAxusConfig().graphqlToken, undefined)
})

test("the deployment bearer is unavailable in a browser environment", (t) => {
    const originalToken = process.env.AXUS_RATE_LIMIT_TOKEN
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window")
    t.after(() => {
        if (originalToken === undefined) delete process.env.AXUS_RATE_LIMIT_TOKEN
        else process.env.AXUS_RATE_LIMIT_TOKEN = originalToken
        if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow)
        else Reflect.deleteProperty(globalThis, "window")
    })
    process.env.AXUS_RATE_LIMIT_TOKEN = "deployment-bearer"
    Object.defineProperty(globalThis, "window", { value: {}, configurable: true })
    assert.equal(getAxusRateLimitToken(), undefined)
})
