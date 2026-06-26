import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
    schema: 'http://localhost:8080/graphql',
    documents: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    generates: {
        './src/gql/': {
            preset: 'client',
            plugins: [],
            presetConfig: {
                gqlTagName: 'gql',
            }
        },
        './src/gql/sdk.ts': {
            preset: 'import-types',
            presetConfig: {
                typesPath: './graphql',
            },
            plugins: [
                'typescript-operations',
                'typescript-generic-sdk'
            ]
        }
    },
    ignoreNoDocuments: true,
};

export default config;