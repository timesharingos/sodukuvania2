'use strict';

/**
 * A deliberately small, error-tolerant parser for the structural part of the
 * Sodukuvania proof language.  It only recognises things that are unambiguous
 * from the syntax frame:
 *
 *   intro <name>: ...        section <name>:
 *       - <rule>: ...            - <rule>: ...
 *   end <name>                end <name>
 *
 * Everything else (statements, with-clauses, ...) is left alone; the language
 * is semi-formal and the grammar used for highlighting is intentionally more
 * permissive than this parser.
 */

const BLOCK_RE = /^(\s*)(intro|section)\s+([^\s:()\[\]{}=>]+)\s*(:)/;
const END_RE = /^(\s*)end\b(?:\s+([^\s]+))?/;
const RULE_RE = /^(\s*)(?:(-+)\s+)?([^\s:()\[\]{}=>]+)\s*:/;

const RESERVED = new Set([
  'intro',
  'section',
  'end',
  'import',
  'unlock',
  'with',
  'by'
]);

/**
 * Replace comments with spaces while keeping the line length.  Line numbers and
 * column numbers therefore stay valid.  This is not a full lexer: it does not
 * know about strings, which is fine for the structural pass because a proof
 * line never starts with a quoted string in the current format.
 */
function stripComments(line, state) {
  let out = '';
  let i = 0;

  while (i < line.length) {
    if (state.inBlock) {
      const end = line.indexOf('*/', i);
      if (end < 0) {
        return out + ' '.repeat(line.length - out.length);
      }
      out += ' '.repeat(end + 2 - out.length);
      state.inBlock = false;
      i = end + 2;
      continue;
    }

    const blockStart = line.indexOf('/*', i);
    const lineStart = line.indexOf('//', i);

    if (lineStart >= 0 && (blockStart < 0 || lineStart < blockStart)) {
      out += line.slice(i, lineStart);
      return out + ' '.repeat(line.length - out.length);
    }

    if (blockStart < 0) {
      out += line.slice(i);
      return out;
    }

    out += line.slice(i, blockStart);
    out += ' '.repeat(blockStart + 2 - out.length);
    state.inBlock = true;
    i = blockStart + 2;
  }

  return out;
}

function lastIndexOfBlock(stack, name) {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    if (stack[i].name === name) {
      return i;
    }
  }
  return -1;
}

function nameStartIn(line, name, from) {
  const index = line.indexOf(name, from);
  return index >= 0 ? index : from;
}

/**
 * @param {string} text
 * @returns {{
 *   lines: string[],
 *   blocks: Array<object>,
 *   rules: Array<object>,
 *   rootBlocks: Array<object>,
 *   rootRules: Array<object>,
 *   errors: Array<{line: number, message: string}>
 * }}
 */
function parseText(text) {
  const lines = String(text).split(/\r?\n/);
  const blocks = [];
  const rules = [];
  const errors = [];
  const stack = [];
  const commentState = { inBlock: false };
  let currentRule = null;

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    const original = lines[lineNumber];
    const line = stripComments(original, commentState);
    const trimmed = line.trim();

    if (trimmed === '') {
      // A truly blank line ends a multi-line rule; a comment-only line does not.
      if (original.trim() === '') {
        currentRule = null;
      }
      continue;
    }

    const blockMatch = BLOCK_RE.exec(line);
    if (blockMatch) {
      currentRule = null;
      const kind = blockMatch[2];
      const name = blockMatch[3];
      if (kind === 'section' && line.slice(blockMatch[0].length).trim() !== '') {
        errors.push({
          line: lineNumber,
          message: 'section only takes a name; remove the text after ":"'
        });
      }
      const parent = stack.length > 0 ? stack[stack.length - 1] : null;
      const start = Math.max(
        blockMatch[1].length + kind.length,
        nameStartIn(line, name, blockMatch[1].length + kind.length)
      );
      const block = {
        type: 'block',
        kind,
        name,
        path: parent ? `${parent.path}.${name}` : name,
        parent,
        children: [],
        startLine: lineNumber,
        endLine: lines.length - 1,
        nameStart: start,
        nameEnd: start + name.length
      };
      blocks.push(block);
      if (parent) {
        parent.children.push(block);
      }
      stack.push(block);
      continue;
    }

    const endMatch = END_RE.exec(line);
    if (endMatch) {
      currentRule = null;
      const name = endMatch[2];
      let index;
      if (name) {
        index = lastIndexOfBlock(stack, name);
        if (index < 0) {
          errors.push({
            line: lineNumber,
            message: `end ${name}: no matching intro/section block`
          });
          continue;
        }
      } else {
        index = stack.length - 1;
      }

      if (index < 0) {
        errors.push({
          line: lineNumber,
          message: 'end: no open intro/section block'
        });
        continue;
      }

      // Blocks nested more deeply than the one being closed are implicitly
      // closed here; remember that instead of silently swallowing them.
      for (let i = stack.length - 1; i > index; i -= 1) {
        stack[i].endLine = lineNumber;
        errors.push({
          line: stack[i].startLine,
          message: `${stack[i].kind} ${stack[i].name}: block is not closed before end ${stack[index].name}`
        });
      }

      stack[index].endLine = lineNumber;
      stack.length = index;
      continue;
    }

    const ruleMatch = RULE_RE.exec(line);
    if (ruleMatch) {
      const name = ruleMatch[3];
      if (RESERVED.has(name)) {
        continue;
      }
      const parent = stack.length > 0 ? stack[stack.length - 1] : null;
      const from = ruleMatch[1].length + (ruleMatch[2] ? ruleMatch[2].length + 1 : 0);
      const start = nameStartIn(line, name, from);
      const rule = {
        type: 'rule',
        name,
        path: parent ? `${parent.path}.${name}` : name,
        parent,
        line: lineNumber,
        endLine: lineNumber,
        indent: ruleMatch[1].length,
        depth: ruleMatch[2] ? ruleMatch[2].length : 0,
        nameStart: start,
        nameEnd: start + name.length,
        signature: line.trim()
      };
      rules.push(rule);
      if (parent) {
        parent.children.push(rule);
      }
      currentRule = rule;
      continue;
    }

    // A rule may wrap onto indented continuation lines.  Keep the full text for
    // hover/completion documentation and let the outline span the whole rule.
    if (currentRule) {
      const leading = /^\s*/.exec(line);
      const indent = leading ? leading[0].length : 0;
      if (indent > currentRule.indent) {
        currentRule.signature += `\n${line.trim()}`;
        currentRule.endLine = lineNumber;
        continue;
      }
    }

    currentRule = null;
  }

  // Blocks still on the stack are open at EOF.  They are usable for outline
  // and folding, but we do not report an error for them: a file being typed is
  // routinely incomplete, and the extension should not shout at the user.
  for (const block of stack) {
    block.endLine = lines.length - 1;
  }

  return {
    lines,
    blocks,
    rules,
    rootBlocks: blocks.filter((block) => !block.parent),
    rootRules: rules.filter((rule) => !rule.parent),
    errors
  };
}

module.exports = {
  parseText,
  stripComments,
  BLOCK_RE,
  END_RE,
  RULE_RE,
  RESERVED
};
