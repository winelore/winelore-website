import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { print } from 'graphql';

const GRAPHQL_ENDPOINT = 'http://switchback.proxy.rlwy.net:43233/graphql';

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
        console.error('GraphQL Pipeline Error:', errors);
        throw new Error(errors[0]?.message || 'Помилка виконання GraphQL запиту');
    }

    return data;
}