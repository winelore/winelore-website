import { roundScoreToTwoDecimals } from "../formatPropertyScore"
import type {
    EvaluationProperty,
    EvaluationScoreInput,
    EvaluationValues,
} from "./types"

/**
 * Turn the judge's entered values into the scores the submit mutation expects.
 *
 * SmartProperties are excluded — the backend recomputes them from the formula,
 * and sending a client-computed value would let a rounding difference become a
 * scoring difference. Doubles are fixed to two decimals so the wire value
 * matches what the judge was shown.
 */
export function buildScoresPayload(
    values: EvaluationValues,
    propertyByCode: Map<string, EvaluationProperty>,
    smartPropertyCodes: Set<string>,
): EvaluationScoreInput[] {
    return Object.entries(values)
        .filter(
            ([code, value]) =>
                value !== undefined && value !== null && !smartPropertyCodes.has(code),
        )
        .map(([code, value]) => {
            const property = propertyByCode.get(code)
            const serialized =
                property?.__typename === "DoubleProperty" && typeof value === "number"
                    ? roundScoreToTwoDecimals(value).toFixed(2)
                    : String(value)
            return { code, value: serialized }
        })
}

/** Error messages from the backend that mean "this evaluation is already in". */
const ALREADY_SUBMITTED_MARKERS = [
    "already submitted",
    "not pending",
    "REPLICA_CANDIDATE_EVALUATION_ENDED",
    "EVALUATION_ALREADY_EXISTS",
    "Replica is not started",
    "REPLICA_NOT_STARTED",
]

/**
 * Whether a submit failure means the evaluation already exists server-side.
 *
 * This is not really a failure: the judge's work is recorded, so the client
 * should confirm and move on rather than show an error. It happens when a
 * submit is retried, or sent from a second tab or device.
 */
export function isAlreadySubmittedError(message: string | null | undefined): boolean {
    if (!message) return false
    return ALREADY_SUBMITTED_MARKERS.some((marker) => message.includes(marker))
}

/** Whether the failure means the panel has moved on to a different candidate. */
export function isNotCurrentCandidateError(message: string | null | undefined): boolean {
    return Boolean(message?.includes("current active candidate"))
}
