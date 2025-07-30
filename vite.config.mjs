import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';

// Function to copy directory recursively with exclusions
function copyDir(src, dest, excludePaths = []) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        // Get the relative path from the original source directory
        const rootSrc = src.split('assets')[0] + 'assets';
        const relativePath = path.relative(rootSrc, srcPath).replace(/\\/g, '/');
        
        // Check if this path should be excluded
        const shouldExclude = excludePaths.some(excludePath => {
            const normalizedExcludePath = excludePath.replace(/\\/g, '/');
            return relativePath.startsWith(normalizedExcludePath) || 
                   relativePath === normalizedExcludePath;
        });

        if (shouldExclude) {
            console.log(`Skipping excluded path: ${relativePath}`);
            continue;
        }

        if (entry.isDirectory()) {
            // Pass the exclude paths to recursive calls
            copyDir(srcPath, destPath, excludePaths);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/** @type {import('vite').UserConfig} */
const config = {
    plugins: [
        svelte(),
        // Custom plugin to copy required directories
        {
            name: 'copy-static-assets',
            closeBundle() {
                // Copy templates folder
                const templatesDir = resolve('templates');
                const destTemplatesDir = resolve('dist', 'templates');

                if (fs.existsSync(templatesDir)) {
                    copyDir(templatesDir, destTemplatesDir);
                    console.log('Templates directory copied to dist/templates');
                }

                // Copy lang folder
                const langDir = resolve('lang');
                const destLangDir = resolve('dist', 'lang');

                if (fs.existsSync(langDir)) {
                    copyDir(langDir, destLangDir);
                    console.log('Language directory copied to dist/lang');
                }

                // Copy styles folder
                const stylesDir = resolve('styles');
                const destStylesDir = resolve('dist', 'styles');

                if (fs.existsSync(stylesDir)) {
                    copyDir(stylesDir, destStylesDir);
                    console.log('Styles directory copied to dist/styles');
                }

                // Copy assets folder (excluding documentation images)
                const assetsDir = resolve('assets');
                const destAssetsDir = resolve('dist', 'assets');

                if (fs.existsSync(assetsDir)) {
                    copyDir(assetsDir, destAssetsDir, ['images/documentation']);
                    console.log('Assets directory copied to dist/assets (excluding documentation)');
                } else {
                    console.warn('⚠ Warning: assets directory not found');
                }

                // Copy module.json
                fs.copyFileSync(resolve('module.json'), resolve('dist', 'module.json'));
                console.log('module.json copied to dist/');
            }
        }
    ],
    build: {
        lib: {
            entry: resolve('src', 'index.ts'),
            name: 'ShadowsAndSecrets',
            formats: ['iife'],
            fileName: () => 'module.js',
        },
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            external: ['pixi.js'],
            output: {
                globals: {
                    'pixi.js': 'PIXI'
                },
                assetFileNames: (assetInfo) => {
                    const name = assetInfo?.fileName || '';
                    if (name.endsWith('.css')) {
                        return 'modules.css';
                    }
                    return '[name][extname]';
                },
            },
        },
    },
    // Configure asset handling for WebP and other image formats
    assetsInclude: ['**/*.webp', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg'],
    publicDir: 'public'
};

export default config;
