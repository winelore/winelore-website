"use client";

import { useEffect, useRef } from "react";
import {
    EVALUATION_SSE_EVENT_NAMES,
    isEvaluationRelevantEvent,
    type EventNotification,
} from "@winelore/core";

export interface UseEvaluationLiveUpdatesOptions {
    /**
     * ID of the active commission.
     */
    commissionId?: string;
    /**
     * ID of the active replica.
     */
    replicaId?: string;
    /**
     * Callback invoked when a relevant event is received or upon SSE reconnection.
     */
    onUpdate: () => void | Promise<void>;
    /**
     * Whether the live SSE subscription is enabled. Defaults to true.
     */
    enabled?: boolean;
    /**
     * Relaxed fallback polling interval in milliseconds.
     * Defaults to 15,000ms (15 seconds).
     */
    fallbackIntervalMs?: number;
    /**
     * Debounce window for consecutive event notifications in milliseconds.
     * Defaults to 150ms.
     */
    debounceMs?: number;
}

const DEFAULT_SSE_ENDPOINT = "/api/v1/events";
const DEFAULT_FALLBACK_INTERVAL_MS = 15_000;
const DEFAULT_DEBOUNCE_MS = 150;

/**
 * Subscribes to Server-Sent Events from /api/v1/events for real-time updates
 * during tastings, wait room, and panel summaries.
 */
export function useEvaluationLiveUpdates({
    commissionId,
    replicaId,
    onUpdate,
    enabled = true,
    fallbackIntervalMs = DEFAULT_FALLBACK_INTERVAL_MS,
    debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseEvaluationLiveUpdatesOptions) {
    const onUpdateRef = useRef(onUpdate);
    onUpdateRef.current = onUpdate;

    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasConnectedRef = useRef(false);

    useEffect(() => {
        if (!enabled) return;

        let isMounted = true;

        const triggerDebouncedUpdate = () => {
            if (!isMounted) return;
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout(() => {
                if (isMounted) {
                    onUpdateRef.current();
                }
            }, debounceMs);
        };

        // Fallback polling interval (relaxed, e.g. 15s)
        const fallbackInterval = setInterval(() => {
            if (isMounted) {
                onUpdateRef.current();
            }
        }, fallbackIntervalMs);

        const handleMessageEvent = (event: MessageEvent) => {
            if (!isMounted || !event.data) return;
            try {
                const notification = JSON.parse(event.data) as EventNotification;
                if (isEvaluationRelevantEvent(notification, { commissionId, replicaId })) {
                    triggerDebouncedUpdate();
                }
            } catch (e) {
                // Ignore keepalives or non-JSON comments
            }
        };

        // SSE Connection
        let eventSource: EventSource | null = null;
        try {
            eventSource = new EventSource(DEFAULT_SSE_ENDPOINT);

            eventSource.onopen = () => {
                if (!isMounted) return;
                // As specified in AsyncAPI: clients should refetch their GraphQL view on reconnect
                if (hasConnectedRef.current) {
                    triggerDebouncedUpdate();
                }
                hasConnectedRef.current = true;
            };

            // Generic message listener (for untyped or 'message' events)
            eventSource.onmessage = handleMessageEvent;


            // Named event listeners matching AsyncAPI eventNameTemplate '{aggregateType}.{eventType}'
            for (const eventName of EVALUATION_SSE_EVENT_NAMES) {
                eventSource.addEventListener(eventName, handleMessageEvent);
            }

            eventSource.onerror = (err) => {
                // EventSource automatically handles reconnecting in browsers.
                // Log warning only in development or if state is closed.
                if (eventSource?.readyState === EventSource.CLOSED) {
                    console.warn("SSE connection closed, will rely on fallback polling.");
                }
            };
        } catch (err) {
            console.warn("Failed to initialize SSE EventSource, falling back to polling:", err);
        }

        return () => {
            isMounted = false;
            clearInterval(fallbackInterval);
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            if (eventSource) {
                for (const eventName of EVALUATION_SSE_EVENT_NAMES) {
                    eventSource.removeEventListener(eventName, handleMessageEvent);
                }
                eventSource.close();
            }
        };
    }, [commissionId, replicaId, enabled, fallbackIntervalMs, debounceMs]);
}
