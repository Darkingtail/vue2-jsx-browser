# vue2-jsx-browser

浏览器端 Vue 2 JSX Babel 插件集合，用于配合 `@babel/standalone` 在浏览器中编译 Vue 2 JSX 代码。

## 作用与目的

官方的 `@vue/babel-preset-jsx` 依赖 Node.js 环境，无法在浏览器中使用。本包将 Vue 2 JSX 相关的 Babel 插件打包成浏览器兼容版本，支持：

- JSX 语法转换为 Vue 2 渲染函数
- `v-model` 语法糖
- `v-on` 事件简写
- 函数式组件语法糖

同时修复了官方插件的一些 bug（如 `on:click` 事件处理问题）。

## 包结构

```
vue2-jsx-browser/
├── src/
│   ├── index.ts        # 入口，导出 preset 和所有插件
│   ├── plugin.ts       # 核心 JSX 转换插件（修复版）
│   ├── types.d.ts      # 外部依赖类型声明
│   └── index.d.ts      # 包类型声明
├── dist/               # 构建产物
├── package.json
└── tsup.config.ts      # 构建配置
```

## 文件说明

| 文件 | 作用 |
|------|------|
| `index.ts` | 包入口，导出 `createVue2JsxPreset` 工厂函数和各个独立插件 |
| `plugin.ts` | Vue 2 JSX 核心转换插件，基于 `@vue/babel-plugin-transform-vue-jsx` 修复版 |
| `types.d.ts` | 为 `@vue/babel-sugar-*` 等无类型声明的依赖提供类型定义 |

## 使用场景

- **在线 IDE / Playground**：需要在浏览器中实时编译 Vue 2 JSX 代码
- **低代码平台**：运行时编译用户编写的 JSX 组件
- **教学演示**：无需后端服务即可展示 JSX 编译过程

## 使用方法

### 1. 创建 Preset

```javascript
import { createVue2JsxPreset } from 'vue2-jsx-browser'

// 创建 preset（参数为 Babel 实例，浏览器中传 null）
const jsxPreset = createVue2JsxPreset(null)
```

### 2. 配合 @babel/standalone 使用

```javascript
// 先通过 CDN 加载 @babel/standalone
const result = Babel.transform(jsxCode, {
  presets: [
    ['typescript', { isTSX: true, allExtensions: true }],
    jsxPreset,
  ],
})
```

### 3. 单独使用插件

```javascript
import {
  babelPluginTransformVueJsx,
  babelSugarVModel,
  babelSugarVOn,
  babelSugarFunctionalVue,
} from 'vue2-jsx-browser'

// 自定义插件组合
const result = Babel.transform(code, {
  plugins: [babelPluginTransformVueJsx, babelSugarVModel],
})
```

## 配置选项

```typescript
interface Vue2JsxPresetOptions {
  functional?: boolean  // 启用函数式组件语法糖，默认 true
  vModel?: boolean      // 启用 v-model 语法糖，默认 true
  vOn?: boolean         // 启用 v-on 语法糖，默认 true
}

const preset = createVue2JsxPreset(null, {
  functional: true,
  vModel: true,
  vOn: true,
})
```

## 依赖关系

本包是独立的，不依赖其他 `vue2-sfc-*` 包，可单独使用。
