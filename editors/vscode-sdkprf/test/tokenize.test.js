'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vsctm = require('vscode-textmate');
const oniguruma = require('vscode-oniguruma');

const GRAMMAR_PATH = path.join(__dirname, '..', 'syntaxes', 'sdkprf.tmLanguage.json');
const SAMPLE_PATH = path.join(__dirname, '..', 'samples', 'example.sdkprf');

let onigLibPromise;

function getOnigLib() {
  if (!onigLibPromise) {
    const wasmPath = require.resolve('vscode-oniguruma/release/onig.wasm');
    const bin = fs.readFileSync(wasmPath);
    const buffer = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
    onigLibPromise = oniguruma.loadWASM(buffer).then(() => ({
      createOnigScanner(patterns) {
        return new oniguruma.OnigScanner(patterns);
      },
      createOnigString(value) {
        return new oniguruma.OnigString(value);
      }
    }));
  }
  return onigLibPromise;
}

function scopesAt(lineInfo, index) {
  const token = lineInfo.tokens.find(
    (candidate) => candidate.startIndex <= index && index < candidate.endIndex
  );
  return token ? token.scopes : [];
}

function indexOfNth(line, needle, occurrence) {
  let index = -1;
  for (let i = 0; i <= occurrence; i += 1) {
    index = line.indexOf(needle, index + 1);
    if (index < 0) {
      return -1;
    }
  }
  return index;
}

function assertScope(lineInfo, needle, expected, occurrence = 0) {
  const index = indexOfNth(lineInfo.line, needle, occurrence);
  assert(index >= 0, `needle ${JSON.stringify(needle)} not found in ${JSON.stringify(lineInfo.line)}`);
  const scopes = scopesAt(lineInfo, index);
  assert(
    scopes.includes(expected),
    `expected ${expected} at ${JSON.stringify(needle)} in ${JSON.stringify(lineInfo.line)}, got ${JSON.stringify(scopes)}`
  );
}

function findLine(lines, predicate) {
  const line = lines.find((candidate) => predicate(candidate.line));
  assert(line, 'expected line not found');
  return line;
}

async function main() {
  const registry = new vsctm.Registry({
    onigLib: getOnigLib(),
    loadGrammar: async (scopeName) => {
      if (scopeName !== 'source.sdkprf') {
        return null;
      }
      return vsctm.parseRawGrammar(fs.readFileSync(GRAMMAR_PATH, 'utf8'), GRAMMAR_PATH);
    }
  });

  const grammar = await registry.loadGrammar('source.sdkprf');
  assert(grammar, 'grammar should load');

  const text = fs.readFileSync(SAMPLE_PATH, 'utf8');
  let ruleStack = vsctm.INITIAL;
  const lines = text.split(/\r?\n/).map((line) => {
    const result = grammar.tokenizeLine(line, ruleStack);
    ruleStack = result.ruleStack;
    return { line, tokens: result.tokens };
  });

  const intro = findLine(lines, (line) => line.startsWith('intro hidden:'));
  assertScope(intro, 'intro', 'keyword.control.block.sdkprf');
  assertScope(intro, 'hidden', 'entity.name.type.block.sdkprf');

  const section = findLine(lines, (line) => line.startsWith('section advanced:'));
  assertScope(section, 'section', 'keyword.control.block.sdkprf');
  assertScope(section, 'advanced', 'entity.name.type.block.sdkprf');

  const end = findLine(lines, (line) => line.startsWith('end hidden'));
  assertScope(end, 'end', 'keyword.control.block.end.sdkprf');
  assertScope(end, 'hidden', 'entity.name.type.block.sdkprf');

  const importLine = findLine(lines, (line) => line === 'import sudoku.core');
  assertScope(importLine, 'import', 'keyword.control.import.sdkprf');
  assertScope(importLine, 'sudoku.core', 'entity.name.namespace.import.sdkprf');

  const topRule = findLine(lines, (line) => line.startsWith('single_value:'));
  assertScope(topRule, 'single_value', 'entity.name.function.rule.sdkprf');
  assertScope(topRule, '[', 'punctuation.section.implicit.begin.sdkprf');
  assertScope(topRule, ']', 'punctuation.section.implicit.end.sdkprf');
  assertScope(topRule, 'uc1', 'variable.other.coordinate.sdkprf');
  assertScope(topRule, '=?', 'keyword.operator.candidate.sdkprf');
  assertScope(topRule, '=>', 'keyword.operator.entailment.sdkprf');
  assertScope(topRule, 'given', 'constant.language.with-target.sdkprf');

  const nestedRule = findLine(lines, (line) => line.includes('row_hidden:'));
  assertScope(nestedRule, '-', 'punctuation.definition.depth.sdkprf');
  assertScope(nestedRule, 'row_hidden', 'entity.name.function.rule.sdkprf');
  assertScope(nestedRule, 'ur1', 'variable.other.coordinate.sdkprf');
  assertScope(nestedRule, '5', 'constant.numeric.sdkprf');

  const qualifiedRule = findLine(lines, (line) => line.includes('hidden.row_hidden with'));
  assertScope(qualifiedRule, 'hidden.row_hidden', 'entity.name.namespace.sdkprf');

  const rename = findLine(lines, (line) => line.startsWith('rename:'));
  assertScope(rename, '$x', 'variable.other.dollar.sdkprf');
  assertScope(rename, '_y_', 'variable.other.underscore.sdkprf');

  const unlock = findLine(lines, (line) => line === 'unlock ug1');
  assertScope(unlock, 'unlock', 'keyword.control.unlock.sdkprf');
  assertScope(unlock, 'ug1', 'variable.other.coordinate.sdkprf');

  const comment = findLine(lines, (line) => line.startsWith('// Sodukuvania'));
  assertScope(comment, '//', 'comment.line.double-slash.sdkprf');

  // Edge cases that are easy to miss in the sample file.
  const underscoreLineText = 'var: _foo_bar_ => _foo_bar_';
  const underscoreLine = {
    line: underscoreLineText,
    tokens: grammar.tokenizeLine(underscoreLineText, vsctm.INITIAL).tokens
  };
  assertScope(underscoreLine, '_foo_bar_', 'variable.other.underscore.sdkprf', 0);
  assertScope(underscoreLine, '_foo_bar_', 'variable.other.underscore.sdkprf', 1);

  const coordinateLineText = 'coord: ug1ur2 => ug1ur2';
  const coordinateLine = {
    line: coordinateLineText,
    tokens: grammar.tokenizeLine(coordinateLineText, vsctm.INITIAL).tokens
  };
  assertScope(coordinateLine, 'ug1ur2', 'variable.other.coordinate.sdkprf', 0);
  assertScope(coordinateLine, 'ug1ur2', 'variable.other.coordinate.sdkprf', 1);

  const hyphenImportText = 'import my-folder.mod';
  const hyphenImport = {
    line: hyphenImportText,
    tokens: grammar.tokenizeLine(hyphenImportText, vsctm.INITIAL).tokens
  };
  assertScope(hyphenImport, 'my-folder.mod', 'entity.name.namespace.import.sdkprf');

  // Symbols inserted by the LaTeX input method should be highlighted too.
  const unicodeLineText = 'm: ∫ ⋃ α ℕ →';
  const unicodeLine = {
    line: unicodeLineText,
    tokens: grammar.tokenizeLine(unicodeLineText, vsctm.INITIAL).tokens
  };
  assertScope(unicodeLine, '∫', 'keyword.operator.math.sdkprf');
  assertScope(unicodeLine, '⋃', 'keyword.operator.set.sdkprf');
  assertScope(unicodeLine, 'α', 'variable.other.greek.sdkprf');
  assertScope(unicodeLine, 'ℕ', 'constant.language.number-set.sdkprf');
  assertScope(unicodeLine, '→', 'keyword.operator.logical.sdkprf');

  // Premise references and special $<nat> variables.
  const premiseLineText = 'ref: single_value.0 => $0';
  const premiseLine = {
    line: premiseLineText,
    tokens: grammar.tokenizeLine(premiseLineText, vsctm.INITIAL).tokens
  };
  assertScope(premiseLine, 'single_value', 'entity.name.function.rule.sdkprf');
  assertScope(premiseLine, '0', 'constant.numeric.premise-index.sdkprf');
  assertScope(premiseLine, '$0', 'variable.other.dollar.sdkprf');

  // Equality and negated section-5 operators.
  const operatorLineText =
    'ops: $a == $b ∧ $a != $b ∧ $a !== $b ∧ $a !=? $b ∧ $a !:= $b';
  const operatorLine = {
    line: operatorLineText,
    tokens: grammar.tokenizeLine(operatorLineText, vsctm.INITIAL).tokens
  };
  assertScope(operatorLine, '==', 'keyword.operator.equality.sdkprf');
  assertScope(operatorLine, '!=', 'keyword.operator.negation.assignment.sdkprf', 0);
  assertScope(operatorLine, '!==', 'keyword.operator.negation.equality.sdkprf');
  assertScope(operatorLine, '!=?', 'keyword.operator.negation.candidate.sdkprf');
  assertScope(operatorLine, '!:=', 'keyword.operator.negation.binding.sdkprf');

  // Block comments must continue across lines and end on */.
  const blockStart = grammar.tokenizeLine('/* several', vsctm.INITIAL);
  assert(
    blockStart.tokens[0].scopes.includes('comment.block.sdkprf'),
    `block comment start scopes: ${JSON.stringify(blockStart.tokens[0].scopes)}`
  );
  const blockContinue = grammar.tokenizeLine('lines of comment', blockStart.ruleStack);
  assert(
    blockContinue.tokens[0].scopes.includes('comment.block.sdkprf'),
    `block comment continuation scopes: ${JSON.stringify(blockContinue.tokens[0].scopes)}`
  );
  const blockEnd = grammar.tokenizeLine('end */ x = 1', blockContinue.ruleStack);
  const xIndex = 'end */ x = 1'.indexOf('x =');
  const xScopes = scopesAt({ line: 'end */ x = 1', tokens: blockEnd.tokens }, xIndex);
  assert(
    !xScopes.includes('comment.block.sdkprf'),
    `text after */ should leave comment scope, got ${JSON.stringify(xScopes)}`
  );

  console.log('tokenizer tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
