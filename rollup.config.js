import json from '@rollup/plugin-json';
import path from 'path';
import esbuild from 'rollup-plugin-esbuild';
import sourcemaps from 'rollup-plugin-sourcemaps';
import { typescriptPaths } from 'rollup-plugin-typescript-paths';
import colorfulLogs from './scripts/rollup-colorfulLogs.js';

// Function to automatically mark all non-local imports as external
// avoids warning message about external dependencies
const isExternal = (id, ...overArgs) => {
    const _isExternal = !id.startsWith('.') && !path.isAbsolute(id);
    return _isExternal;
};

const config = [
    // Main library entry point
    {
        input: 'src/index.ts',
        output: {
            file: 'dist/index.js',
            format: 'es',
            sourcemap: true,
        },
        external: isExternal,
        plugins: [
            colorfulLogs('Smyth Builder'),
            json(),
            esbuild({
                sourceMap: true,
                minify: false,
                target: 'es2020',
                sourcesContent: true,
            }),
            sourcemaps(),
        ],
    },
    // CLI entry point
    {
        input: 'src/cli.ts',
        output: {
            file: 'dist/cli.js',
            format: 'es',
            sourcemap: true,
            banner: '#!/usr/bin/env node',
        },
        external: isExternal,
        plugins: [
            json(),
            esbuild({
                sourceMap: true,
                minify: false,
                target: 'es2020',
                sourcesContent: true,
            }),
            sourcemaps(),
        ],
    },
];

export default config;
