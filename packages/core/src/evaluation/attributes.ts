/**
 * Beverage, batch and sample attributes arrive as an opaque string whose format
 * depends on how the backend serialized them.
 */

/**
 * Parse an attributes blob into a flat string map.
 *
 * Handles three shapes: an already-decoded object, a JSON string, and Kotlin's
 * `toString()` of a Map (`{key=value, key2=value2}`), which the backend emits
 * where a field was never serialized as JSON. Anything unrecognised yields an
 * empty map rather than throwing — attributes are decorative, and one
 * malformed field must not take down the evaluation screen.
 */
export function parseAttributes(raw: unknown): Record<string, string> {
    if (!raw) return {}

    if (typeof raw === "object") {
        return stringifyValues(raw as Record<string, unknown>)
    }

    const trimmed = String(raw).trim()
    if (!trimmed) return {}

    try {
        const parsed = JSON.parse(trimmed)
        if (parsed && typeof parsed === "object") {
            return stringifyValues(parsed as Record<string, unknown>)
        }
    } catch {
        // Not JSON — fall through to the Kotlin Map form.
    }

    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        const content = trimmed.slice(1, -1).trim()
        if (!content) return {}

        const result: Record<string, string> = {}
        for (const part of content.split(/,\s*/)) {
            const separator = part.indexOf("=")
            if (separator === -1) continue
            const key = unquote(part.slice(0, separator).trim())
            if (key) result[key] = unquote(part.slice(separator + 1).trim())
        }
        return result
    }

    return {}
}

function stringifyValues(source: Record<string, unknown>): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(source)) {
        if (value !== null && value !== undefined) result[key] = String(value)
    }
    return result
}

function unquote(value: string): string {
    return value.replace(/^["']|["']$/g, "")
}

export interface VisibleAttribute {
    label: string
    value: string
}

/**
 * Pick out the attributes a competition has chosen to show during evaluation.
 *
 * Keys are matched case-insensitively, because the visibility list and the
 * stored attribute keys are authored separately (`vintage` vs `Vintage`).
 * Empty values are dropped rather than shown as blank rows.
 */
export function selectVisibleAttributes(
    raw: unknown,
    visibleKeys: string[] | null | undefined,
): VisibleAttribute[] {
    if (!raw || !visibleKeys?.length) return []

    const parsed = parseAttributes(raw)
    const parsedKeys = Object.keys(parsed)
    const selected: VisibleAttribute[] = []

    for (const key of visibleKeys) {
        const actualKey = parsedKeys.find((k) => k.toLowerCase() === key.toLowerCase())
        if (actualKey === undefined) continue
        const value = parsed[actualKey]
        if (value === undefined || value === null || value === "") continue
        selected.push({ label: key, value: String(value) })
    }

    return selected
}
