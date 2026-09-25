import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { resolveAvatarUrl } from "../src/auth/displayName"
import type { AxusConfig } from "../src/auth/types"

const config = { graphqlEndpoint: "https://axus.example/graphql" } as AxusConfig

function mockFetch(handler: (body: { query: string; variables: Record<string, unknown> }) => unknown) {
    const calls: Array<{ query: string; variables: Record<string, unknown> }> = []
    // deno-lint-ignore no-explicit-any
    ;(globalThis as any).fetch = async (_url: string, init: { body: string }) => {
        const body = JSON.parse(init.body)
        calls.push(body)
        return { ok: true, json: async () => handler(body) }
    }
    return calls
}

describe("resolveAvatarUrl", () => {
    it("returns the public download URL when the default variation has a photo", async () => {
        mockFetch(({ query }) =>
            query.includes("avatar(")
                ? { data: { avatar: { objectKey: "avatars/vid/key" } } }
                : { data: { defaultVariation: { variationId: "vid" }, variations: [{ id: "vid" }] } },
        )
        assert.equal(
            await resolveAvatarUrl(config, "26"),
            "https://axus.example/v1/variations/vid/avatar",
        )
    })

    it("returns null when there is no photo, no variation, or the engine lacks the field", async () => {
        mockFetch(() => ({ data: { defaultVariation: null, variations: [] } }))
        assert.equal(await resolveAvatarUrl(config, "26"), null)

        mockFetch(({ query }) =>
            query.includes("avatar(")
                ? { data: { avatar: { objectKey: null } } }
                : { data: { defaultVariation: { variationId: "vid" }, variations: [] } },
        )
        assert.equal(await resolveAvatarUrl(config, "26"), null)

        // Old engine: unknown field fails the whole query, data comes back empty.
        mockFetch(() => ({}))
        assert.equal(await resolveAvatarUrl(config, "26"), null)
    })

    it("returns null on transport failure instead of throwing", async () => {
        // deno-lint-ignore no-explicit-any
        ;(globalThis as any).fetch = async () => {
            throw new Error("offline")
        }
        assert.equal(await resolveAvatarUrl(config, "26"), null)
    })
})
