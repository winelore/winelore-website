/* eslint-disable no-console, no-undef, no-restricted-globals */
import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { print } from 'graphql';
import { DocumentNode } from 'graphql';
import { getSdk } from '../src/gql/sdk';

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:8080/graphql';
const CLIENT_GRAPHQL_ENDPOINT = '/api/graphql';
const DEFAULT_ACTOR = '1';

export async function fetchGraphQLRaw<TResult, TVariables>(
    query: string,
    variables?: TVariables
): Promise<TResult> {
    const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
        next: { revalidate: 0 }
    });

    const { data, errors } = await response.json();

    if (errors) {
        // eslint-disable-next-line no-console
        console.error('GraphQL Pipeline Error (fetchGraphQLRaw):', JSON.stringify(errors, null, 2));
        throw new Error(errors[0]?.message || 'Помилка виконання GraphQL запиту');
    }

    return data;
}

export async function fetchGraphQL<TResult, TVariables>(
    document: TypedDocumentNode<TResult, TVariables>,
    variables?: TVariables
): Promise<TResult> {
    const isServer = typeof window === 'undefined';
    const endpoint = isServer ? GRAPHQL_ENDPOINT : CLIENT_GRAPHQL_ENDPOINT;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let response: Response;

    if (isServer) {
        headers['X-ACTOR'] = DEFAULT_ACTOR;
    }

    try {
        response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                query: print(document),
                variables,
            }),
            next: { revalidate: 0 }
        });
    } catch (error) {
        console.error('GraphQL Network Error (fetchGraphQL):', error);
        throw new Error('Не вдалося підключитися до GraphQL сервера');
    }

    const { data, errors } = await response.json();

    if (errors) {
        // eslint-disable-next-line no-console
        console.error('GraphQL Pipeline Error (fetchGraphQL):', JSON.stringify(errors, null, 2));
        throw new Error(errors[0]?.message || 'Помилка виконання GraphQL запиту');
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
    const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-ACTOR': DEFAULT_ACTOR,
            ...options?.headers
        },
        body: JSON.stringify({
            query: print(doc),
            variables: vars,
        }),
        next: { revalidate: 0 }
    });

    const { data, errors } = await response.json();

    if (errors) {
        // eslint-disable-next-line no-console
        console.error('GraphQL Pipeline Error (SDK requester):', JSON.stringify(errors, null, 2));
        throw new Error(errors[0]?.message || 'Помилка виконання GraphQL запиту');
    }

    return data;
};

export const sdk = getSdk<RequesterOptions>(requester);
