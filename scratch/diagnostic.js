async function findWineWithOrigin() {
    try {
        let cursor = null;
        let page = 1;
        let totalWines = 0;
        let countWithOrigin = 0;
        let keepGoing = true;

        console.log("Starting search for wines with origin...");

        while (keepGoing) {
            const query = `
                query FindWineWithOrigin($cursor: ID) {
                    wines(limit: 100, cursor: $cursor) {
                        items {
                            id
                            name
                            origin {
                                latitude
                                longitude
                            }
                        }
                    }
                }
            `;
            
            const response = await fetch('http://switchback.proxy.rlwy.net:43233/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    variables: { cursor }
                })
            });

            const result = await response.json();
            if (result.errors) {
                console.error("Errors:", result.errors);
                break;
            }

            const wines = result.data?.wines?.items || [];
            if (wines.length === 0) {
                console.log("No more wines returned.");
                break;
            }

            totalWines += wines.length;
            for (const wine of wines) {
                if (wine.origin) {
                    countWithOrigin++;
                    console.log(`[PAGE ${page}] Found Wine with Origin: "${wine.name}" [ID: ${wine.id}] -> lat: ${wine.origin.latitude}, lon: ${wine.origin.longitude}`);
                }
            }

            console.log(`Processed page ${page}, total wines checked so far: ${totalWines}`);
            
            // Set cursor to the last wine's ID to fetch the next page
            cursor = wines[wines.length - 1].id;
            page++;

            // Safety limit to avoid infinite loops
            if (page > 30) {
                console.log("Reached safety page limit of 30 pages.");
                break;
            }
        }

        console.log(`\nSearch complete. Total wines checked: ${totalWines}. Wines with origin: ${countWithOrigin}`);
    } catch (err) {
        console.error("Error searching wines:", err);
    }
}

findWineWithOrigin();
