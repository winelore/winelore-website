import { NextRequest } from 'next/server';

const GRAPHQL_ENDPOINT = 'http://switchback.proxy.rlwy.net:43233/graphql';
const DEFAULT_ACTOR = '1';

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const actor = request.cookies.get('auid')?.value || request.headers.get('X-ACTOR') || DEFAULT_ACTOR;
        const response = await fetch(GRAPHQL_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-ACTOR': actor,
            },
            body,
            cache: 'no-store',
        });

        const text = await response.text();

        return new Response(text, {
            status: response.status,
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'application/json',
            },
        });
    } catch (error) {
        console.error('GraphQL proxy error:', error);

        return Response.json(
            { errors: [{ message: 'Не вдалося підключитися до GraphQL сервера' }] },
            { status: 502 }
        );
    }
}
