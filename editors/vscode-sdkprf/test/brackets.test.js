'use strict';

const assert = require('assert');
const { scanBrackets } = require('../lib/brackets');

const simple = scanBrackets('a [b (c {d} e) f] g');
assert.deepStrictEqual(
  simple.map((token) => [token.char, token.depth, token.matched]),
  [
    ['[', 0, true],
    ['(', 1, true],
    ['{', 2, true],
    ['}', 2, true],
    [')', 1, true],
    [']', 0, true]
  ]
);

// Comments and strings must not contribute brackets.
const ignored = scanBrackets(
  [
    '// [ ( {',
    '/* [',
    '   ( */ x = [1]',
    'y = "(" + "{"',
    'z = (2)'
  ].join('\n')
);
assert.deepStrictEqual(
  ignored.map((token) => [token.char, token.line, token.depth, token.matched]),
  [
    ['[', 2, 0, true],
    [']', 2, 0, true],
    ['(', 4, 0, true],
    [')', 4, 0, true]
  ]
);

// A mismatched closing bracket is marked unexpected and does not pop the stack.
const mismatched = scanBrackets('(] (x)');
assert.deepStrictEqual(
  mismatched.map((token) => [token.char, token.matched]),
  [
    ['(', true],
    [']', false],
    ['(', true],
    [')', true]
  ]
);

// Nested level wraps at 6 colors but depth itself keeps increasing.
const deep = scanBrackets('[[[[[[[x]]]]]]]');
assert.deepStrictEqual(
  deep.filter((token) => token.char === '[').map((token) => token.depth),
  [0, 1, 2, 3, 4, 5, 6]
);

console.log('bracket scanner tests passed');
