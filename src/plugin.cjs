/**
 * Vue 2 JSX Babel Plugin - Fixed Version
 *
 * This is a fixed version of @vue/babel-plugin-transform-vue-jsx that handles
 * edge cases where attribute names can become empty strings after processing.
 *
 * Original bug: When processing attributes like `on:click` or `props:type`,
 * the attribute name could become an empty string after removing the prefix,
 * causing `attrName[0].toLowerCase()` to fail with "Cannot read properties of undefined".
 *
 * This version adds proper null checks and handles these edge cases.
 */
'use strict';

const syntaxJsx = require('@babel/plugin-syntax-jsx');
const helperModuleImports = require('@babel/helper-module-imports');
const kebabcase = require('lodash.kebabcase');
const htmlTags = require('html-tags');
const svgTags = require('svg-tags');

const xlinkRE = /^xlink([A-Z])/;

const rootAttributes = new Set([
  'staticClass',
  'class',
  'style',
  'key',
  'ref',
  'refInFor',
  'slot',
  'scopedSlots',
  'model',
]);

const prefixes = ['props', 'domProps', 'on', 'nativeOn', 'hook', 'attrs'];

const domPropsValueElements = ['input', 'textarea', 'option', 'select'];
const domPropsElements = new Set([...domPropsValueElements, 'video']);

const mustUseDomProps = (tag, type, attrName) =>
  ('value' === attrName && domPropsValueElements.includes(tag) && 'button' !== type) ||
  ('selected' === attrName && 'option' === tag) ||
  ('checked' === attrName && 'input' === tag) ||
  ('muted' === attrName && 'video' === tag);

const isDirective = (name) =>
  name.startsWith('v-') ||
  (name.startsWith('v') && name.length >= 2 && name[1] >= 'A' && name[1] <= 'Z');

const getTag = (t, openingElement) => {
  const nameNode = openingElement.get('name');

  if (t.isJSXIdentifier(nameNode)) {
    const name = nameNode.node.name;
    if (
      !openingElement.scope.hasBinding(name) ||
      htmlTags.includes(name) ||
      svgTags.includes(name)
    ) {
      return t.stringLiteral(name);
    }
    return t.identifier(name);
  }

  if (t.isJSXMemberExpression(nameNode)) {
    return transformJSXMemberExpression(t, nameNode);
  }

  throw new Error(`getTag: ${nameNode.type} is not supported`);
};

const getChildren = (t, children) =>
  children
    .map((child) => {
      if (child.isJSXText()) {
        return transformJSXText(t, child);
      }
      if (child.isJSXExpressionContainer()) {
        return transformJSXExpressionContainer(t, child);
      }
      if (child.isJSXSpreadChild()) {
        return transformJSXSpreadChild(t, child);
      }
      if (child.isCallExpression()) {
        return child.node;
      }
      if (child.isJSXElement()) {
        return transformJSXElement(t, child);
      }
      if (child.isJSXFragment()) {
        const fragmentChildren = getChildren(t, child.get('children')).filter((c) => c !== null);
        return t.arrayExpression(fragmentChildren);
      }
      throw new Error(`getChildren: ${child.type} is not supported`);
    })
    .filter((child) => child !== null && !t.isJSXEmptyExpression(child));

const addAttribute = (t, data, group, prop) => {
  if (data[group]) {
    let merged = false;
    if (t.isObjectProperty(prop) && (group === 'on' || group === 'nativeOn')) {
      data[group].properties.forEach((existing) => {
        if (
          t.isObjectProperty(existing) &&
          t.isStringLiteral(existing.key) &&
          t.isStringLiteral(prop.key) &&
          existing.key.value === prop.key.value
        ) {
          if (t.isArrayExpression(existing.value)) {
            existing.value.elements.push(prop.value);
          } else {
            existing.value = t.arrayExpression([existing.value, prop.value]);
          }
          merged = true;
        }
      });
    }
    if (!merged) {
      data[group].properties.push(prop);
    }
  } else {
    data[group] = t.objectExpression([prop]);
  }
};

const parseMagicDomPropsInfo = (t, attributes, tag) => {
  const tagName = t.isStringLiteral(tag) ? tag.value : '';
  const canContainDomProps = domPropsElements.has(tagName);

  let elementType = '';
  if (canContainDomProps) {
    const typeAttr = attributes.find((attr) => {
      if (!attr.isJSXAttribute()) return false;
      const name = attr.get('name');
      const value = attr.get('value');
      return t.isJSXIdentifier(name) && name.node.name === 'type' && value.isStringLiteral();
    });
    if (typeAttr) {
      const value = typeAttr.get('value');
      if (value.isStringLiteral()) {
        elementType = value.node.value;
      }
    }
  }

  return { canContainDomProps, elementType, tagName };
};

const parseAttributeJSXAttribute = (t, attr, data, tagName, elementType) => {
  const nameNode = attr.get('name');
  let attrName;
  let argument;
  let modifiers = [];
  let group;

  // Get attribute name
  if (t.isJSXNamespacedName(nameNode)) {
    attrName = `${nameNode.get('namespace').node.name}:${nameNode.get('name').node.name}`;
  } else if (t.isJSXIdentifier(nameNode)) {
    attrName = nameNode.node.name;
  } else {
    throw new Error(`Unsupported attribute name type: ${nameNode.type}`);
  }

  // Handle shorthand syntax like props={{ }} or on={{ }}
  if (prefixes.includes(attrName)) {
    const value = attr.get('value');
    if (value.isJSXExpressionContainer()) {
      const expr = value.get('expression');
      if (!expr.isJSXEmptyExpression()) {
        return t.jSXSpreadAttribute(
          t.objectExpression([t.objectProperty(t.stringLiteral(attrName), expr.node)]),
        );
      }
    }
  }

  // Split by underscore for modifiers (e.g., onClick_stop_prevent)
  const underscoreParts = attrName.split('_');
  attrName = underscoreParts[0];
  modifiers = underscoreParts.slice(1);

  // Split by colon for argument (e.g., on:click or vOn:click)
  // Handle on-click syntax (kebab-case event handlers)
  let colonIndex = attrName.indexOf(':');
  if (colonIndex === -1) {
    // Check for on-click, native-on-click syntax
    const dashIndex = attrName.indexOf('-');
    if (dashIndex !== -1) {
      const prefix = attrName.slice(0, dashIndex);
      if (prefixes.includes(prefix) || prefix === 'native') {
        colonIndex = dashIndex;
      }
    }
  }

  if (colonIndex !== -1) {
    argument = attrName.slice(colonIndex + 1);
    attrName = attrName.slice(0, colonIndex);
  }

  // Find the group (props, on, attrs, etc.)
  group = prefixes.find((p) => attrName.startsWith(p)) || 'attrs';

  // Remove the prefix from attribute name
  if (group !== 'attrs') {
    attrName = attrName.replace(new RegExp(`^${group}-?`), '');
  }

  // FIX: Handle empty attribute name after prefix removal
  // When attribute is like "on:click", after removing "on" prefix, attrName becomes empty
  // In this case, use the argument as the attribute name
  if (!attrName && argument) {
    attrName = argument;
    argument = undefined;
  }

  // FIX: If attrName is still empty, skip this attribute
  if (!attrName) {
    return undefined;
  }

  // Convert first character to lowercase (camelCase to camelCase)
  // FIX: Check if attrName has length before accessing first character
  if (attrName.length > 0) {
    attrName = attrName[0].toLowerCase() + attrName.slice(1);
  }

  // Get attribute value
  const valueNode = attr.get('value');
  let value;

  if (!valueNode.node) {
    // Boolean attribute: <button disabled />
    value = t.booleanLiteral(true);
  } else if (valueNode.isStringLiteral()) {
    value = valueNode.node;
  } else if (valueNode.isJSXExpressionContainer()) {
    // Check if should use domProps
    if (mustUseDomProps(tagName, elementType, attrName)) {
      group = 'domProps';
    }
    const expr = valueNode.get('expression');
    if (expr.isJSXEmptyExpression()) {
      return undefined;
    }
    value = expr.node;
  } else {
    throw new Error(`getAttributes (attribute value): ${valueNode.type} is not supported`);
  }

  // Store argument and modifiers on the value for directive processing
  value._argument = argument;
  value._modifiers = modifiers;

  // Handle root attributes (class, style, key, ref, etc.)
  if (rootAttributes.has(attrName)) {
    data[attrName] = value;
    return undefined;
  }

  // Handle directives (v-model, vShow, etc.)
  if (isDirective(attrName)) {
    attrName = kebabcase(attrName.slice(1)); // Remove 'v' prefix and kebab-case
    group = 'directives';
  } else {
    // Re-add modifiers to attribute name
    attrName = [attrName, ...modifiers].join('_');
  }

  // Handle xlink namespace
  if (xlinkRE.test(attrName)) {
    attrName = attrName.replace(xlinkRE, (match, letter) => 'xlink:' + letter.toLowerCase());
  }

  addAttribute(t, data, group, t.objectProperty(t.stringLiteral(attrName), value));

  return undefined;
};

const parseAttributeJSXSpreadAttribute = (t, attr, data, spreads) => {
  const argument = attr.get('argument');

  if (argument.isObjectExpression()) {
    const props = argument.get('properties');
    const allPropsHavePrefix = !props.some((prop) => {
      if (!prop.isObjectProperty()) return true;
      const key = prop.get('key');
      if (!key.isIdentifier()) return true;
      return !prefixes.includes(key.node.name);
    });

    if (allPropsHavePrefix) {
      props.forEach((prop) => {
        if (prop.isObjectProperty()) {
          const key = prop.get('key');
          if (key.isIdentifier()) {
            const groupName = key.node.name;
            const value = prop.get('value');
            addAttribute(t, data, groupName, t.spreadElement(value.node));
          }
        }
      });
      return data;
    }
  }

  // Generic spread attribute
  spreads.push(data, { argument: argument.node, type: 'vueSpread' });
  return {};
};

const transformDirectives = (t, directives) =>
  t.arrayExpression(
    directives.properties
      .filter((p) => t.isObjectProperty(p))
      .map((prop) => {
        const value = prop.value;
        const properties = [
          t.objectProperty(t.identifier('name'), prop.key),
          t.objectProperty(t.identifier('value'), value),
        ];

        if (value._argument) {
          properties.push(t.objectProperty(t.identifier('arg'), t.stringLiteral(value._argument)));
        }

        if (value._modifiers && value._modifiers.length > 0) {
          properties.push(
            t.objectProperty(
              t.identifier('modifiers'),
              t.objectExpression(
                value._modifiers.map((mod) =>
                  t.objectProperty(t.stringLiteral(mod), t.booleanLiteral(true)),
                ),
              ),
            ),
          );
        }

        return t.objectExpression(properties);
      }),
  );

const transformAttributes = (t, data) =>
  t.objectExpression(
    Object.entries(data).map(([key, value]) => {
      if (key === 'directives') {
        return t.objectProperty(t.stringLiteral(key), transformDirectives(t, value));
      }
      return t.objectProperty(t.stringLiteral(key), value);
    }),
  );

const getAttributes = (t, attributes, tag, openingElement) => {
  const spreads = [];
  let data = {};

  const { tagName, elementType } = parseMagicDomPropsInfo(t, attributes, tag);

  attributes.forEach((attr) => {
    if (attr.isJSXAttribute()) {
      const result = parseAttributeJSXAttribute(t, attr, data, tagName, elementType);
      if (result) {
        // It's a spread attribute that needs special handling
        openingElement.node.attributes.push(result);
        const attrs = openingElement.get('attributes');
        const lastAttr = attrs.at(-1);
        data = parseAttributeJSXSpreadAttribute(t, lastAttr, data, spreads);
        lastAttr.remove();
      }
    } else if (attr.isJSXSpreadAttribute()) {
      data = parseAttributeJSXSpreadAttribute(t, attr, data, spreads);
    } else {
      throw new Error(`getAttributes (attribute): ${attr.type} is not supported`);
    }
  });

  if (spreads.length > 0) {
    if (Object.keys(data).length > 0) {
      spreads.push(data);
    }
    return t.arrayExpression(
      spreads.map((item) => {
        if (item.type === 'vueSpread') {
          return item.argument;
        }
        return transformAttributes(t, item);
      }),
    );
  }

  if (Object.keys(data).length > 0) {
    return transformAttributes(t, data);
  }

  return undefined;
};

const transformJSXElement = (t, path) => {
  if (t.isJSXAttribute(path.container)) {
    throw new Error(`getAttributes (attribute value): ${path.type} is not supported`);
  }

  const openingElement = path.get('openingElement');
  const tag = getTag(t, openingElement);
  const children = getChildren(t, path.get('children'));
  const attributes = getAttributes(t, openingElement.get('attributes'), tag, openingElement);

  const args = [tag];

  if (attributes) {
    if (t.isArrayExpression(attributes)) {
      // Need to merge props
      const mergeHelper = helperModuleImports.addDefault(
        path,
        '@vue/babel-helper-vue-jsx-merge-props',
        { nameHint: '_mergeJSXProps' },
      );
      args.push(t.callExpression(mergeHelper, [attributes]));
    } else {
      args.push(attributes);
    }
  }

  if (children.length > 0) {
    args.push(t.arrayExpression(children));
  }

  return t.callExpression(t.identifier('h'), args);
};

const transformJSXMemberExpression = (t, path) => {
  const object = path.get('object');
  const property = path.get('property');

  const objectExpr = object.isJSXMemberExpression()
    ? transformJSXMemberExpression(t, object)
    : t.identifier(object.node.name);

  const propertyExpr = t.identifier(property.node.name);

  return t.memberExpression(objectExpr, propertyExpr);
};

const transformJSXText = (t, path) => {
  const node = path.node;
  const lines = node.value.split(/\r\n|\n|\r/);

  let lastNonEmptyLine = 0;
  for (const [i, line] of lines.entries()) {
    if (/[^\t ]/.test(line)) {
      lastNonEmptyLine = i;
    }
  }

  let result = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isFirstLine = i === 0;
    const isLastLine = i === lines.length - 1;
    const isLastNonEmptyLine = i === lastNonEmptyLine;

    let trimmed = line.replace(/\t/g, ' ');

    if (!isFirstLine) {
      trimmed = trimmed.replace(/^ +/, '');
    }

    if (!isLastLine) {
      trimmed = trimmed.replace(/ +$/, '');
    }

    if (trimmed) {
      if (!isLastNonEmptyLine) {
        trimmed += ' ';
      }
      result += trimmed;
    }
  }

  return result === '' ? null : t.stringLiteral(result);
};

const transformJSXExpressionContainer = (t, path) => path.get('expression').node;

const transformJSXSpreadChild = (t, path) => t.spreadElement(path.get('expression').node);

module.exports = function vue2JsxPlugin(babel) {
  const t = babel.types;

  return {
    inherits: syntaxJsx.default || syntaxJsx,
    name: 'babel-plugin-vue2-jsx-fixed',
    visitor: {
      JSXElement: {
        exit(path, state) {
          state.hasJSX = true;
          path.replaceWith(transformJSXElement(t, path));
        },
      },
      Program: {
        enter(path, state) {
          // Track if we need to inject h import
          state.hasJSX = false;
          state.hasHImport = false;

          // Check if h is already imported from vue
          path.traverse({
            ImportDeclaration(importPath) {
              if (importPath.node.source.value === 'vue') {
                importPath.node.specifiers.forEach((spec) => {
                  if (
                    t.isImportSpecifier(spec) &&
                    spec.imported &&
                    (spec.imported.name === 'h' || spec.local.name === 'h')
                  ) {
                    state.hasHImport = true;
                  }
                });
              }
            },
          });
        },
        exit(path, state) {
          // If we found JSX but no h import, inject it
          if (state.hasJSX && !state.hasHImport) {
            const hImport = t.importDeclaration(
              [t.importSpecifier(t.identifier('h'), t.identifier('h'))],
              t.stringLiteral('vue'),
            );

            // Find if there's already a vue import to add h to
            let addedToExisting = false;
            path.traverse({
              ImportDeclaration(importPath) {
                if (importPath.node.source.value === 'vue' && !addedToExisting) {
                  // Check if h is not already there
                  const hasH = importPath.node.specifiers.some(
                    (spec) =>
                      t.isImportSpecifier(spec) && spec.imported && spec.imported.name === 'h',
                  );
                  if (!hasH) {
                    importPath.node.specifiers.push(
                      t.importSpecifier(t.identifier('h'), t.identifier('h')),
                    );
                    addedToExisting = true;
                  }
                }
              },
            });

            // If no existing vue import, add new one at the top
            if (!addedToExisting) {
              path.unshiftContainer('body', hImport);
            }
          }
        },
      },
    },
  };
};
