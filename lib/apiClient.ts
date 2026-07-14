/* eslint-disable no-console, no-undef, no-restricted-globals */
import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { print } from 'graphql';
import { DocumentNode } from 'graphql';
import { getSdk } from '../src/gql/sdk';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://switchback.proxy.rlwy.net:43233/graphql';

function isNotFoundError(err: any): boolean {
    const code = err.extensions?.code;
    const groupCode = err.extensions?.groupCode;
    const classification = err.extensions?.classification;
    return (
        code === 'EVALUATION_NOT_FOUND' ||
        code === 'COMMISSION_NOT_FOUND' ||
        groupCode === 'NOT_FOUND' ||
        classification === 'NOT_FOUND' ||
        (typeof code === 'string' && code.endsWith('_NOT_FOUND'))
    );
}

function isIgnorableError(err: any): boolean {
    if (isNotFoundError(err)) return true;
    if (err.message && err.message.includes('Replica is not started.')) return true;
    return false;
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
        const filteredErrors = errors.filter((err: any) => !isNotFoundError(err));
        if (filteredErrors.length > 0) {
            logGraphQLPipelineError('fetchGraphQLRaw', filteredErrors, !data);
            if (!data) {
                throw new Error(filteredErrors[0]?.message || 'Помилка виконання GraphQL запиту');
            }
        }
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
        const filteredErrors = errors.filter((err: any) => !isNotFoundError(err));
        if (filteredErrors.length > 0) {
            logGraphQLPipelineError('fetchGraphQL', filteredErrors, !data);
            if (!data) {
                throw new Error(filteredErrors[0]?.message || 'Помилка виконання GraphQL запиту');
            }
        }
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
        const filteredErrors = errors.filter((err: any) => !isIgnorableError(err));
        if (filteredErrors.length > 0) {
            logGraphQLPipelineError('SDK requester', filteredErrors, !data);
            if (!data) {
                throw new Error(filteredErrors[0]?.message || 'Помилка виконання GraphQL запиту');
            }
        }
    }

    return data;
};

export const sdk = getSdk<RequesterOptions>(requester);