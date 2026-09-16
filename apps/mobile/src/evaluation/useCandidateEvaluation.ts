import { useCallback, useEffect, useState } from "react"
import {
    isAlreadySubmittedError,
    selectEvaluationCategories,
    selectVisibleAttributes,
    voiceUploadFileName,
    type EvaluationCategory,
    type EvaluationCommentInput,
    type EvaluationScoreInput,
    type VisibleAttribute,
} from "@winelore/core/evaluation"
import {
    GET_COMMISSION_TEMPLATES_DEEP_QUERY,
    type CompetitionFeatureFlags,
    type GetCommissionTemplatesDeepResult,
} from "@winelore/core"
import { getCompetitionFeatureFlags } from "@winelore/core/commission"
import { File } from "expo-file-system"
import { fetchGraphQLRaw, mutateGraphQLRaw, sdk } from "../api/client"
import type { VoiceRecording } from "./useVoiceRecorder"

const PRESIGN_AUDIO_UPLOAD = `
    mutation GetAudioUploadUrl($fileName: String!, $contentType: String!) {
        getPresignedAudioUploadUrl(fileName: $fileName, contentType: $contentType) {
            uploadUrl
            fileUrl
        }
    }
`

export type CandidateEvaluationState =
    | { status: "loading" }
    | { status: "error"; message: string }
    | {
          status: "ready"
          commissionId: string
          replicaId: string
          candidateCode: string
          beverageName: string | null
          categories: EvaluationCategory[]
          visibleAttributes: VisibleAttribute[]
          flags: CompetitionFeatureFlags
      }

/**
 * Loads one candidate's scorecard and submits it.
 *
 * The web equivalent is split between a server component that redirects on
 * stale state and a client component that polls. Neither is ported yet: this
 * fetches and submits only, so the screen has real data to render. Panel
 * sequencing — being sent to the right candidate, or to the waiting room when
 * the panel moves on — is the next piece of work and is what the web's
 * `page.tsx` guard clauses and 3-second poll handle.
 */
export function useCandidateEvaluation(candidateId: string) {
    const [state, setState] = useState<CandidateEvaluationState>({ status: "loading" })

    useEffect(() => {
        let active = true

        async function load() {
            setState({ status: "loading" })
            try {
                const { commissionReplicaCandidate } = await sdk.GetReplicaCandidate({
                    id: candidateId,
                })
                if (!commissionReplicaCandidate) throw new Error("Candidate not found")
                if (!active) return

                const commissionId = commissionReplicaCandidate.replicaPanel.replica.commission.id

                // The scorecard's shape and the commission's settings come from
                // different queries; neither depends on the other.
                const [{ commission }, templates] = await Promise.all([
                    sdk.GetCommission({ id: commissionId }),
                    fetchGraphQLRaw<GetCommissionTemplatesDeepResult>(
                        GET_COMMISSION_TEMPLATES_DEEP_QUERY,
                        { id: commissionId },
                    ),
                ])
                if (!active) return

                const candidate = commissionReplicaCandidate.candidate
                const sample = candidate?.sample
                const batch = sample?.batch
                const beverage = batch?.beverage
                const visible = commission?.evaluationVisibleAttributes

                setState({
                    status: "ready",
                    commissionId,
                    replicaId: commissionReplicaCandidate.replicaPanel.replica.id,
                    candidateCode: candidate?.anonymizedCode?.trim() || candidateId,
                    beverageName: beverage?.name ?? null,
                    categories: selectEvaluationCategories(
                        templates?.commission?.templateEditions,
                    ),
                    visibleAttributes: [
                        ...selectVisibleAttributes(beverage?.attributes, visible?.beverage),
                        ...selectVisibleAttributes(batch?.attributes, visible?.batch),
                        ...selectVisibleAttributes(sample?.attributes, visible?.sample),
                    ],
                    flags: getCompetitionFeatureFlags(commission),
                })
            } catch (err) {
                if (!active) return
                setState({
                    status: "error",
                    message: err instanceof Error ? err.message : "Could not load this candidate",
                })
            }
        }

        load()
        return () => {
            active = false
        }
    }, [candidateId])

    /**
     * Submit and confirm.
     *
     * A backend rejection saying the evaluation already exists is not treated
     * as a failure: the judge's work is recorded, so this confirms and
     * returns, exactly as the web form does. Anything else propagates for the
     * screen to show.
     */
    /**
     * Put a recording where the backend can serve it: ask for a presigned URL,
     * then PUT the file itself. The same two steps the web form takes.
     *
     * Undefined on any failure, so a submit carries the text and loses only
     * the note — losing the whole scorecard to a flaky upload would be worse.
     */
    const uploadVoice = useCallback(
        async (recording: VoiceRecording, key: string): Promise<string | undefined> => {
            try {
                const presigned = await mutateGraphQLRaw<{
                    getPresignedAudioUploadUrl: { uploadUrl: string; fileUrl: string } | null
                }>(PRESIGN_AUDIO_UPLOAD, {
                    fileName: voiceUploadFileName(key, recording.contentType),
                    contentType: recording.contentType,
                })
                const target = presigned?.getPresignedAudioUploadUrl
                if (!target) return undefined

                // A voice comment is seconds of AAC, so reading it whole is
                // cheap and keeps the PUT a plain one — S3 presigned URLs sign
                // the method and headers, not a multipart body.
                const response = await fetch(target.uploadUrl, {
                    method: "PUT",
                    headers: { "Content-Type": recording.contentType },
                    body: await new File(recording.uri).arrayBuffer(),
                })
                return response.ok ? target.fileUrl : undefined
            } catch {
                return undefined
            }
        },
        [],
    )

    const submit = useCallback(
        async (scores: EvaluationScoreInput[], comments: EvaluationCommentInput[] = []) => {
            try {
                const result = await sdk.SubmitEvaluation({ input: { candidateId, scores, comments } })
                const evaluation = result?.submitEvaluation
                if (evaluation?.id && (evaluation.status !== "CONFIRMED" || !evaluation.isComplete)) {
                    await sdk.ConfirmEvaluation({ id: evaluation.id })
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : ""
                if (isAlreadySubmittedError(message)) return
                throw err
            }
        },
        [candidateId],
    )

    return { state, submit, uploadVoice }
}
