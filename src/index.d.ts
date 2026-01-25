import type { PluginItem } from '@babel/core';

export interface Vue2JsxPresetOptions {
  functional?: boolean;
  vModel?: boolean;
  vOn?: boolean;
}

export interface Vue2JsxPreset {
  plugins: PluginItem[];
}

export declare function createVue2JsxPreset(
  _api: unknown,
  options?: Vue2JsxPresetOptions,
): Vue2JsxPreset;

export declare const babelPluginTransformVueJsx: PluginItem;
export declare const babelSugarFunctionalVue: PluginItem;
export declare const babelSugarVModel: PluginItem;
export declare const babelSugarVOn: PluginItem;

export default createVue2JsxPreset;
