import { print } from 'graphql';
import { DocumentNode } from 'graphql';
import { getSdk } from '../src/gql/axus/sdk';

const AXUS_GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_AXUS_GRAPHQL_ENDPOINT || 'http://switchback.proxy.rlwy.net:43233/graphql';

export interface AxusRequesterOptions {
    headers?: Record<string, string>;
}

const requester = async <R, V>(
    doc: DocumentNode,
    vars?: V,
    options?: AxusRequesterOptions
): Promise<R> => {
    const response = await fetch(AXUS_GRAPHQL_ENDPOINT, {
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
        console.error('AXUS GraphQL Pipeline Error (SDK requester):', JSON.stringify(errors, null, 2));
        throw new Error(errors[0]?.message || 'AXUS ID GraphQL Query Error');
    }

    return data;
};

export const axusSdk = getSdk<AxusRequesterOptions>(requester);

export function getAxusSdkWithToken(token: string) {
    const headers = { Authorization: `Bearer ${token}` };
    const wrappedRequester = async <R, V>(
        doc: DocumentNode,
        vars?: V,
        options?: AxusRequesterOptions
    ): Promise<R> => {
        return requester(doc, vars, {
            ...options,
            headers: {
                ...headers,
                ...options?.headers
            }
        });
    };
    return getSdk<AxusRequesterOptions>(wrappedRequester);
}
