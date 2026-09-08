async function run() {
    const compId = "8d672e5a-a90a-4088-9ad8-1e9d0f8dffdb";
    const commId = "2878228a-480e-4f8b-bf3c-376efeb3ea72";
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

    // 0. Get Competition and its Series
    const compData = await req(`
        query GetComp($id: ID!) {
            competition(id: $id) {
                id
                name
                status
                series {
                    id
                    name
                    status
                }
            }
        }
    `, { id: compId });
    console.log("Competition data:", JSON.stringify(compData, null, 2));
    const seriesId = compData.data?.competition?.series?.id;
    const seriesStatus = compData.data?.competition?.series?.status;

    if (seriesId && seriesStatus !== 'APPROVED' && seriesStatus !== 'PUBLISHED') {
        console.log(`0a. Approving series ${seriesId}...`);
        const subSeries = await req(`mutation { submitCompetitionSeriesForReview(id: "${seriesId}") { id status } }`);
        console.log("Submit series:", JSON.stringify(subSeries, null, 2));
        const appSeries = await req(`mutation { approveCompetitionSeries(id: "${seriesId}") { id status } }`);
        console.log("Approve series:", JSON.stringify(appSeries, null, 2));
    }

    console.log("1. Plan Competition:");
    const planComp = await req(`mutation { planCompetition(id: "${compId}") { id status } }`);
    console.log(JSON.stringify(planComp, null, 2));

    console.log("2. Start Competition:");
    const startComp = await req(`mutation { startCompetition(id: "${compId}") { id status } }`);
    console.log(JSON.stringify(startComp, null, 2));

    console.log("3. Start Commission:");
    const startComm = await req(`mutation { startCommission(id: "${commId}") { id status } }`);
    console.log(JSON.stringify(startComm, null, 2));

    console.log("4. Start Replica:");
    const startReplica = await req(`mutation { startCommissionReplica(id: "${replicaId}") { id status } }`);
    console.log(JSON.stringify(startReplica, null, 2));
}

run().catch(console.error);
