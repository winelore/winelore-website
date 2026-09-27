/**
 * The JWT/base64url helpers are hand-rolled so that @winelore/core stays free
 * of `btoa`/`atob`/`TextDecoder`, which are not present on every React Native
 * runtime. Hand-rolled base64 fails silently and breaks sign-in, so it is
 * pinned here against Node's own implementation.
 *
 * Run with `npm run test:core`.
 */
import test from "node:test"
import assert from "node:assert/strict"
import {
    base64UrlEncode,
    parseJwt,
    shouldRefreshAccessToken,
    secondsSinceExpiry,
} from "../src/auth/jwt"

const jwtWith = (payload: Record<string, unknown>) =>
    `${Buffer.from('{"alg":"RS256"}').toString("base64url")}.` +
    `${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`

test("base64UrlEncode matches Node across padding boundaries", () => {
    for (let n = 0; n <= 40; n++) {
        const bytes = new Uint8Array(Array.from({ length: n }, (_, i) => (i * 37 + 11) % 256))
        assert.equal(base64UrlEncode(bytes), Buffer.from(bytes).toString("base64url"), `length ${n}`)
    }
})

test("base64UrlEncode matches Node on random input", () => {
    for (let i = 0; i < 500; i++) {
        const bytes = new Uint8Array(Math.floor(Math.random() * 64))
        for (let j = 0; j < bytes.length; j++) bytes[j] = Math.floor(Math.random() * 256)
        assert.equal(base64UrlEncode(bytes), Buffer.from(bytes).toString("base64url"))
    }
})

test("parseJwt reads the claims the flow depends on", () => {
    assert.deepEqual(parseJwt(jwtWith({ sub: "auid-123", exp: 1789000000, preferred_username: "taster" })), {
        sub: "auid-123",
        exp: 1789000000,
        preferred_username: "taster",
    })
})

test("parseJwt decodes multi-byte UTF-8", () => {
    // The product ships Ukrainian and Hungarian; names reach us through claims.
    assert.equal(parseJwt(jwtWith({ name: "Олександр Виноградов" }))?.name, "Олександр Виноградов")
    assert.equal(parseJwt(jwtWith({ name: "Tokaji Aszú Bor" }))?.name, "Tokaji Aszú Bor")
    assert.equal(parseJwt(jwtWith({ name: "Wine 🍷 Lore" }))?.name, "Wine 🍷 Lore")
})

test("parseJwt returns null rather than throwing on malformed input", () => {
    for (const bad of ["not-a-jwt", "", "abc", "a.b.c.d.e"]) {
        assert.doesNotThrow(() => parseJwt(bad))
    }
    assert.equal(parseJwt("not-a-jwt"), null)
    assert.equal(parseJwt(""), null)
})

test("shouldRefreshAccessToken honours the 5-minute skew", () => {
    const now = () => 1_700_000_000_000
    const token = (expSeconds: number) => jwtWith({ sub: "u", exp: expSeconds })

    assert.equal(shouldRefreshAccessToken(token(1_700_000_600), { now }), false, "10 min left")
    assert.equal(shouldRefreshAccessToken(token(1_700_000_240), { now }), true, "4 min left")
    assert.equal(shouldRefreshAccessToken(token(1_699_999_000), { now }), true, "expired")
})

test("shouldRefreshAccessToken fails safe when lifetime is unknowable", () => {
    const now = () => 1_700_000_000_000
    assert.equal(shouldRefreshAccessToken(null, { now }), true)
    assert.equal(shouldRefreshAccessToken(undefined, { now }), true)
    assert.equal(shouldRefreshAccessToken("junk", { now }), true)
    assert.equal(shouldRefreshAccessToken(jwtWith({ sub: "u" }), { now }), true, "no exp claim")
})

test("secondsSinceExpiry distinguishes a dead token from a lost refresh race", () => {
    const now = () => 1_700_000_000_000
    assert.equal(secondsSinceExpiry(jwtWith({ sub: "u", exp: 1_699_999_970 }), now), 30)
    assert.ok((secondsSinceExpiry(jwtWith({ sub: "u", exp: 1_700_000_600 }), now) ?? 0) < 0)
    assert.equal(secondsSinceExpiry(null, now), null)
    assert.equal(secondsSinceExpiry(jwtWith({ sub: "u" }), now), null, "no exp claim")
})
