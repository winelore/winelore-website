import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
    schema: 'http://switchback.proxy.rlwy.net:43233/graphql',
    documents: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    generates: {
        './src/gql/': {
            preset: 'client',
            plugins: [],
            presetConfig: {
                gqlTagName: 'gql',
            }
        }
    },
    ignoreNoDocuments: true,
};

export default config;