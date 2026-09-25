/* eslint-disable no-console, no-undef, no-restricted-globals */
import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { print } from 'graphql';
import { DocumentNode } from 'graphql';
import { getSdk } from '@winelore/core/gql/sdk';
import { getGraphQLEndpoint } from './graphqlEndpoint';
import { fetchWithProducerCompatibility } from './graphqlTransport';

const GRAPHQL_ENDPOINT = getGraphQLEndpoint();
const CLIENT_GRAPHQL_ENDPOINT = '/api/graphql';
// Fallback for genuinely public server fetches. Authenticated server code
// should resolve the real auid from cookies (see resolveServerActor below)
// instead of relying on this.
const DEFAULT_ACTOR = '1';

async function resolveServerActor(): Promise<string | null> {
    try {
        const { cookies } = await import('next/headers');
        return (await cookies()).get('auid')?.value ?? null;
    } catch {
        return null;
    }
}

function isNotFoundError(err: any): boolean {
    const code = err.extensions?.code;
    const groupCode = err.extensions?.groupCode;
    const classification = err.extensions?.classification;
    if (code === 'REPLICA_MEMBER_NOT_FOUND') return false;
    return (
        code === 'EVALUATION_NOT_FOUND' ||
        code === 'COMMISSION_NOT_FOUND' ||
        groupCode === 'NOT_FOUND' ||
        classification === 'NOT_FOUND' ||
        (typeof code === 'string' && code.endsWith('_NOT_FOUND'))
    );
}



function logFilteredErrors(context: string, errors: any[], data: unknown) {
    const ignoredNotFound = errors.filter((err: any) => isNotFoundError(err));
    const filteredErrors = errors.filter((err: any) => !isNotFoundError(err));
    if (ignoredNotFound.length > 0) {
        console.warn(`GraphQL NOT_FOUND suppressed (${context}):`, ignoredNotFound.map((e: any) => e.message || e.extensions?.code));
    }
    if (filteredErrors.length > 0) {
        logGraphQLPipelineError(context, filteredErrors, !data);
        if (!data) {
            throw new Error(filteredErrors[0]?.message || 'Помилка виконання GraphQL запиту');
        }
    }
}

function logGraphQLPipelineError(context: string, errors: any[], isFatal: boolean) {
    if (!errors || errors.length === 0) return;

    const summary: Record<string, { count: number; paths: string[][]; sample: any }> = {};
    for (const err of errors) {
        const key = `${err.message || 'Unknown error'}-${err.extensions?.code || err.extensions?.classification || ''}`;
        if (!summary[key]) {
            summary[key] = { count: 0, paths: [], sample: err };
        }
        summary[key].count++;
        if (err.path && summary[key].paths.length < 3) {
            summary[key].paths.push(err.path);
        }
    }

    const logFn = isFatal ? console.error : console.warn;

    logFn(`GraphQL Pipeline Error (${context}):`);
    for (const info of Object.values(summary)) {
        const { count, paths, sample } = info;
        if (count === 1) {
            logFn(`  - ${sample.message} (Path: ${sample.path?.join('.') || 'root'})`);
        } else {
            const pathsStr = paths.map(p => p.join('.')).join(', ');
            logFn(`  - ${sample.message} (Occurred ${count} times, paths: [${pathsStr}${count > 3 ? ', ...' : ''}])`);
        }
    }
}

async function parseJsonResponse(response: Response, context: string): Promise<any> {
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch {
        const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        console.error(`[${context}] Received non-JSON response (HTTP ${response.status}):`, text.slice(0, 500));
        throw new Error(
            response.status >= 500
                ? `GraphQL server error (${response.status}): Сервер тимчасово недоступний`
                : `GraphQL response error (${response.status}): ${cleanText.slice(0, 150) || 'Некоректна відповідь сервера'}`
        );
    }
}

export async function fetchGraphQLRaw<TResult, TVariables>(
    query: string,
    variables?: TVariables,
    headers?: Record<string, string>
): Promise<TResult> {
    const cleanHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (headers) {
        let actor: string | undefined;
        for (const [k, v] of Object.entries(headers)) {
            const lowerKey = k.toLowerCase();
            if (lowerKey === 'x-actor' || lowerKey === 'actor') {
                actor = v;
            } else {
                cleanHeaders[k] = v;
            }
        }
        if (actor !== undefined) {
            cleanHeaders['X-ACTOR'] = actor;
        }
    }

    const response = await fetchWithProducerCompatibility(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: cleanHeaders,
        body: JSON.stringify({ query, variables }),
        cache: 'no-store'
    });

    const { data, errors } = await parseJsonResponse(response, 'fetchGraphQLRaw');

    if (errors) {
        logFilteredErrors('fetchGraphQLRaw', errors, data);
    }

    return data;
}

/**
 * Send a mutation. Unlike a query, any GraphQL error fails it, with the
 * backend's message: a mutation that comes back with errors beside its data
 * did not do what was asked. The app's client makes the same distinction.
 */
export async function mutateGraphQLRaw<TResult>(
    query: string,
    variables?: Record<string, unknown>,
    headers?: Record<string, string>
): Promise<TResult> {
    const cleanHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    for (const [key, value] of Object.entries(headers || {})) {
        const lower = key.toLowerCase();
        cleanHeaders[lower === 'x-actor' || lower === 'actor' ? 'X-ACTOR' : key] = value;
    }

    const response = await fetchWithProducerCompatibility(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: cleanHeaders,
        body: JSON.stringify({ query, variables }),
        cache: 'no-store'
    });

    const { data, errors } = await parseJsonResponse(response, 'mutateGraphQLRaw');
    if (errors?.length) {
        logGraphQLPipelineError('mutateGraphQLRaw', errors, true);
        throw new Error(errors[0]?.message || 'GraphQL mutation failed');
    }
    return data;
}

export async function fetchGraphQL<TResult, TVariables>(
    document: TypedDocumentNode<TResult, TVariables>,
    variables?: TVariables,
    options?: { headers?: Record<string, string> }
): Promise<TResult> {
    const isServer = typeof window === 'undefined';
    const endpoint = isServer ? GRAPHQL_ENDPOINT : CLIENT_GRAPHQL_ENDPOINT;
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options?.headers ?? {}) };
    let response: Response;

    if (isServer && !headers['X-ACTOR']) {
        // Authenticated server components must act as the signed-in user, not
        // as the anonymous fallback. Public pages without a cookie still use
        // DEFAULT_ACTOR.
        const serverActor = await resolveServerActor();
        headers['X-ACTOR'] = serverActor ?? DEFAULT_ACTOR;
    }

    try {
        response = await fetchWithProducerCompatibility(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                query: print(document),
                variables,
            }),
            cache: 'no-store'
        });
    } catch (error) {
        console.error('GraphQL Network Error (fetchGraphQL):', error);
        throw new Error('Не вдалося підключитися до GraphQL сервера');
    }

    const { data, errors } = await parseJsonResponse(response, 'fetchGraphQL');

    if (errors) {
        logFilteredErrors('fetchGraphQL', errors, data);
    }

    return data;
}

export interface RequesterOptions {
    headers?: Record<string, string>;
}

const requester = async <R, V>(
    doc: DocumentNode,
    vars?: V,
    options?: RequesterOptions
): Promise<R> => {
    let actor: string | undefined;
    const cleanHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (options?.headers) {
        for (const [k, v] of Object.entries(options.headers)) {
            const lowerKey = k.toLowerCase();
            if (lowerKey === 'x-actor' || lowerKey === 'actor') {
                actor = v;
            } else {
                cleanHeaders[k] = v;
            }
        }
    }

    if (!actor && typeof window === 'undefined') {
        actor = (await resolveServerActor()) ?? DEFAULT_ACTOR;
    }

    cleanHeaders['X-ACTOR'] = actor ?? DEFAULT_ACTOR;

    const response = await fetchWithProducerCompatibility(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: cleanHeaders,
        body: JSON.stringify({
            query: print(doc),
            variables: vars,
        }),
        cache: 'no-store'
    });

    const { data, errors } = await parseJsonResponse(response, 'SDK requester');

    if (errors) {
        logFilteredErrors('SDK requester', errors, data);
    }

    return data;
};

export const sdk = getSdk<RequesterOptions>(requester);
