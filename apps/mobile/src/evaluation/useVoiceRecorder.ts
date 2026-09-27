import { useCallback, useEffect, useRef, useState } from "react"
import {
    RecordingPresets,
    requestRecordingPermissionsAsync,
    setAudioModeAsync,
    useAudioRecorder,
    useAudioRecorderState,
} from "expo-audio"

/** A finished recording, held until the scorecard is submitted. */
export interface VoiceRecording {
    uri: string
    contentType: string
    durationSeconds: number
}

export type RecorderError = "permission" | "failed"

/**
 * Recording a voice comment.
 *
 * One recorder serves the whole scorecard — a phone has a single microphone,
 * and the web form likewise allows only one recording at a time — so starting
 * on a second property stops the first and keeps what it captured.
 *
 * The result is a local file, not an upload: it is uploaded on submit, so a
 * judge who re-records or abandons the card costs nothing.
 */
export function useVoiceRecorder() {
    // HIGH_QUALITY records AAC in an .m4a container on both platforms.
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
    const status = useAudioRecorderState(recorder, 500)
    const [activeKey, setActiveKey] = useState<string | null>(null)
    const [error, setError] = useState<RecorderError | null>(null)
    const [recordings, setRecordings] = useState<Record<string, VoiceRecording>>({})
    // Read inside callbacks without making them depend on the live key.
    const active = useRef<string | null>(null)

    useEffect(() => {
        active.current = activeKey
    }, [activeKey])

    /** Keep whatever has been captured under the key it was started for. */
    const finish = useCallback(async () => {
        const key = active.current
        if (!key) return
        active.current = null
        setActiveKey(null)
        try {
            await recorder.stop()
            const uri = recorder.uri
            if (uri) {
                setRecordings((previous) => ({
                    ...previous,
                    [key]: {
                        uri,
                        contentType: "audio/mp4",
                        durationSeconds: Math.round((status.durationMillis ?? 0) / 1000),
                    },
                }))
            }
        } catch {
            setError("failed")
        }
    }, [recorder, status.durationMillis])

    const start = useCallback(
        async (key: string) => {
            if (active.current) await finish()
            setError(null)
            try {
                const permission = await requestRecordingPermissionsAsync()
                if (!permission.granted) {
                    setError("permission")
                    return
                }
                // Recording has to be allowed explicitly, and the mode reverts
                // for playback when a note is played back on the same screen.
                await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
                await recorder.prepareToRecordAsync()
                recorder.record()
                active.current = key
                setActiveKey(key)
            } catch {
                setError("failed")
            }
        },
        [recorder, finish],
    )

    const stop = useCallback(async () => {
        await finish()
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
    }, [finish])

    const discard = useCallback(
        async (key: string) => {
            if (active.current === key) await stop()
            setRecordings((previous) => {
                const next = { ...previous }
                delete next[key]
                return next
            })
        },
        [stop],
    )

    // A recorder left running when the judge leaves the scorecard would hold
    // the microphone open for the rest of the session.
    useEffect(() => {
        return () => {
            if (active.current) recorder.stop().catch(() => {})
        }
    }, [recorder])

    return {
        recordings,
        activeKey,
        error,
        clearError: useCallback(() => setError(null), []),
        elapsedSeconds: Math.round((status.durationMillis ?? 0) / 1000),
        start,
        stop,
        discard,
    }
}
