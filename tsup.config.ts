import { copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'tsup';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  clean: true,
  dts: false,
  entry: {
    index: 'src/index.ts',
  },
  // Shim Node.js built-ins for browser
  esbuildOptions(options) {
    options.define = {
      'process.env.NODE_ENV': '"production"',
      'process.env': '{}',
      'process': '{"env":{"NODE_ENV":"production"}}',
    };
    // Alias Node.js assert to browser-compatible CommonJS shim
    // Using .cjs ensures require('assert') returns the function directly
    // Works in both CJS (webpack) and ESM (Vite) consumption
    options.alias = {
      assert: resolve(__dirname, 'src/assert-shim.cjs'),
    };
  },
  
external: ['@babel/core'],

format: ['esm', 'cjs', 'iife'],

globalName: 'Vue2JsxBrowser',
  
// Bundle all dependencies for browser use
noExternal: [
    /@vue\/babel-sugar-functional-vue/,
    /@vue\/babel-sugar-v-model/,
    /@vue\/babel-sugar-v-on/,
    /@vue\/babel-helper-vue-jsx-merge-props/,
    /@babel\/plugin-syntax-jsx/,
    /@babel\/helper-plugin-utils/,
    /@babel\/helper-module-imports/,
    /lodash\.kebabcase/,
    /html-tags/,
    /svg-tags/,
  ],
  

onSuccess: async () => {
    // Copy handwritten .d.ts to dist
    copyFileSync('src/index.d.ts', 'dist/index.d.ts');
  },
  

platform: 'browser',
  
  

sourcemap: true,
  
  
splitting: false,
  treeshake: true,
});
