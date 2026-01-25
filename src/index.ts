/**
 * Vue 2 JSX Runtime
 *
 * Browser-compatible Vue 2 JSX Babel plugins bundle for use with @babel/standalone.
 * This package provides a fixed version of Vue 2 JSX compilation that works in browsers.
 */
import type { PluginItem } from '@babel/core';
import babelSugarFunctionalVue from '@vue/babel-sugar-functional-vue';
import babelSugarVModel from '@vue/babel-sugar-v-model';
import babelSugarVOn from '@vue/babel-sugar-v-on';

import babelPluginTransformVueJsx from './plugin.cjs';

export interface Vue2JsxPresetOptions {
  functional?: boolean;
  vModel?: boolean;
  vOn?: boolean;
}

export interface Vue2JsxPreset {
  plugins: PluginItem[];
}

/**
 * Create Vue 2 JSX preset for browser use
 *
 * @param _api - Babel API (not used, kept for compatibility)
 * @param options - Preset options
 * @returns Babel preset configuration
 */
export function createVue2JsxPreset(
  _api: unknown,
  options: Vue2JsxPresetOptions = {},
): Vue2JsxPreset {
  const { functional = true, vModel = true, vOn = true } = options;

  return {
    plugins: [
      functional && babelSugarFunctionalVue,
      vModel && babelSugarVModel,
      vOn && babelSugarVOn,
      babelPluginTransformVueJsx,
    ].filter(Boolean) as PluginItem[],
  };
}

// Export individual plugins


// Default export
export default createVue2JsxPreset;

export {default as babelPluginTransformVueJsx} from './plugin.cjs';
export {default as babelSugarFunctionalVue} from '@vue/babel-sugar-functional-vue';
export {default as babelSugarVModel} from '@vue/babel-sugar-v-model';
export {default as babelSugarVOn} from '@vue/babel-sugar-v-on';