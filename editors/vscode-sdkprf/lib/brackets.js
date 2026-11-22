'use strict';

/**
 * Scan []/()/{} outside comments and strings and return one record per bracket.
 *
 * `depth` is the nesting level used for rainbow coloring: the outermost pair
 * is 0.  A closing bracket that does not match the innermost open bracket is
 * returned with matched=false so it can be drawn with the "unexpected" theme
 * color.
 */

const OPEN_TO_CLOSE = Object.freeze({
  '[': ']',
  '(': ')',
  '{': '}'
});

const CLOSE_TO_OPEN = Object.freeze({
  ']': '[',
  ')': '(',
  '}': '{'
});

/**
 * @param {string} text
 * @returns {Array<{char: string, line: number, index: number, depth: number, matched: boolean}>}
 */
function scanBrackets(text) {
  const lines = String(text).split(/\r?\n/);
  const tokens = [];
  const stack = [];
  let inBlock = false;

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    const line = lines[lineNumber];
    let i = 0;
    let inString = false;

    while (i < line.length) {
      if (inBlock) {
        const end = line.indexOf('*/', i);
        if (end < 0) {
          i = line.length;
          break;
        }
        inBlock = false;
        i = end + 2;
        continue;
      }

      if (inString) {
        if (line[i] === '\\') {
          i += 2;
        } else if (line[i] === '"') {
          inString = false;
          i += 1;
        } else {
          i += 1;
        }
        continue;
      }

      if (line[i] === '/' && line[i + 1] === '/') {
        break;
      }
      if (line[i] === '/' && line[i + 1] === '*') {
        inBlock = true;
        i += 2;
        continue;
      }
      if (line[i] === '"') {
        inString = true;
        i += 1;
        continue;
      }

      const char = line[i];

      if (OPEN_TO_CLOSE[char]) {
        tokens.push({
          char,
          line: lineNumber,
          index: i,
          depth: stack.length,
          matched: true
        });
        stack.push({ char, line: lineNumber, index: i });
        i += 1;
        continue;
      }

      if (CLOSE_TO_OPEN[char]) {
        const top = stack[stack.length - 1];
        if (top && OPEN_TO_CLOSE[top.char] === char) {
          stack.pop();
          tokens.push({
            char,
            line: lineNumber,
            index: i,
            depth: stack.length,
            matched: true
          });
        } else {
          tokens.push({
            char,
            line: lineNumber,
            index: i,
            depth: stack.length,
            matched: false
          });
        }
        i += 1;
        continue;
      }

      i += 1;
    }
  }

  return tokens;
}

module.exports = { scanBrackets };
