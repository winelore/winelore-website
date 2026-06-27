function escapeCsvCell(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`
    }
    return value
}

export interface ExportRow {
    code: string
    beverage: string
    overallAverage: string
    rank: string
    awards: string
    replicaTotals: Record<string, string>
}

export function buildResultsCsv(
    commissionName: string,
    replicaLabels: { id: string; label: string }[],
    rows: ExportRow[],
): string {
    const headers = [
        "Code",
        "Beverage",
        "Overall Average",
        "Rank",
        "Awards",
        ...replicaLabels.map((r) => r.label),
    ]

    const lines = [
        headers.map(escapeCsvCell).join(","),
        ...rows.map((row) =>
            [
                row.code,
                row.beverage,
                row.overallAverage,
                row.rank,
                row.awards,
                ...replicaLabels.map((r) => row.replicaTotals[r.id] ?? "-"),
            ]
                .map(escapeCsvCell)
                .join(","),
        ),
    ]

    return lines.join("\n")
}

export function downloadCsv(content: string, filename: string): void {
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
}

export function sanitizeFilename(name: string): string {
    return name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 80) || "results"
}
