import { useEffect, useRef } from "react"
import {
    isEvaluationRelevantEvent,
    type EventNotification,
} from "@winelore/core"
import { createSSEClient } from "./sseClient"
import { getEventsEndpoint } from "./endpoint"

export interface UseLiveUpdatesOptions {
    /**
     * ID of the active commission.
     */
    commissionId?: string
    /**
     * ID of the active replica.
     */
    replicaId?: string
    /**
     * Callback invoked when a relevant event is received or upon SSE reconnection.
     */
    onUpdate: () => void | Promise<void>
    /**
     * Whether the live SSE subscription is enabled. Defaults to true.
     */
    enabled?: boolean
    /**
     * Relaxed fallback polling interval in milliseconds.
     * Defaults to 15,000ms (15 seconds).
     */
    fallbackIntervalMs?: number
    /**
     * Debounce window for consecutive event notifications in milliseconds.
     * Defaults to 150ms.
     */
    debounceMs?: number
}

const DEFAULT_FALLBACK_INTERVAL_MS = 15_000
const DEFAULT_DEBOUNCE_MS = 150

/**
 * Subscribes to Server-Sent Events from the events endpoint for real-time updates
 * during tastings, wait room, and panel summaries on mobile.
 */
export function useLiveUpdates({
    commissionId,
    replicaId,
    onUpdate,
    enabled = true,
    fallbackIntervalMs = DEFAULT_FALLBACK_INTERVAL_MS,
    debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseLiveUpdatesOptions) {
    const onUpdateRef = useRef(onUpdate)
    onUpdateRef.current = onUpdate

    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const hasConnectedRef = useRef(false)

    useEffect(() => {
        if (!enabled) return

        let isMounted = true

        const triggerDebouncedUpdate = () => {
            if (!isMounted) return
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current)
            }
            debounceTimerRef.current = setTimeout(() => {
                if (isMounted) {
                    onUpdateRef.current()
                }
            }, debounceMs)
        }

        // Relaxed fallback polling interval (e.g. 15s) in case of network isolation or reconnect delays
        const fallbackInterval = setInterval(() => {
            if (isMounted) {
                onUpdateRef.current()
            }
        }, fallbackIntervalMs)

        const handleData = (rawJson: string) => {
            if (!isMounted || !rawJson) return
            try {
                const notification = JSON.parse(rawJson) as EventNotification
                if (isEvaluationRelevantEvent(notification, { commissionId, replicaId })) {
                    triggerDebouncedUpdate()
                }
            } catch {
                // Ignore non-JSON or ping payloads
            }
        }

        const endpoint = getEventsEndpoint()
        const client = createSSEClient({
            url: endpoint,
            onOpen: () => {
                if (!isMounted) return
                // As specified in AsyncAPI: clients should refetch their GraphQL view on reconnect
                if (hasConnectedRef.current) {
                    triggerDebouncedUpdate()
                }
                hasConnectedRef.current = true
            },
            onMessage: (event) => {
                handleData(event.data)
            },
            onError: () => {
                // Reconnect is automatically scheduled by createSSEClient
            },
        })

        return () => {
            isMounted = false
            clearInterval(fallbackInterval)
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current)
            }
            client.close()
        }
    }, [commissionId, replicaId, enabled, fallbackIntervalMs, debounceMs])
}
