/* eslint-disable no-console, no-undef, no-restricted-globals */
import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { print } from 'graphql';
import { DocumentNode } from 'graphql';
import { getSdk } from '../src/gql/sdk';

const GRAPHQL_ENDPOINT = 'http://switchback.proxy.rlwy.net:43233/graphql';

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
    const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query: print(document),
            variables,
        }),
        next: { revalidate: 0 }
    });

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