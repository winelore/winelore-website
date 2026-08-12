async function query(gql, vars = {}) {
    const res = await fetch("https://winelore-dev.thewinelore.com/graphql", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-ACTOR": "1"
        },
        body: JSON.stringify({ query: gql, variables: vars })
    });
    const text = await res.text();
    try {
        return { status: res.status, json: JSON.parse(text) };
    } catch (e) {
        return { status: res.status, text: text.slice(0, 500) };
    }
}

async function run() {
    const res = await query(`
        query GetAllCommissions {
            commissions {
                items {
                    id
                    name
                    status
                    replicas {
                        id
                        name
                        status
                        members {
                            auid
                            role
                            isReady
                        }
                        replicaCandidates {
                            id
                            status
                        }
                    }
                    candidates {
                        id
                    }
                }
            }
        }
    `);

    const items = res.json?.data?.commissions?.items || [];
    for (const c of items) {
        console.log(`- [${c.status}] ${c.name} (ID: ${c.id})`);
        console.log(`  Candidates: ${c.candidates?.length || 0}`);
        for (const r of (c.replicas || [])) {
            console.log(`    Replica [${r.status}] ${r.name} (ID: ${r.id}), members: ${r.members?.length || 0}, replicaCandidates: ${r.replicaCandidates?.length || 0}`);
        }
    }
}

run().catch(console.error);
