'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { parseText, stripComments } = require('../lib/parser');

const text = fs.readFileSync(path.join(__dirname, '..', 'samples', 'example.sdkprf'), 'utf8');
const parsed = parseText(text);

assert.strictEqual(parsed.errors.length, 0, `unexpected parser errors: ${JSON.stringify(parsed.errors)}`);
assert.strictEqual(parsed.blocks.length, 2, 'expected two rule blocks');
assert.strictEqual(parsed.rootBlocks.length, 2, 'expected two root blocks');
assert.strictEqual(parsed.rules.length, 7, 'expected seven rules');
assert.strictEqual(parsed.rootRules.length, 3, 'expected three top-level rules');

const hidden = parsed.blocks.find((block) => block.path === 'hidden');
assert(hidden, 'hidden block should exist');
assert.strictEqual(hidden.kind, 'intro');
assert.strictEqual(hidden.children.filter((child) => child.type === 'rule').length, 2);

const advanced = parsed.blocks.find((block) => block.path === 'advanced');
assert(advanced, 'advanced block should exist');
assert.strictEqual(advanced.kind, 'section');
assert.strictEqual(advanced.children.filter((child) => child.type === 'rule').length, 2);

const rowHidden = parsed.rules.find((rule) => rule.path === 'hidden.row_hidden');
assert(rowHidden, 'nested rule should have a block-qualified path');
assert.strictEqual(rowHidden.depth, 1);
assert.strictEqual(rowHidden.parent, hidden);

const nextRule = parsed.rules.find((rule) => rule.path === 'advanced.next_rule');
assert(nextRule, 'qualified rule reference should not confuse the parser');
assert.strictEqual(nextRule.parent, advanced);

const topLevel = parsed.rules.find((rule) => rule.path === 'single_value');
assert(topLevel, 'top-level rule should exist');
assert.strictEqual(topLevel.parent, null);

// A mismatched end must be reported, and the block must stay open.
const mismatched = parseText('intro a:\n  - r: p => q\nend b\n');
assert.strictEqual(mismatched.errors.length, 1);
assert.strictEqual(mismatched.blocks[0].endLine, mismatched.lines.length - 1);

// section takes only a name, unlike intro.
const sectionWithPremises = parseText('section s: p\n  - r: p => q\nend s\n');
assert.strictEqual(sectionWithPremises.errors.length, 1);
assert(sectionWithPremises.errors[0].message.includes('section only takes a name'));
const sectionWithoutPremises = parseText('section s:\n  - r: p => q\nend s\n');
assert.strictEqual(sectionWithoutPremises.errors.length, 0);

// A rule may wrap onto more-indented continuation lines.
const multiline = parseText(
  ['section s:', '  - r: p =>', '      q', '      r', 'end s'].join('\n')
);
assert.strictEqual(multiline.errors.length, 0);
assert.strictEqual(multiline.rules[0].endLine, 3);
assert.strictEqual(
  multiline.rules[0].signature,
  '- r: p =>\nq\nr'
);

// A blank line ends the rule; a later indented line is not part of it.
const blankTerminated = parseText(
  ['section s:', '  - r: p =>', '', '      q', 'end s'].join('\n')
);
assert.strictEqual(blankTerminated.rules[0].signature, '- r: p =>');

// A block comment hides structural-looking lines.
const commented = parseText('/*\nintro fake:\n  - fake: p => q\nend fake\n*/\n');
assert.strictEqual(commented.blocks.length, 0);
assert.strictEqual(commented.rules.length, 0);

// Nested blocks get full paths and can be closed independently.
const nested = parseText(
  ['intro outer:', '  - r1: p => q', '  section inner:', '    -- r2: p => q', '  end inner', 'end outer'].join('\n')
);
assert.strictEqual(nested.blocks.length, 2);
assert.strictEqual(nested.rules.find((rule) => rule.path === 'outer.inner.r2').depth, 2);
assert.strictEqual(nested.blocks.find((block) => block.path === 'outer.inner').parent.path, 'outer');

// stripComments preserves line length so nameStart columns stay usable.
const commentState = { inBlock: false };
const stripped = stripComments('  - r: p => q // trailing', commentState);
assert.strictEqual(stripped.length, '  - r: p => q // trailing'.length);
assert.strictEqual(stripped.endsWith(' '), true);

console.log('parser tests passed');
