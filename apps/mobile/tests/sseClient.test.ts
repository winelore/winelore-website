import test from "node:test"
import assert from "node:assert/strict"
import { createSSEClient } from "../src/events/sseClient"

const SSE_PAYLOAD = "id: 42\nevent: commissionreplica.StatusChangedEvent\ndata: {\"status\":\"IN_PROGRESS\"}\n\n"

function installMockXHR(seen: { headers?: Record<string, string> }) {
    const originalXHR = (globalThis as any).XMLHttpRequest

    class MockXHR {
        readyState = 0
        status = 200
        responseText = ""
        headers: Record<string, string> = {}
        onreadystatechange: (() => void) | null = null
        onerror: ((err: any) => void) | null = null
        ontimeout: (() => void) | null = null

        open(method: string, url: string) {
            this.readyState = 1
        }

        setRequestHeader(name: string, value: string) {
            this.headers[name] = value
        }

        send() {
            seen.headers = this.headers
            setTimeout(() => {
                this.readyState = 2
                this.status = 200
                this.onreadystatechange?.()

                this.readyState = 3
                this.responseText = SSE_PAYLOAD
                this.onreadystatechange?.()
            }, 10)
        }

        abort() {
            this.readyState = 0
        }
    }

    ;(globalThis as any).XMLHttpRequest = MockXHR
    return () => {
        ;(globalThis as any).XMLHttpRequest = originalXHR
    }
}

function withoutEventSource() {
    const originalEventSource = (globalThis as any).EventSource
    ;(globalThis as any).EventSource = undefined
    return () => {
        ;(globalThis as any).EventSource = originalEventSource
    }
}

test("createSSEClient streams and parses chunks via XMLHttpRequest transport", (t, done) => {
    const restoreEventSource = withoutEventSource()
    const seen: { headers?: Record<string, string> } = {}
    const restoreXHR = installMockXHR(seen)

    let opened = false
    const messages: any[] = []

    const client = createSSEClient({
        url: "https://test.local/api/v1/events",
        onOpen: () => {
            opened = true
        },
        onMessage: (msg) => {
            messages.push(msg)
            assert.equal(opened, true)
            assert.equal(messages.length, 1)
            assert.deepEqual(messages[0], {
                id: "42",
                event: "commissionreplica.StatusChangedEvent",
                data: '{"status":"IN_PROGRESS"}',
            })
            client.close()
            restoreXHR()
            restoreEventSource()
            done()
        },
    })
})

test("createSSEClient sends custom headers over XHR even when EventSource exists", (t, done) => {
    const seen: { headers?: Record<string, string> } = {}
    const restoreXHR = installMockXHR(seen)

    let eventSourceUsed = false
    const originalEventSource = (globalThis as any).EventSource
    class MockEventSource {
        constructor() {
            eventSourceUsed = true
        }
        close() {}
    }
    ;(globalThis as any).EventSource = MockEventSource

    const client = createSSEClient({
        url: "https://test.local/api/v1/events",
        headers: { Authorization: "Bearer test-token", "x-actor": "5" },
        onMessage: (msg) => {
            assert.equal(eventSourceUsed, false)
            assert.equal(seen.headers?.["Authorization"], "Bearer test-token")
            assert.equal(seen.headers?.["x-actor"], "5")
            assert.deepEqual(msg, {
                id: "42",
                event: "commissionreplica.StatusChangedEvent",
                data: '{"status":"IN_PROGRESS"}',
            })
            client.close()
            restoreXHR()
            ;(globalThis as any).EventSource = originalEventSource
            done()
        },
    })
})

test("createSSEClient forceXhrTransport skips EventSource", (t, done) => {
    const seen: { headers?: Record<string, string> } = {}
    const restoreXHR = installMockXHR(seen)

    let eventSourceUsed = false
    const originalEventSource = (globalThis as any).EventSource
    class MockEventSource {
        constructor() {
            eventSourceUsed = true
        }
        close() {}
    }
    ;(globalThis as any).EventSource = MockEventSource

    const client = createSSEClient({
        url: "https://test.local/api/v1/events",
        forceXhrTransport: true,
        onMessage: (msg) => {
            assert.equal(eventSourceUsed, false)
            assert.equal(msg.event, "commissionreplica.StatusChangedEvent")
            client.close()
            restoreXHR()
            ;(globalThis as any).EventSource = originalEventSource
            done()
        },
    })
})
