export function isReplicaCandidateFinished(status: string): boolean {
    return status === "EVALUATED" || status === "DISQUALIFIED";
}
