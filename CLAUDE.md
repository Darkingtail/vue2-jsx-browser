# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**vue2-jsx-browser** is a browser-compatible Vue 2 JSX Babel plugin collection designed for client-side compilation with `@babel/standalone`. The official `@vue/babel-preset-jsx` requires Node.js and cannot run in browsers—this package solves that gap for online IDEs, playgrounds, and low-code platforms.

## Commands

Package manager: **pnpm** (v10.0.0+)

```bash
pnpm build       # Bundle for production (ESM, CJS, IIFE formats)
pnpm dev         # Watch mode development build
pnpm typecheck   # TypeScript type checking
```

## Architecture

### Build Output (tsup)

The package builds to three formats:
- `dist/index.mjs` - ES Module
- `dist/index.js` - CommonJS
- `dist/index.global.js` - IIFE (global variable: `Vue2JsxBrowser`)

All dependencies are bundled except `@babel/core` (peer dependency). Node.js `assert` module is shimmed with `src/assert-shim.cjs` for browser compatibility.

### Source Structure

```
src/
├── index.ts          # Main entry - exports preset factory and individual plugins
├── plugin.cjs        # Core JSX transform (patched @vue/babel-plugin-transform-vue-jsx)
├── plugin.ts         # TypeScript re-export
├── assert-shim.cjs   # Browser-compatible assert module
├── types.d.ts        # Type declarations for untyped dependencies
└── index.d.ts        # Public API type declarations
```

### Exported API

```typescript
// Factory function - creates preset with all plugins
createVue2JsxPreset(api, options?: Vue2JsxPresetOptions): Vue2JsxPreset

// Individual plugins for selective use
babelPluginTransformVueJsx  // Core JSX → Vue 2 render function
babelSugarFunctionalVue     // Functional component sugar
babelSugarVModel            // v-model directive sugar
babelSugarVOn               // v-on event shorthand
```

### Key Implementation Detail

`plugin.cjs` is a patched version of the official Vue plugin that fixes edge cases where attribute names become empty strings after prefix removal (e.g., `on:click`, `props:type` handling).

## Commit Convention

Uses Conventional Commits (enforced via commitlint):
- `feat:` → Minor version bump
- `fix:` → Patch version bump
- `feat!:` or `BREAKING CHANGE:` → Major version bump

Release is manual via GitHub Actions workflow dispatch using semantic-release.
