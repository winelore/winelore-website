const GRAPHQL_ENDPOINT = 'http://switchback.proxy.rlwy.net:43233/graphql';

export async function fetchGraphQL(query: string, variables: Record<string, any> = {}) {
    try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Якщо згодом з'явиться авторизація, додайте токен сюди:
                // 'Authorization': `Bearer ${your_token}`
            },
            body: JSON.stringify({
                query,
                variables,
            }),
            // Next.js кешування (опціонально, за потреби розкоментуйте):
            // cache: 'no-store' // Щоб завжди отримувати найсвіжіші дані
        });

        const json = await response.json();
        console.log("GraphQL Response:", JSON.stringify(json, null, 2));


        if (json.errors) {
            console.error('GraphQL Errors:', json.errors);
            throw new Error('Failed to fetch GraphQL API');
        }

        return json.data;
    } catch (error) {
        console.error('Network or Parse Error in fetchGraphQL:', error);
        throw error;
    }
}