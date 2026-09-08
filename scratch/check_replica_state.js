async function run() {
    const res = await fetch("https://winelore-dev.thewinelore.com/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-ACTOR": "1" },
        body: JSON.stringify({
            query: `
                query {
                    commissionReplica(id: "edafb0bb-94c7-40be-899c-bf38fd5b2df8") {
                        id
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
            `
        })
    });
    console.log(await res.text());
}
run();
