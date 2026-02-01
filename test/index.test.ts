import { describe, it, expect } from 'vitest';
import * as babel from '@babel/core';
import {
  createVue2JsxPreset,
  babelPluginTransformVueJsx,
  babelSugarFunctionalVue,
  babelSugarVModel,
  babelSugarVOn,
} from '../src/index';

describe('createVue2JsxPreset', () => {
  it('should return a preset with all plugins by default', () => {
    const preset = createVue2JsxPreset(null);

    expect(preset).toHaveProperty('plugins');
    expect(preset.plugins).toHaveLength(4);
  });

  it('should disable functional plugin when functional=false', () => {
    const preset = createVue2JsxPreset(null, { functional: false });

    expect(preset.plugins).toHaveLength(3);
    expect(preset.plugins).not.toContain(babelSugarFunctionalVue);
  });

  it('should disable vModel plugin when vModel=false', () => {
    const preset = createVue2JsxPreset(null, { vModel: false });

    expect(preset.plugins).toHaveLength(3);
    expect(preset.plugins).not.toContain(babelSugarVModel);
  });

  it('should disable vOn plugin when vOn=false', () => {
    const preset = createVue2JsxPreset(null, { vOn: false });

    expect(preset.plugins).toHaveLength(3);
    expect(preset.plugins).not.toContain(babelSugarVOn);
  });

  it('should disable all optional plugins', () => {
    const preset = createVue2JsxPreset(null, {
      functional: false,
      vModel: false,
      vOn: false,
    });

    expect(preset.plugins).toHaveLength(1);
    // Only the core JSX transform plugin remains
    expect(preset.plugins[0]).toBe(babelPluginTransformVueJsx);
  });
});

describe('exports', () => {
  it('should export babelPluginTransformVueJsx', () => {
    expect(babelPluginTransformVueJsx).toBeDefined();
    expect(typeof babelPluginTransformVueJsx).toBe('function');
  });

  it('should export babelSugarFunctionalVue', () => {
    expect(babelSugarFunctionalVue).toBeDefined();
  });

  it('should export babelSugarVModel', () => {
    expect(babelSugarVModel).toBeDefined();
  });

  it('should export babelSugarVOn', () => {
    expect(babelSugarVOn).toBeDefined();
  });
});

describe('JSX transformation', () => {
  const transform = (code: string) => {
    const result = babel.transformSync(code, {
      presets: [[createVue2JsxPreset, {}]],
      plugins: ['@babel/plugin-syntax-jsx'],
    });
    return result?.code;
  };

  it('should transform basic JSX element', () => {
    const code = `const el = <div>Hello</div>`;
    const result = transform(code);

    expect(result).toContain('h("div"');
    expect(result).toContain('"Hello"');
  });

  it('should transform JSX with props', () => {
    const code = `const el = <div id="app" class="container">Content</div>`;
    const result = transform(code);

    expect(result).toContain('h("div"');
    expect(result).toContain('"id"');
    expect(result).toContain('"app"');
  });

  it('should transform JSX with dynamic expression', () => {
    const code = `const el = <div>{message}</div>`;
    const result = transform(code);

    expect(result).toContain('h("div"');
    expect(result).toContain('message');
  });

  it('should transform nested JSX elements', () => {
    const code = `const el = <div><span>Nested</span></div>`;
    const result = transform(code);

    expect(result).toContain('h("div"');
    expect(result).toContain('h("span"');
  });

  it('should transform JSX with event handler', () => {
    const code = `const el = <button onClick={handleClick}>Click</button>`;
    const result = transform(code);

    expect(result).toContain('h("button"');
    expect(result).toContain('"on"');
    expect(result).toContain('"click"');
    expect(result).toContain('handleClick');
  });

  it('should transform self-closing JSX element', () => {
    const code = `const el = <input type="text" />`;
    const result = transform(code);

    expect(result).toContain('h("input"');
    expect(result).toContain('"type"');
    expect(result).toContain('"text"');
  });

  it('should transform JSX with spread attributes', () => {
    const code = `const el = <div {...props}>Content</div>`;
    const result = transform(code);

    expect(result).toContain('h("div"');
    expect(result).toContain('props');
  });

  it('should transform JSX component (with binding)', () => {
    // Component must be in scope to be treated as identifier instead of string
    const code = `const MyComponent = {}; const el = <MyComponent prop="value" />`;
    const result = transform(code);

    expect(result).toContain('h(MyComponent');
  });

  it('should transform unknown tag as string literal', () => {
    // Without binding, PascalCase tags are treated as string literals
    const code = `const el = <UnknownTag prop="value" />`;
    const result = transform(code);

    expect(result).toContain('h("UnknownTag"');
  });

  it('should handle class attribute', () => {
    const code = `const el = <div class="foo bar">Content</div>`;
    const result = transform(code);

    expect(result).toContain('"class"');
    expect(result).toContain('"foo bar"');
  });

  it('should handle style attribute', () => {
    const code = `const el = <div style={{ color: 'red' }}>Content</div>`;
    const result = transform(code);

    expect(result).toContain('"style"');
    expect(result).toContain('color');
  });

  it('should handle key attribute', () => {
    const code = `const el = <div key="unique">Content</div>`;
    const result = transform(code);

    expect(result).toContain('"key"');
    expect(result).toContain('"unique"');
  });

  it('should handle ref attribute', () => {
    const code = `const el = <div ref="myRef">Content</div>`;
    const result = transform(code);

    expect(result).toContain('"ref"');
    expect(result).toContain('"myRef"');
  });

  it('should inject h import from vue', () => {
    const code = `export default { render() { return <div>Test</div> } }`;
    const result = transform(code);

    expect(result).toContain('import { h } from "vue"');
  });

  it('should not duplicate h import if already exists', () => {
    const code = `import { h } from 'vue'; const el = <div>Test</div>`;
    const result = transform(code);

    // Should only have one h import
    const hImportCount = (result?.match(/import.*h.*from.*vue/g) || []).length;
    expect(hImportCount).toBe(1);
  });
});

describe('edge cases', () => {
  const transform = (code: string) => {
    const result = babel.transformSync(code, {
      presets: [[createVue2JsxPreset, {}]],
      plugins: ['@babel/plugin-syntax-jsx'],
    });
    return result?.code;
  };

  it('should handle on:click syntax (colon-prefixed event)', () => {
    const code = `const el = <button on:click={handler}>Click</button>`;
    const result = transform(code);

    expect(result).toContain('h("button"');
    expect(result).toContain('"on"');
    expect(result).toContain('"click"');
  });

  it('should handle boolean attribute', () => {
    const code = `const el = <input disabled />`;
    const result = transform(code);

    expect(result).toContain('h("input"');
    expect(result).toContain('true');
  });

  it('should handle JSX fragment', () => {
    const code = `const el = <><div>A</div><div>B</div></>`;
    const result = transform(code);

    expect(result).toContain('h("div"');
    expect(result).toContain('"A"');
    expect(result).toContain('"B"');
  });

  it('should handle member expression component', () => {
    const code = `const el = <Components.Button>Click</Components.Button>`;
    const result = transform(code);

    expect(result).toContain('h(Components.Button');
  });

  it('should handle domProps for input value', () => {
    const code = `const el = <input value={inputValue} />`;
    const result = transform(code);

    expect(result).toContain('h("input"');
    expect(result).toContain('"domProps"');
    expect(result).toContain('"value"');
  });

  it('should handle textarea value with domProps', () => {
    const code = `const el = <textarea value={text} />`;
    const result = transform(code);

    expect(result).toContain('"domProps"');
  });

  it('should handle multiple children', () => {
    const code = `const el = <div><span>A</span><span>B</span><span>C</span></div>`;
    const result = transform(code);

    expect(result).toContain('h("div"');
    expect(result?.match(/h\("span"/g)?.length).toBe(3);
  });

  it('should handle mixed text and expression children', () => {
    const code = `const el = <div>Hello {name}!</div>`;
    const result = transform(code);

    expect(result).toContain('"Hello "');
    expect(result).toContain('name');
    expect(result).toContain('"!"');
  });
});
