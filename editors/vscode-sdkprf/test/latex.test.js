'use strict';

const assert = require('assert');
const { LATEX_SYMBOLS, findLatexReplacement } = require('../lib/latex');

const expected = {
  to: '→',
  forall: '∀',
  exists: '∃',
  and: '∧',
  or: '∨',
  in: '∈',
  notin: '∉',
  subseteq: '⊆',
  cup: '∪',
  cap: '∩',
  le: '≤',
  ge: '≥',
  ne: '≠',
  R: 'ℝ',
  N: 'ℕ',
  Z: 'ℤ',
  Q: 'ℚ',
  C: 'ℂ',
  lambda: 'λ',
  lam: 'λ',
  infty: '∞',
  int: '∫',
  vdash: '⊢',
  models: '⊨',
  sqsubseteq: '⊑',
  langle: '⟨',
  rangle: '⟩'
};

for (const [command, symbol] of Object.entries(expected)) {
  assert.strictEqual(LATEX_SYMBOLS[command], symbol, `\\${command} should map to ${symbol}`);
}

for (const [command, symbol] of Object.entries(LATEX_SYMBOLS)) {
  assert(/^[A-Za-z]+$/.test(command), `command key must be letters only: ${command}`);
  assert(typeof symbol === 'string' && symbol.length > 0, `symbol for ${command} must be non-empty`);
}

// Longer commands must remain distinct from their prefixes.
assert.strictEqual(LATEX_SYMBOLS.to, '→');
assert.strictEqual(LATEX_SYMBOLS.top, '⊤');
assert.strictEqual(LATEX_SYMBOLS.in, '∈');
assert.strictEqual(LATEX_SYMBOLS.infty, '∞');

assert.deepStrictEqual(findLatexReplacement('x = \\to', 'x = \\to'.length), {
  command: '\\to',
  start: 4,
  end: 7,
  symbol: '→'
});
assert.deepStrictEqual(findLatexReplacement('\\R', 2), {
  command: '\\R',
  start: 0,
  end: 2,
  symbol: 'ℝ'
});
assert.strictEqual(findLatexReplacement('\\\\to', '\\\\to'.length), undefined);
assert.strictEqual(findLatexReplacement('\\unknown', '\\unknown'.length), undefined);
assert.strictEqual(findLatexReplacement('\\to ', '\\to '.length), undefined);

console.log('latex input tests passed');
