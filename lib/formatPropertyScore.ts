import type { PropertyMeta, PropertyValueKind } from "@/app/commission/propertyMap";

export interface BooleanScoreLabels {
    yesLabel: string;
    noLabel: string;
}

/**
 * Strictly recognize a stored boolean. Only literal booleans and the strings
 * "true"/"false" qualify so that numeric properties storing "0"/"1" are never
 * mistaken for booleans when no type metadata is available.
 */
export function parseStoredBoolean(value: unknown): boolean | null {
    if (value === true) return true;
    if (value === false) return false;
    if (value == null) return null;
    const normalized = String(value).trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
    return null;
}

/** Same as parseStoredBoolean, but also accepts 0/1 for known boolean properties. */
function parseBooleanForKind(value: unknown): boolean | null {
    const strict = parseStoredBoolean(value);
    if (strict !== null) return strict;
    if (value == null) return null;
    const normalized = String(value).trim();
    if (normalized === "1") return true;
    if (normalized === "0") return false;
    return null;
}

export function hasStoredScoreValue(value: unknown, _kind?: PropertyValueKind): boolean {
    if (value === true || value === false) return true;
    if (value == null) return false;
    if (typeof value === "number") return !Number.isNaN(value);
    return String(value).trim() !== "";
}

export function roundScoreToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
}

function formatNumericScoreDisplay(value: unknown): string | null {
    if (value == null) return null;
    if (typeof value === "string" && value.trim() === "") return null;
    const num = typeof value === "number" ? value : parseFloat(String(value).trim());
    if (Number.isNaN(num)) return null;
    return num.toFixed(2);
}

export function formatPropertyScoreValue(
    value: unknown,
    meta: PropertyMeta | undefined,
    labels: BooleanScoreLabels,
): string {
    if (meta?.kind === "boolean") {
        const parsed = parseBooleanForKind(value);
        if (parsed !== null) return parsed ? labels.yesLabel : labels.noLabel;
        if (value == null || String(value).trim() === "") return "-";
        return String(value);
    }

    // Auto-detect literal booleans even without type metadata.
    const asBoolean = parseStoredBoolean(value);
    if (asBoolean !== null) return asBoolean ? labels.yesLabel : labels.noLabel;

    if (meta?.kind === "numeric" || meta?.kind === "discrete" || meta?.kind === "smart") {
        const formatted = formatNumericScoreDisplay(value);
        if (formatted !== null) return formatted;
    }

    if (value == null || String(value).trim() === "") return "-";
    return String(value);
}

export function aggregatePropertyScores(
    values: Array<string | null | undefined>,
    kind: PropertyValueKind | undefined,
    labels: BooleanScoreLabels,
): string {
    const present = values.filter((v) => v != null && String(v).trim() !== "") as string[];
    if (present.length === 0) return "-";

    const isBoolean =
        kind === "boolean" || present.every((v) => parseStoredBoolean(v) !== null);

    if (isBoolean) {
        const formatted = Array.from(
            new Set(
                present.map((v) => {
                    const parsed = kind === "boolean" ? parseBooleanForKind(v) : parseStoredBoolean(v);
                    return parsed === null ? String(v) : parsed ? labels.yesLabel : labels.noLabel;
                }),
            ),
        );
        return formatted.join(" | ");
    }

    const isNumeric =
        kind === "numeric" ||
        kind === "discrete" ||
        (kind === undefined && present.every((v) => !isNaN(parseFloat(String(v)))));

    if (isNumeric) {
        const sum = present.reduce((acc, curr) => acc + parseFloat(String(curr)), 0);
        return (sum / present.length).toFixed(2);
    }

    return Array.from(new Set(present.map(String))).join(" | ");
}
