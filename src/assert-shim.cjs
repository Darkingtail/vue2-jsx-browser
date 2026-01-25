// Browser-compatible assert shim for @babel/helper-module-imports
// Uses CommonJS format to ensure require('assert') returns a callable function
// Works in both CJS consumption (webpack/Node.js) and ESM consumption (Vite/Rollup)

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

assert.ok = function ok(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
};

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || 'Expected ' + expected + ' but got ' + actual);
  }
};

module.exports = assert;
