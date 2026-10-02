export function ownerLabel(
    auid: number | string,
    usernames: Record<string, string>,
): string {
    const key = String(auid)
    const resolved = usernames[key]
    if (resolved) return resolved

    return `@${key}`
}
