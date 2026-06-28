export type NumericInputErrorReason = "invalid" | "not_whole_number"

export type NumericInputParseResult =
    | { ok: true; value: number }
    | { ok: false; reason: "empty" | NumericInputErrorReason }

export function parseEvaluationNumericInput(raw: string, isDouble: boolean): NumericInputParseResult {
    const trimmed = raw.trim()
    if (trimmed === "") return { ok: false, reason: "empty" }

    if (!isDouble) {
        if (!/^-?\d+$/.test(trimmed)) {
            if (/[.,/]/.test(trimmed) || /[eE]/.test(trimmed)) {
                return { ok: false, reason: "not_whole_number" }
            }
            return { ok: false, reason: "invalid" }
        }
        return { ok: true, value: Number(trimmed) }
    }

    const parsed = Number(trimmed)
    if (Number.isNaN(parsed)) return { ok: false, reason: "invalid" }
    return { ok: true, value: parsed }
}
