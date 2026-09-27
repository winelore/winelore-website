import {
    createSSEParserState,
    parseSSEChunk,
    EVALUATION_SSE_EVENT_NAMES,
    type SSEEvent,
} from "@winelore/core"

export interface SSEClientOptions {
    url: string
    headers?: Record<string, string>
    onMessage: (event: SSEEvent) => void
    onOpen?: () => void
    onError?: (error: unknown) => void
    initialRetryMs?: number
    maxRetryMs?: number
    /**
     * Skip the native EventSource branch and use the XMLHttpRequest streaming
     * transport. Required on React Native whenever custom headers must be sent:
     * the EventSource API cannot attach headers (including Authorization or
     * Last-Event-ID on the initial request).
     */
    forceXhrTransport?: boolean
}

export interface SSEClient {
    close: () => void
}

/**
 * Universal Server-Sent Events client for React Native and web.
 * Uses native EventSource if available; falls back to an incremental
 * streaming XMLHttpRequest transport with automatic reconnection and backoff.
 *
 * The XHR transport is always used when custom headers are provided or
 * `forceXhrTransport` is set, because EventSource cannot send headers.
 */
export function createSSEClient(options: SSEClientOptions): SSEClient {
    let closed = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let retryDelay = options.initialRetryMs ?? 1000
    const maxRetryDelay = options.maxRetryMs ?? 15000
    let lastEventId: string | undefined

    const useXhrTransport =
        options.forceXhrTransport === true ||
        (options.headers !== undefined && Object.keys(options.headers).length > 0) ||
        typeof globalThis.EventSource === "undefined"

    // 1. Browser or polyfilled environment with EventSource (headerless only)
    if (!useXhrTransport && typeof globalThis.EventSource !== "undefined") {
        let eventSource: EventSource | null = null

        try {
            eventSource = new EventSource(options.url)

            eventSource.onopen = () => {
                if (closed) return
                options.onOpen?.()
            }

            const handleRawEvent = (e: MessageEvent) => {
                if (closed || !e.data) return
                if (e.lastEventId) {
                    lastEventId = e.lastEventId
                }
                options.onMessage({
                    event: e.type !== "message" ? e.type : undefined,
                    data: e.data,
                    id: e.lastEventId,
                })
            }

            eventSource.onmessage = handleRawEvent
            for (const name of EVALUATION_SSE_EVENT_NAMES) {
                eventSource.addEventListener(name, handleRawEvent)
            }

            eventSource.onerror = (err) => {
                if (closed) return
                options.onError?.(err)
            }
        } catch (err) {
            options.onError?.(err)
        }

        return {
            close: () => {
                closed = true
                if (eventSource) {
                    eventSource.close()
                    eventSource = null
                }
            },
        }
    }

    // 2. React Native (iOS / Android) XMLHttpRequest streaming transport
    let currentXhr: XMLHttpRequest | null = null

    const scheduleReconnect = () => {
        if (closed || retryTimer) return
        retryTimer = setTimeout(() => {
            retryTimer = null
            retryDelay = Math.min(retryDelay * 1.5, maxRetryDelay)
            connect()
        }, retryDelay)
    }

    const connect = () => {
        if (closed) return

        try {
            const xhr = new XMLHttpRequest()
            currentXhr = xhr
            const parserState = createSSEParserState()
            let seenBytes = 0
            let opened = false

            xhr.open("GET", options.url, true)
            xhr.setRequestHeader("Accept", "text/event-stream")
            xhr.setRequestHeader("Cache-Control", "no-cache")
            if (lastEventId) {
                xhr.setRequestHeader("Last-Event-ID", lastEventId)
            }
            if (options.headers) {
                for (const [key, value] of Object.entries(options.headers)) {
                    xhr.setRequestHeader(key, value)
                }
            }

            xhr.onreadystatechange = () => {
                if (closed) return

                if (xhr.readyState >= 2 && xhr.status >= 200 && xhr.status < 300) {
                    if (!opened) {
                        opened = true
                        retryDelay = options.initialRetryMs ?? 1000
                        options.onOpen?.()
                    }
                }

                if (xhr.readyState === 3 || xhr.readyState === 4) {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const fullText = xhr.responseText || ""
                        if (fullText.length > seenBytes) {
                            const chunk = fullText.slice(seenBytes)
                            seenBytes = fullText.length
                            parseSSEChunk(chunk, parserState, (event) => {
                                if (event.id) lastEventId = event.id
                                options.onMessage(event)
                            })
                        }
                    }
                }

                if (xhr.readyState === 4) {
                    currentXhr = null
                    scheduleReconnect()
                }
            }

            xhr.onerror = (error) => {
                if (closed) return
                options.onError?.(error)
                currentXhr = null
                scheduleReconnect()
            }

            xhr.ontimeout = () => {
                if (closed) return
                currentXhr = null
                scheduleReconnect()
            }

            xhr.send()
        } catch (error) {
            options.onError?.(error)
            scheduleReconnect()
        }
    }

    connect()

    return {
        close: () => {
            closed = true
            if (retryTimer) {
                clearTimeout(retryTimer)
                retryTimer = null
            }
            if (currentXhr) {
                try {
                    currentXhr.abort()
                } catch {}
                currentXhr = null
            }
        },
    }
}
