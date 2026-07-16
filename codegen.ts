import type { CodegenConfig } from '@graphql-codegen/cli';
import fs from 'fs';
import path from 'path';

function loadEnv() {
    const filenames = ['.env', '.env.local'];
    for (const filename of filenames) {
        const filePath = path.resolve(filename);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            for (const line of content.split('\n')) {
                const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
                if (match) {
                    const key = match[1].trim();
                    let val = match[2].trim();
                    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                        val = val.substring(1, val.length - 1);
                    }
                    process.env[key] = val;
                }
            }
        }
    }
}
loadEnv();

const schemaUrl = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || process.env.GRAPHQL_ENDPOINT || 'http://switchback.proxy.rlwy.net:43233/graphql';

const config: CodegenConfig = {
    generates: {
        './src/gql/': {
            schema: schemaUrl,
            documents: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}', '!src/gql/axus/**/*.{ts,tsx}'],
            preset: 'client',
            plugins: [],
            presetConfig: {
                gqlTagName: 'gql',
            }
        },
        './src/gql/sdk.ts': {
            schema: schemaUrl,
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
    allowPartialOutputs: true,
};

export default config;