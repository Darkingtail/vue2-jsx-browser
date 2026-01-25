# vue2-jsx-browser

[中文文档](./README.zh-CN.md)

Vue 2 JSX Babel plugin collection for browser-side compilation with `@babel/standalone`.

## Purpose

The official `@vue/babel-preset-jsx` requires Node.js and cannot be used in browsers. This package bundles Vue 2 JSX related Babel plugins into a browser-compatible version, supporting:

- JSX syntax transformation to Vue 2 render functions
- `v-model` directive sugar
- `v-on` event shorthand
- Functional component sugar

It also fixes some bugs in the official plugins (e.g., `on:click` event handling issues).

## Package Structure

```
vue2-jsx-browser/
├── src/
│   ├── index.ts        # Entry, exports preset and all plugins
│   ├── plugin.ts       # Core JSX transform plugin (patched)
│   ├── types.d.ts      # External dependency type declarations
│   └── index.d.ts      # Package type declarations
├── dist/               # Build output
├── package.json
└── tsup.config.ts      # Build configuration
```

## File Description

| File         | Description                                                                    |
| ------------ | ------------------------------------------------------------------------------ |
| `index.ts`   | Package entry, exports `createVue2JsxPreset` factory and individual plugins    |
| `plugin.ts`  | Vue 2 JSX core transform plugin, patched from `@vue/babel-plugin-transform-vue-jsx` |
| `types.d.ts` | Type definitions for `@vue/babel-sugar-*` and other untyped dependencies      |

## Use Cases

- **Online IDE / Playground**: Real-time Vue 2 JSX compilation in browser
- **Low-code Platforms**: Runtime compilation of user-written JSX components
- **Educational Demos**: Demonstrate JSX compilation without backend services

## Usage

### 1. Create Preset

```javascript
import { createVue2JsxPreset } from "vue2-jsx-browser";

// Create preset (pass null for Babel instance in browser)
const jsxPreset = createVue2JsxPreset(null);
```

### 2. Use with @babel/standalone

```javascript
// Load @babel/standalone via CDN first
const result = Babel.transform(jsxCode, {
  presets: [["typescript", { isTSX: true, allExtensions: true }], jsxPreset],
});
```

### 3. Use Individual Plugins

```javascript
import {
  babelPluginTransformVueJsx,
  babelSugarVModel,
  babelSugarVOn,
  babelSugarFunctionalVue,
} from "vue2-jsx-browser";

// Custom plugin combination
const result = Babel.transform(code, {
  plugins: [babelPluginTransformVueJsx, babelSugarVModel],
});
```

## Configuration Options

```typescript
interface Vue2JsxPresetOptions {
  functional?: boolean; // Enable functional component sugar, default true
  vModel?: boolean;     // Enable v-model sugar, default true
  vOn?: boolean;        // Enable v-on sugar, default true
}

const preset = createVue2JsxPreset(null, {
  functional: true,
  vModel: true,
  vOn: true,
});
```

## License

MIT
