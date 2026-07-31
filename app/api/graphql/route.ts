import { NextRequest } from 'next/server';
import { getGraphQLEndpoint } from '@/lib/graphqlEndpoint';

const DEFAULT_ACTOR = '1';
const UPSTREAM_TIMEOUT_MS = 15_000;

export async function POST(request: NextRequest) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    try {
        const body = await request.text();
        const actor = request.cookies.get('auid')?.value || request.headers.get('X-ACTOR') || DEFAULT_ACTOR;
        const response = await fetch(getGraphQLEndpoint(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-ACTOR': actor,
            },
            body,
            cache: 'no-store',
            signal: controller.signal,
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
        const timedOut = error instanceof Error && error.name === 'AbortError';

        return Response.json(
            {
                errors: [{
                    message: timedOut
                        ? 'GraphQL сервер не відповів вчасно'
                        : 'Не вдалося підключитися до GraphQL сервера',
                    extensions: {
                        code: timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
                    },
                }],
            },
            { status: timedOut ? 504 : 502 }
        );
    } finally {
        clearTimeout(timeoutId);
    }
}
