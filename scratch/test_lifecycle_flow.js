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

    const repRes = await req(`
        query GetRep($id: ID!) {
            commissionReplica(id: $id) {
                id
                status
                commission {
                    id
                    status
                    templateEditions { id beverageType { id code } }
                    candidates { id }
                    competition {
                        id
                        status
                        series { id status }
                    }
                }
            }
        }
    `, { id: replicaId });

    console.log("Hierarchy:", JSON.stringify(repRes, null, 2));
    const rep = repRes.data?.commissionReplica;
    const comm = rep?.commission;
    const comp = comm?.competition;
    const series = comp?.series;

    console.log(`Current statuses: Series: ${series?.status}, Comp: ${comp?.status}, Comm: ${comm?.status}, Replica: ${rep?.status}`);

    // Series
    if (series && series.status !== 'APPROVED' && series.status !== 'PUBLISHED') {
        if (series.status === 'DRAFT') {
            await req(`mutation { submitCompetitionSeriesForReview(id: "${series.id}") { id status } }`);
        }
        await req(`mutation { approveCompetitionSeries(id: "${series.id}") { id status } }`);
    }

    // Competition
    if (comp && comp.status !== 'STARTED') {
        if (comp.status === 'DRAFT') {
            await req(`mutation { submitCompetitionForReview(id: "${comp.id}") { id status } }`);
            await req(`mutation { approveCompetition(id: "${comp.id}") { id status } }`);
        }
        if (comp.status === 'DRAFT' || comp.status === 'APPROVED') {
            await req(`mutation { planCompetition(id: "${comp.id}") { id status } }`);
        }
        const stComp = await req(`mutation { startCompetition(id: "${comp.id}") { id status } }`);
        console.log("Start comp result:", JSON.stringify(stComp));
    }

    // Commission
    if (comm && comm.status !== 'STARTED') {
        if (comm.status === 'DRAFT') {
            // Check template
            if (!comm.templateEditions || comm.templateEditions.length === 0) {
                console.log("Binding template...");
                await req(`mutation {
                    setCommissionTemplateEdition(
                        id: "${comm.id}",
                        beverageTypeId: "11111111-1111-4111-8111-111111111101",
                        templateEditionId: "a2b0e00d-5ee2-45e0-b6a2-683a45c7ad56"
                    ) { id }
                }`);
            }
            const subComm = await req(`mutation { submitCommissionForReview(id: "${comm.id}") { id status } }`);
            console.log("Submit comm:", JSON.stringify(subComm));
            const appComm = await req(`mutation { approveCommission(id: "${comm.id}") { id status } }`);
            console.log("Approve comm:", JSON.stringify(appComm));
        }
        if (comm.status === 'DRAFT' || comm.status === 'APPROVED') {
            const planComm = await req(`mutation { planCommission(id: "${comm.id}") { id status } }`);
            console.log("Plan comm:", JSON.stringify(planComm));
        }
        const startComm = await req(`mutation { startCommission(id: "${comm.id}") { id status } }`);
        console.log("Start comm result:", JSON.stringify(startComm));
    }

    // Replica
    if (rep && rep.status !== 'STARTED') {
        if (rep.status === 'DRAFT') {
            try {
                await req(`mutation { submitCommissionReplicaForReview(id: "${rep.id}") { id status } }`);
            } catch (_) {}
            const planRep = await req(`mutation { planCommissionReplica(id: "${rep.id}") { id status } }`);
            console.log("Plan replica:", JSON.stringify(planRep));
        }
        const startRep = await req(`mutation { startCommissionReplica(id: "${rep.id}") { id status } }`);
        console.log("Start replica result:", JSON.stringify(startRep));
    }
}

run().catch(console.error);
