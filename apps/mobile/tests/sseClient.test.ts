import test from "node:test"
import assert from "node:assert/strict"
import { createSSEClient } from "../src/events/sseClient"

test("createSSEClient streams and parses chunks via XMLHttpRequest transport", (t, done) => {
    // Mock XMLHttpRequest
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
            setTimeout(() => {
                this.readyState = 2
                this.status = 200
                this.onreadystatechange?.()

                this.readyState = 3
                this.responseText = "id: 42\nevent: commissionreplica.StatusChangedEvent\ndata: {\"status\":\"IN_PROGRESS\"}\n\n"
                this.onreadystatechange?.()
            }, 10)
        }

        abort() {
            this.readyState = 0
        }
    }

    ;(globalThis as any).XMLHttpRequest = MockXHR

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
            ;(globalThis as any).XMLHttpRequest = originalXHR
            done()
        },
    })
})
