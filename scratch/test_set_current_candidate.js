async function run() {
    const replicaId = "edafb0bb-94c7-40be-899c-bf38fd5b2df8";
    async function req(query, variables = {}) {
        const res = await fetch("https://winelore-dev.thewinelore.com/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-ACTOR": "1" },
            body: JSON.stringify({ query, variables })
        });
        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    }

    const state = await req(`query {
        commissionReplica(id: "${replicaId}") {
            id
            status
            currentCandidateId
            replicaCandidates {
                id
                status
                candidate { id }
            }
        }
    }`);
    console.log("Current state:", JSON.stringify(state, null, 2));

    const rep = state.data?.commissionReplica;
    const firstCand = rep?.replicaCandidates?.[0];
    if (firstCand) {
        console.log("Setting current candidate to:", firstCand.id, "or candidate ID:", firstCand.candidate?.id);
        const setRes1 = await req(`mutation {
            setCommissionReplicaCurrentCandidate(id: "${replicaId}", currentCandidateId: "${firstCand.candidate?.id}") {
                id
                currentCandidateId
            }
        }`);
        console.log("Set candidate ID result:", JSON.stringify(setRes1));

        const setRes2 = await req(`mutation {
            setCommissionReplicaCurrentCandidate(id: "${replicaId}", currentCandidateId: "${firstCand.id}") {
                id
                currentCandidateId
            }
        }`);
        console.log("Set replicaCandidate ID result:", JSON.stringify(setRes2));
    }
}

run();
