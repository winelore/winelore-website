async function run() {
    const res = await fetch("https://winelore-dev.thewinelore.com/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-ACTOR": "1" },
        body: JSON.stringify({
            query: `
                query GetReplica($id: ID!) {
                    commissionReplica(id: $id) {
                        id
                        name
                        status
                        currentCandidateId
                        replicaCandidates {
                            id
                            status
                            candidate {
                                id
                                anonymizedCode
                            }
                        }
                    }
                }
            `,
            variables: { id: "edafb0bb-94c7-40be-899c-bf38fd5b2df8" }
        })
    });
    console.log("Replica after start:", JSON.stringify(await res.json(), null, 2));
}

run().catch(console.error);
