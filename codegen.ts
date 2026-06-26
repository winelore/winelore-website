import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
    generates: {
        './src/gql/': {
            schema: 'http://switchback.proxy.rlwy.net:43233/graphql',
            documents: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}', '!src/gql/axus/**/*.{ts,tsx}'],
            preset: 'client',
            plugins: [],
            presetConfig: {
                gqlTagName: 'gql',
            }
        },
        './src/gql/sdk.ts': {
            schema: 'http://switchback.proxy.rlwy.net:43233/graphql',
            documents: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}', '!src/gql/axus/**/*.{ts,tsx}'],
            preset: 'import-types',
            presetConfig: {
                typesPath: './graphql',
            },
            plugins: [
                'typescript-operations',
                'typescript-generic-sdk'
            ]
        },
        './src/gql/axus/sdk.ts': {
            schema: 'http://hayabusa.proxy.rlwy.net:58687/graphql',
            documents: ['src/gql/axus/operations.graphql'],
            plugins: [
                'typescript',
                'typescript-operations',
                'typescript-generic-sdk'
            ]
        }
    },
    ignoreNoDocuments: true,
};

export default config;