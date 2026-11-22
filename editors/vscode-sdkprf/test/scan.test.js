'use strict';

const assert = require('assert');
const { scanWordTokens } = require('../lib/scan');

const text = [
  '// comment rule_name',
  'rule: hidden.ref with (with known) => uc1 = 5',
  '/* block',
  'rule_inside_comment: p => q',
  '*/',
  'after: "string with rule" _x_ $y ug1',
  'import folder.module'
].join('\n');

const tokens = scanWordTokens(text);
const texts = tokens.map((token) => token.text);

assert(texts.includes('rule'), 'rule should be scanned');
assert(texts.includes('hidden.ref'), 'qualified names should be one token');
assert(!texts.includes('comment'), 'line comments should be skipped');
assert(!texts.includes('rule_inside_comment'), 'block comments should be skipped');
assert(!texts.includes('rule_name'), 'identifier in a line comment should be skipped');
assert(texts.includes('after'), 'text after a block comment should be scanned');
assert(!texts.includes('string'), 'string contents should be skipped');
assert(texts.includes('_x_'), 'underscore variables are word-like tokens');
assert(!texts.includes('$y'), 'dollar variables are skipped entirely');
assert(texts.includes('ug1'), 'coordinates are word-like tokens (filtered later)');
assert(texts.includes('folder.module'), 'import paths are word-like tokens');

console.log('scanner tests passed');
