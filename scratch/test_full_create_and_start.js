async function run() {
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

    // 1. Create Series
    const sRes = await req(`mutation {
        createCompetitionSeries(input: {
            name: "Test Flow Series ${Date.now()}",
            countriesType: "GLOBAL",
            countriesCodes: [],
            owners: [[1]]
        }) { id name status }
    }`);
    console.log("Create series:", JSON.stringify(sRes));
    const seriesId = sRes.data?.createCompetitionSeries?.id;

    // 2. Create Competition
    const compRes = await req(`mutation {
        createCompetition(input: {
            name: "Test Flow Competition ${Date.now()}",
            seriesId: "${seriesId}",
            holders: [[1]]
        }) { id name status }
    }`);
    console.log("Create competition:", JSON.stringify(compRes));
    const compId = compRes.data?.createCompetition?.id;

    // 3. Create Commission
    const commRes = await req(`mutation {
        createCommission(input: {
            name: "Test Flow Commission",
            competitionId: "${compId}"
        }) { id name status replicas { id status } }
    }`);
    console.log("Create commission:", JSON.stringify(commRes));
    const commId = commRes.data?.createCommission?.id;
    const replicaId = commRes.data?.createCommission?.replicas?.[0]?.id;

    console.log(`Created: Series: ${seriesId}, Comp: ${compId}, Comm: ${commId}, Replica: ${replicaId}`);

    // Now test transition flow!
    // Step A: Series DRAFT -> APPROVED
    const subS = await req(`mutation { submitCompetitionSeriesForReview(id: "${seriesId}") { id status } }`);
    console.log("Submit series:", JSON.stringify(subS));
    const appS = await req(`mutation { approveCompetitionSeries(id: "${seriesId}") { id status } }`);
    console.log("Approve series:", JSON.stringify(appS));

    // Step B: Competition DRAFT -> APPROVED -> PLANNED -> STARTED
    const subC = await req(`mutation { submitCompetitionForReview(id: "${compId}") { id status } }`);
    console.log("Submit comp:", JSON.stringify(subC));
    const appC = await req(`mutation { approveCompetition(id: "${compId}") { id status } }`);
    console.log("Approve comp:", JSON.stringify(appC));
    const planC = await req(`mutation { planCompetition(id: "${compId}") { id status } }`);
    console.log("Plan comp:", JSON.stringify(planC));
    const stComp = await req(`mutation { startCompetition(id: "${compId}") { id status } }`);
    console.log("Started competition:", JSON.stringify(stComp));

    // Step C: Commission Bind Template -> SUBMIT -> APPROVE -> PLAN -> START
    const bindT = await req(`mutation {
        setCommissionTemplateEdition(
            id: "${commId}",
            beverageTypeId: "11111111-1111-4111-8111-111111111101",
            templateEditionId: "a2b0e00d-5ee2-45e0-b6a2-683a45c7ad56"
        ) { id }
    }`);
    console.log("Bind template:", JSON.stringify(bindT));
    const subComm = await req(`mutation { submitCommissionForReview(id: "${commId}") { id status } }`);
    console.log("Submit comm:", JSON.stringify(subComm));
    const appComm = await req(`mutation { approveCommission(id: "${commId}") { id status } }`);
    console.log("Approve comm:", JSON.stringify(appComm));
    const planComm = await req(`mutation { planCommission(id: "${commId}") { id status } }`);
    console.log("Plan comm:", JSON.stringify(planComm));
    const stComm = await req(`mutation { startCommission(id: "${commId}") { id status } }`);
    console.log("Started commission:", JSON.stringify(stComm));

    // Step D: Replica PLAN -> START
    const planRep = await req(`mutation { planCommissionReplica(id: "${replicaId}") { id status } }`);
    console.log("Planned replica:", JSON.stringify(planRep));
    const stReplica = await req(`mutation { startCommissionReplica(id: "${replicaId}") { id status } }`);
    console.log("Started replica:", JSON.stringify(stReplica));
}

run().catch(console.error);
