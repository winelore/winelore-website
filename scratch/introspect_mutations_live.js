async function run() {
    const res = await fetch("https://winelore-dev.thewinelore.com/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-ACTOR": "1" },
        body: JSON.stringify({
            query: `
                query IntrospectMutations {
                    __schema {
                        mutationType {
                            fields {
                                name
                                args {
                                    name
                                    type {
                                        name
                                        kind
                                        ofType {
                                            name
                                            kind
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            `
        })
    });
    const json = await res.json();
    const fields = json.data?.__schema?.mutationType?.fields || [];
    console.log(`Found ${fields.length} mutations:`);
    for (const f of fields) {
        if (f.name.toLowerCase().includes("commission") || f.name.toLowerCase().includes("replica") || f.name.toLowerCase().includes("competition") || f.name.toLowerCase().includes("start")) {
            console.log(`- ${f.name}(${f.args.map(a => `${a.name}: ${a.type.name || a.type.ofType?.name}`).join(', ')})`);
        }
    }
}

run().catch(console.error);
