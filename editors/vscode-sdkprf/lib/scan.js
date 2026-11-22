'use strict';

/**
 * Scan word-like tokens outside comments and strings.
 *
 * This is intentionally not a full lexer.  It exists so the semantic-token
 * provider can highlight rule references (which are just bare identifiers in
 * the grammar) using the rule/block definitions parsed from the document and
 * the workspace.  Comments and string contents are skipped.
 */

const WORD_RE = /[\p{L}_][\p{L}\p{N}_']*(?:\.[\p{L}_][\p{L}\p{N}_']*)*/uy;
const WORD_CHAR_RE = /[\p{L}\p{N}_]/u;

/**
 * @param {string} text
 * @returns {Array<{line: number, start: number, end: number, text: string}>}
 */
function scanWordTokens(text) {
  const lines = String(text).split(/\r?\n/);
  const result = [];
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

      // Variables are handled by the TextMate grammar; do not let a rule name
      // paint only the inner part of "$name" or "_name_".
      if (line[i] === '$') {
        i += 1;
        while (i < line.length && WORD_CHAR_RE.test(line[i])) {
          i += 1;
        }
        continue;
      }

      WORD_RE.lastIndex = i;
      const match = WORD_RE.exec(line);
      if (match) {
        result.push({
          line: lineNumber,
          start: i,
          end: i + match[0].length,
          text: match[0]
        });
        i += match[0].length;
      } else {
        i += 1;
      }
    }
  }

  return result;
}

module.exports = { scanWordTokens };
