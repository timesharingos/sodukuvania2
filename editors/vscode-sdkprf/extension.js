'use strict';

const vscode = require('vscode');
const { parseText } = require('./lib/parser');
const { scanWordTokens } = require('./lib/scan');
const { scanBrackets } = require('./lib/brackets');
const { LATEX_SYMBOLS, findLatexReplacement } = require('./lib/latex');

const LANGUAGE_ID = 'sdkprf';
const SELECTOR = { language: LANGUAGE_ID };
const INDEX_LIMIT = 500;
const SEMANTIC_LEGEND = new vscode.SemanticTokensLegend(['function', 'type'], []);
const LATEX_PREFIX_RE = /\\[A-Za-z]*$/;

const diagnostics = vscode.languages.createDiagnosticCollection('sdkprf');

const KEYWORD_INFO = {
  intro: {
    kind: vscode.CompletionItemKind.Keyword,
    detail: 'intro conditional rule block',
    doc: [
      '**intro** — conditional rule block',
      '',
      'Rules are automatically prefixed with `<name>.` when referenced from outside. A conditional block also adds the rules introduced by its own `intro` level to the premises.',
      '',
      '```sdkprf',
      'intro name: premises',
      '  - rule: premises => conclusion',
      'end name',
      '```'
    ].join('\n')
  },
  section: {
    kind: vscode.CompletionItemKind.Keyword,
    detail: 'section set rule block',
    doc: [
      '**section** — set rule block',
      '',
      'Supports nesting and the `<name>.` reference prefix like a conditional block. A set block takes only a name, not premises.',
      '',
      '```sdkprf',
      'section name:',
      '  - rule: premises => conclusion',
      'end name',
      '```'
    ].join('\n')
  },
  end: {
    kind: vscode.CompletionItemKind.Keyword,
    detail: 'end a rule block',
    doc: '**end** — closes the nearest `intro` / `section` block: `end name`.'
  },
  import: {
    kind: vscode.CompletionItemKind.Keyword,
    detail: 'import a module',
    doc: [
      '**import** — imports a module by directory and file name (case-sensitive, `.sdkprf` extension).',
      '',
      '```sdkprf',
      'import folder.subfolder.module',
      '```'
    ].join('\n')
  },
  unlock: {
    kind: vscode.CompletionItemKind.Keyword,
    detail: 'unlock a region',
    doc: [
      '**unlock** — removes the fog of war from a region.',
      '',
      '```sdkprf',
      'unlock ug1',
      '```'
    ].join('\n')
  },
  with: {
    kind: vscode.CompletionItemKind.Keyword,
    detail: 'with clause',
    doc: [
      '**with** — brings in an external rule, reference, or condition; its scope is the rule it belongs to.',
      '',
      '```sdkprf',
      '(with given)',
      '(with axioms by x=1)',
      '(with known)',
      '```',
      '',
      'Predefined targets: `given` (board givens), `axioms` (pure mathematics), `known` (geometric relations).'
    ].join('\n')
  },
  by: {
    kind: vscode.CompletionItemKind.Keyword,
    detail: 'meta-variable binding',
    doc: '**by** — binds meta-variables inside a `with` clause: `by <meta_var>=<value>...`.'
  },
  given: {
    kind: vscode.CompletionItemKind.Constant,
    detail: 'with given: board givens',
    doc: '**given** — known rules and board givens. `(with given)`.'
  },
  axioms: {
    kind: vscode.CompletionItemKind.Constant,
    detail: 'with axioms: pure mathematics',
    doc: '**axioms** — basic mathematics and game-independent pure-math proofs. `(with axioms)`.'
  },
  known: {
    kind: vscode.CompletionItemKind.Constant,
    detail: 'with known: geometric relations',
    doc: '**known** — geometric relations. `(with known)`.'
  }
};

const OPERATOR_INFO = {
  '=>': {
    detail: 'rule separator',
    doc: [
      '**`=>`** — separates premises from the conclusion.',
      '',
      '```sdkprf',
      'rule_name: premises => conclusion',
      '```'
    ].join('\n')
  },
  '=?': {
    detail: 'candidate set',
    doc: '**`=?`** — candidate set; flattens automatically and wraps a single element.'
  },
  ':=': {
    detail: 'structured binding',
    doc: '**`:=`** — structured binding, a shorthand for a set.'
  },
  '=': {
    detail: 'value assignment',
    doc: '**`=`** — assigns a number; flattens automatically and wraps a single element.'
  }
};

const COORDINATE_DOC = [
  '**Coordinates**',
  '',
  'Fixed form: `<prefix><scope><index>...`, denoting every coordinate that satisfies the constraint.',
  '',
  '- `u`: universe, global coordinate',
  '- `g`: grid, a single minimal board',
  '- `b`: block, a region (box or irregular region)',
  '- `r`: row',
  '- `c`: column',
  '',
  'Examples: `ug1`, `ub2`, `ur3`, `uc4`.'
].join('\n');

const VARIABLE_DOC = [
  '**Variables**',
  '',
  'A variable can be written as `$<name>` or `_<name>_`; the two forms differ only in spelling, and the real ID is `<name>`.',
  'Substitution rule: all variables with the same name are replaced.'
].join('\n');

const BY_META_DOC =
  '**by meta-variable** — a parameter name bound by `by <meta_var>=<value>`, not a rule reference.';

function isMetaVariableAt(lineText, start, end) {
  const after = lineText.slice(end);
  if (!/^\s*=(?![=>?])/.test(after)) {
    return false;
  }

  const before = lineText.slice(0, start);
  const matches = [...before.matchAll(/\bby\b/g)];
  if (matches.length === 0) {
    return false;
  }

  const lastBy = matches[matches.length - 1];
  return !before.slice(lastBy.index).includes(')');
}

const MODULE_IMPORT_DOC =
  '**Module path** — modules are organized by directory and file name, case-sensitive, and map to `.sdkprf` files.';

function findRule(parsed, name) {
  return (
    parsed.rules.find((rule) => rule.path === name) ||
    parsed.rules.find((rule) => rule.name === name)
  );
}

function findBlock(parsed, name) {
  return (
    parsed.blocks.find((block) => block.path === name) ||
    parsed.blocks.find((block) => block.name === name)
  );
}

/**
 * Completion list for a LaTeX-ish command immediately before the cursor.
 * Returns undefined when the cursor is not after a backslash command.
 */
function latexCompletionItems(document, position) {
  const line = document.lineAt(position.line).text;
  const prefix = line.slice(0, position.character);
  const match = LATEX_PREFIX_RE.exec(prefix);
  if (!match) {
    return undefined;
  }

  const start = prefix.length - match[0].length;
  if (start > 0 && prefix[start - 1] === '\\') {
    return undefined;
  }

  const typed = match[0].slice(1);
  const range = new vscode.Range(position.line, start, position.line, position.character);
  const items = [];

  for (const [name, symbol] of Object.entries(LATEX_SYMBOLS)) {
    if (typed && !name.startsWith(typed)) {
      continue;
    }

    const command = `\\${name}`;
    const item = new vscode.CompletionItem(command, vscode.CompletionItemKind.Constant);
    item.insertText = symbol;
    item.filterText = name;
    item.range = range;
    item.detail = symbol;
    item.documentation = new vscode.MarkdownString(`\`${command}\` → **${symbol}**`);
    item.sortText = `${command === match[0] ? '0_' : '1_'}${name}`;
    items.push(item);
  }

  return items;
}

/**
 * Lean-style input method: after "\to", pressing space/tab replaces the
 * command with "→" while leaving the typed whitespace in place.
 */
function applyLatexInput(event) {
  if (event.document.languageId !== LANGUAGE_ID) {
    return;
  }
  if (!vscode.workspace.getConfiguration('sdkprf').get('unicodeInput.enabled', true)) {
    return;
  }
  if (event.contentChanges.length !== 1) {
    return;
  }

  const change = event.contentChanges[0];
  if (change.rangeLength !== 0 || !/^[ \t]+$/.test(change.text)) {
    return;
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document !== event.document) {
    return;
  }

  const line = event.document.lineAt(change.range.start.line).text;
  const replacement = findLatexReplacement(line, change.range.start.character);
  if (!replacement) {
    return;
  }

  const range = new vscode.Range(
    change.range.start.line,
    replacement.start,
    change.range.start.line,
    replacement.end
  );
  editor.edit((builder) => builder.replace(range, replacement.symbol)).then(undefined, () => {
    // The editor may have been closed or changed between the event and the
    // edit; the user can still type the symbol manually or use completion.
  });
}

function ruleSelectionRange(document, rule) {
  const line = document.lineAt(Math.min(rule.line, document.lineCount - 1));
  const start = Math.min(rule.nameStart, line.text.length);
  const end = Math.min(rule.nameEnd, line.text.length);
  return new vscode.Range(rule.line, start, rule.line, end);
}

function blockSelectionRange(document, block) {
  const line = document.lineAt(Math.min(block.startLine, document.lineCount - 1));
  const start = Math.min(block.nameStart, line.text.length);
  const end = Math.min(block.nameEnd, line.text.length);
  return new vscode.Range(block.startLine, start, block.startLine, end);
}

function isInCommentOrString(document, position) {
  const prefix = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
  let inBlock = false;
  let inString = false;
  let inLine = false;

  for (let i = 0; i < prefix.length; i += 1) {
    const current = prefix[i];
    const next = prefix[i + 1];

    if (inLine) {
      if (current === '\n') {
        inLine = false;
      }
      continue;
    }
    if (inBlock) {
      if (current === '*' && next === '/') {
        inBlock = false;
        i += 1;
      }
      continue;
    }
    if (inString) {
      if (current === '\\') {
        i += 1;
      } else if (current === '"') {
        inString = false;
      }
      continue;
    }
    if (current === '/' && next === '/') {
      inLine = true;
      i += 1;
      continue;
    }
    if (current === '/' && next === '*') {
      inBlock = true;
      i += 1;
      continue;
    }
    if (current === '"') {
      inString = true;
    }
  }

  return inBlock || inString || inLine;
}

const TOKEN_RE = /=>|=\?|:=|\$[\p{L}_][\p{L}\p{N}_]*|\b_[\p{L}\p{N}_]+_\b|\bu[gbrc]\d+(?:u?[gbrc]\d+)*\b|\b(?:intro|section|end|import|unlock|with|by|given|axioms|known)\b|[\p{L}_][\p{L}\p{N}_']*(?:\.[\p{L}_][\p{L}\p{N}_']*)*|=/gu;

function tokenAt(document, position) {
  const line = document.lineAt(position.line).text;
  TOKEN_RE.lastIndex = 0;

  let match;
  while ((match = TOKEN_RE.exec(line)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (position.character >= start && position.character <= end) {
      return {
        text: match[0],
        range: new vscode.Range(position.line, start, position.line, end)
      };
    }
    if (start > position.character) {
      break;
    }
    if (match[0].length === 0) {
      TOKEN_RE.lastIndex += 1;
    }
  }

  return undefined;
}

function markdownRule(rule, document) {
  const lines = [
    `**Rule** \`${rule.path}\``,
    '',
    '```sdkprf',
    rule.signature,
    '```',
    '',
    `Defined at line ${rule.line + 1}${rule.parent ? ` inside block \`${rule.parent.path}\`` : ''}.`
  ];
  return lines.join('\n');
}

function markdownBlock(block, document) {
  const line = document.lineAt(Math.min(block.startLine, document.lineCount - 1)).text.trim();
  const ruleCount = block.children.filter((child) => child.type === 'rule').length;
  return [
    `**${block.kind} block** \`${block.path}\``,
    '',
    '```sdkprf',
    line,
    '```',
    '',
    `Lines ${block.startLine + 1}–${block.endLine + 1}; contains ${ruleCount} direct child rule${ruleCount === 1 ? '' : 's'}.`
  ].join('\n');
}

const BRACKET_PALETTES = Object.freeze({
  dark: Object.freeze(['#FFD700', '#DA70D6', '#4FC1FF', '#FFA657', '#7EE787', '#FF7B72']),
  light: Object.freeze(['#9A6700', '#8250DF', '#0969DA', '#BC4C00', '#1A7F37', '#CF222E']),
  unexpectedDark: '#FF7B72',
  unexpectedLight: '#CF222E'
});

function isLightTheme() {
  const kind = vscode.window.activeColorTheme
    ? vscode.window.activeColorTheme.kind
    : vscode.ColorThemeKind.Dark;
  return kind === vscode.ColorThemeKind.Light || kind === vscode.ColorThemeKind.HighContrastLight;
}

class RainbowBrackets {
  constructor() {
    this.types = [];
    this.unexpected = undefined;
    this.rebuildTypes();
  }

  enabled() {
    return vscode.workspace
      .getConfiguration('sdkprf')
      .get('rainbowBrackets.enabled', true);
  }

  paletteMode() {
    return vscode.workspace
      .getConfiguration('sdkprf')
      .get('rainbowBrackets.palette', 'accessible');
  }

  colors() {
    if (this.paletteMode() === 'theme') {
      return Array.from(
        { length: 6 },
        (_, index) => new vscode.ThemeColor(`editorBracketHighlight.foreground${index + 1}`)
      );
    }
    return isLightTheme() ? BRACKET_PALETTES.light : BRACKET_PALETTES.dark;
  }

  unexpectedColor() {
    if (this.paletteMode() === 'theme') {
      return new vscode.ThemeColor('editorBracketHighlight.unexpectedBracket.foreground');
    }
    return isLightTheme()
      ? BRACKET_PALETTES.unexpectedLight
      : BRACKET_PALETTES.unexpectedDark;
  }

  rebuildTypes() {
    this.disposeTypes();
    this.types = this.colors().map((color) =>
      vscode.window.createTextEditorDecorationType({ color })
    );
    this.unexpected = vscode.window.createTextEditorDecorationType({
      color: this.unexpectedColor()
    });
  }

  update(editor) {
    if (!editor || editor.document.languageId !== LANGUAGE_ID) {
      return;
    }
    if (!this.enabled()) {
      this.clear(editor);
      return;
    }

    const buckets = Array.from({ length: 6 }, () => []);
    const unexpected = [];

    for (const token of scanBrackets(editor.document.getText())) {
      const range = new vscode.Range(
        token.line,
        token.index,
        token.line,
        token.index + 1
      );
      if (token.matched) {
        buckets[token.depth % 6].push(range);
      } else {
        unexpected.push(range);
      }
    }

    for (let i = 0; i < 6; i += 1) {
      editor.setDecorations(this.types[i], buckets[i]);
    }
    editor.setDecorations(this.unexpected, unexpected);
  }

  clear(editor) {
    for (const type of this.types) {
      editor.setDecorations(type, []);
    }
    if (this.unexpected) {
      editor.setDecorations(this.unexpected, []);
    }
  }

  updateDocument(document) {
    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document === document) {
        this.update(editor);
      }
    }
  }

  refreshVisible() {
    for (const editor of vscode.window.visibleTextEditors) {
      this.update(editor);
    }
  }

  disposeTypes() {
    for (const type of this.types) {
      type.dispose();
    }
    this.types = [];
    if (this.unexpected) {
      this.unexpected.dispose();
      this.unexpected = undefined;
    }
  }

  dispose() {
    this.disposeTypes();
  }
}

class WorkspaceIndex {
  constructor() {
    this.rules = [];
    this.blocks = [];
    this.modules = [];
    this.generation = 0;
    this.promise = Promise.resolve();
    this.rebuild();
  }

  rebuild() {
    const generation = (this.generation += 1);
    this.promise = this.load(generation).catch((error) => {
      console.error('[sdkprf] workspace index failed', error);
      if (generation === this.generation) {
        this.rules = [];
        this.blocks = [];
        this.modules = [];
      }
    });
    return this.promise;
  }

  async load(generation) {
    const files = await vscode.workspace.findFiles('**/*.sdkprf', '**/node_modules/**', INDEX_LIMIT);
    const rules = [];
    const blocks = [];
    const modules = [];

    for (const uri of files) {
      const relativePath = vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/');
      if (
        relativePath.includes('editors/vscode-sdkprf/test/') ||
        relativePath.includes('editors/vscode-sdkprf/samples/') ||
        relativePath.startsWith('test/fixtures/') ||
        relativePath.startsWith('samples/')
      ) {
        continue;
      }

      let text;
      try {
        const bytes = await vscode.workspace.fs.readFile(uri);
        text = Buffer.from(bytes).toString('utf8');
      } catch (error) {
        console.error(`[sdkprf] cannot read ${relativePath}`, error);
        continue;
      }

      const moduleName = relativePath.replace(/\.sdkprf$/i, '').split('/').join('.');
      const parsed = parseText(text);
      modules.push({ uri, relativePath, moduleName });

      for (const rule of parsed.rules) {
        rules.push({
          uri,
          relativePath,
          moduleName,
          fullName: `${moduleName}.${rule.path}`,
          rule
        });
      }

      for (const block of parsed.blocks) {
        blocks.push({
          uri,
          relativePath,
          moduleName,
          fullName: `${moduleName}.${block.path}`,
          ruleCount: block.children.filter((child) => child.type === 'rule').length,
          block
        });
      }
    }

    if (generation === this.generation) {
      this.rules = rules;
      this.blocks = blocks;
      this.modules = modules;
    }
  }

  async getRules() {
    await this.promise;
    return this.rules;
  }

  async getBlocks() {
    await this.promise;
    return this.blocks;
  }

  async getModules() {
    await this.promise;
    return this.modules;
  }
}

class SdkprfCompletionProvider {
  constructor(index) {
    this.index = index;
  }

  async provideCompletionItems(document, position) {
    const latexItems = latexCompletionItems(document, position);
    if (latexItems) {
      return latexItems;
    }

    if (isInCommentOrString(document, position)) {
      return [];
    }

    const linePrefix = document.lineAt(position.line).text.slice(0, position.character);

    if (/^\s*import\s+[\p{L}\p{N}_.]*$/u.test(linePrefix)) {
      const modules = await this.index.getModules();
      return modules.map((entry) => {
        const item = new vscode.CompletionItem(entry.moduleName, vscode.CompletionItemKind.Module);
        item.detail = `Module · ${entry.relativePath}`;
        item.documentation = new vscode.MarkdownString(
          `**Module** \`${entry.moduleName}\`\n\nFile: \`${entry.relativePath}\``
        );
        item.sortText = `0_${entry.moduleName}`;
        return item;
      });
    }

    const items = [];
    const seen = new Set();
    const add = (item) => {
      const key = `${item.kind}:${item.label}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push(item);
      }
    };

    const parsed = parseText(document.getText());

    for (const rule of parsed.rules) {
      const detail = rule.parent ? `Rule · in ${rule.parent.path}` : 'Rule · top level';
      const item = new vscode.CompletionItem(rule.name, vscode.CompletionItemKind.Function);
      item.detail = detail;
      item.documentation = new vscode.MarkdownString(markdownRule(rule, document));
      item.sortText = `1_${rule.name}`;
      add(item);

      if (rule.path !== rule.name) {
        const qualified = new vscode.CompletionItem(rule.path, vscode.CompletionItemKind.Function);
        qualified.detail = 'Rule · block-qualified name';
        qualified.documentation = new vscode.MarkdownString(markdownRule(rule, document));
        qualified.sortText = `1_${rule.path}`;
        add(qualified);
      }
    }

    for (const block of parsed.blocks) {
      const item = new vscode.CompletionItem(block.name, vscode.CompletionItemKind.Module);
      item.detail = `${block.kind} block`;
      item.documentation = new vscode.MarkdownString(markdownBlock(block, document));
      item.sortText = `1_${block.name}`;
      add(item);

      if (block.path !== block.name) {
        const qualified = new vscode.CompletionItem(block.path, vscode.CompletionItemKind.Module);
        qualified.detail = `${block.kind} block · qualified name`;
        qualified.documentation = new vscode.MarkdownString(markdownBlock(block, document));
        qualified.sortText = `1_${block.path}`;
        add(qualified);
      }
    }

    for (const [label, info] of Object.entries(KEYWORD_INFO)) {
      const item = new vscode.CompletionItem(label, info.kind);
      item.detail = info.detail;
      item.documentation = new vscode.MarkdownString(info.doc);
      item.sortText = `3_${label}`;
      add(item);
    }

    for (const [label, info] of Object.entries(OPERATOR_INFO)) {
      const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Operator);
      item.detail = info.detail;
      item.documentation = new vscode.MarkdownString(info.doc);
      item.sortText = `4_${label}`;
      add(item);
    }

    const workspaceRules = await this.index.getRules();
    for (const entry of workspaceRules) {
      const item = new vscode.CompletionItem(entry.fullName, vscode.CompletionItemKind.Function);
      item.detail = `Module ${entry.moduleName} · ${entry.relativePath}`;
      item.documentation = new vscode.MarkdownString(
        `**Rule** \`${entry.fullName}\`\n\n\`\`\`sdkprf\n${entry.rule.signature}\n\`\`\`\n\nFile: \`${entry.relativePath}\``
      );
      item.sortText = `5_${entry.fullName}`;
      add(item);
    }

    return items;
  }
}

class SdkprfHoverProvider {
  constructor(index) {
    this.index = index;
  }

  async provideHover(document, position) {
    if (isInCommentOrString(document, position)) {
      return undefined;
    }

    const token = tokenAt(document, position);
    if (!token) {
      return undefined;
    }

    const keyword = KEYWORD_INFO[token.text];
    if (keyword) {
      return new vscode.Hover(new vscode.MarkdownString(keyword.doc), token.range);
    }

    const operator = OPERATOR_INFO[token.text];
    if (operator) {
      return new vscode.Hover(new vscode.MarkdownString(operator.doc), token.range);
    }

    if (/^u[gbrc]\d/.test(token.text)) {
      return new vscode.Hover(new vscode.MarkdownString(COORDINATE_DOC), token.range);
    }

    if (/^\$/.test(token.text) || /^_[\p{L}\p{N}_]+_$/u.test(token.text)) {
      return new vscode.Hover(new vscode.MarkdownString(VARIABLE_DOC), token.range);
    }

    const lineText = document.lineAt(position.line).text;
    if (/^\s*import\b/.test(lineText)) {
      return new vscode.Hover(new vscode.MarkdownString(MODULE_IMPORT_DOC), token.range);
    }

    if (isMetaVariableAt(lineText, token.range.start.character, token.range.end.character)) {
      return new vscode.Hover(new vscode.MarkdownString(BY_META_DOC), token.range);
    }

    const parsed = parseText(document.getText());
    const rule = findRule(parsed, token.text);
    if (rule) {
      return new vscode.Hover(new vscode.MarkdownString(markdownRule(rule, document)), token.range);
    }

    const block = findBlock(parsed, token.text);
    if (block) {
      return new vscode.Hover(new vscode.MarkdownString(markdownBlock(block, document)), token.range);
    }

    const workspaceRules = (await this.index.getRules()).filter(
      (entry) =>
        entry.fullName === token.text ||
        entry.rule.path === token.text ||
        entry.rule.name === token.text
    );
    if (workspaceRules.length === 1) {
      const entry = workspaceRules[0];
      const markdown = [
        `**Rule** \`${entry.fullName}\``,
        '',
        '```sdkprf',
        entry.rule.signature,
        '```',
        '',
        `File: \`${entry.relativePath}\``
      ].join('\n');
      return new vscode.Hover(new vscode.MarkdownString(markdown), token.range);
    }

    const workspaceBlocks = (await this.index.getBlocks()).filter(
      (entry) =>
        entry.fullName === token.text ||
        entry.block.path === token.text ||
        entry.block.name === token.text
    );
    if (workspaceBlocks.length === 1) {
      const entry = workspaceBlocks[0];
      const markdown = [
        `**${entry.block.kind} block** \`${entry.fullName}\``,
        '',
        `Contains ${entry.ruleCount} direct child rule${entry.ruleCount === 1 ? '' : 's'}.`,
        '',
        `File: \`${entry.relativePath}\``
      ].join('\n');
      return new vscode.Hover(new vscode.MarkdownString(markdown), token.range);
    }

    return undefined;
  }
}

class SdkprfDefinitionProvider {
  constructor(index) {
    this.index = index;
  }

  async provideDefinition(document, position) {
    if (isInCommentOrString(document, position)) {
      return undefined;
    }

    const token = tokenAt(document, position);
    if (!token) {
      return undefined;
    }

    const lineText = document.lineAt(position.line).text;
    if (isMetaVariableAt(lineText, token.range.start.character, token.range.end.character)) {
      return undefined;
    }

    const parsed = parseText(document.getText());
    const localRule = findRule(parsed, token.text);
    if (localRule) {
      return new vscode.Location(document.uri, ruleSelectionRange(document, localRule));
    }

    const localBlock = findBlock(parsed, token.text);
    if (localBlock) {
      return new vscode.Location(document.uri, blockSelectionRange(document, localBlock));
    }

    const rules = await this.index.getRules();
    const fullMatches = rules.filter((entry) => entry.fullName === token.text);
    const pathMatches = rules.filter((entry) => entry.rule.path === token.text);
    const nameMatches = rules.filter((entry) => entry.rule.name === token.text);
    const match =
      fullMatches[0] ||
      (pathMatches.length === 1 ? pathMatches[0] : undefined) ||
      (nameMatches.length === 1 ? nameMatches[0] : undefined);
    if (match) {
      return new vscode.Location(
        match.uri,
        new vscode.Range(
          match.rule.line,
          match.rule.nameStart,
          match.rule.line,
          match.rule.nameEnd
        )
      );
    }

    const blocks = await this.index.getBlocks();
    const blockFullMatches = blocks.filter((entry) => entry.fullName === token.text);
    const blockPathMatches = blocks.filter((entry) => entry.block.path === token.text);
    const blockNameMatches = blocks.filter((entry) => entry.block.name === token.text);
    const blockMatch =
      blockFullMatches[0] ||
      (blockPathMatches.length === 1 ? blockPathMatches[0] : undefined) ||
      (blockNameMatches.length === 1 ? blockNameMatches[0] : undefined);
    if (blockMatch) {
      return new vscode.Location(
        blockMatch.uri,
        new vscode.Range(
          blockMatch.block.startLine,
          blockMatch.block.nameStart,
          blockMatch.block.startLine,
          blockMatch.block.nameEnd
        )
      );
    }

    return undefined;
  }
}

class SdkprfSemanticTokensProvider {
  constructor(index) {
    this.index = index;
  }

  async provideDocumentSemanticTokens(document) {
    const text = document.getText();
    const parsed = parseText(text);
    const scannerTokens = scanWordTokens(text);

    const definitions = new Set();
    for (const rule of parsed.rules) {
      definitions.add(`${rule.line}:${rule.nameStart}`);
    }
    for (const block of parsed.blocks) {
      definitions.add(`${block.startLine}:${block.nameStart}`);
    }

    const localRuleNames = new Set();
    for (const rule of parsed.rules) {
      localRuleNames.add(rule.name);
      localRuleNames.add(rule.path);
    }

    const localBlockNames = new Set();
    for (const block of parsed.blocks) {
      localBlockNames.add(block.name);
      localBlockNames.add(block.path);
    }

    const workspaceRules = await this.index.getRules();
    const workspaceBlocks = await this.index.getBlocks();
    const workspaceRuleNames = new Set(workspaceRules.map((entry) => entry.fullName));
    const workspaceBlockNames = new Set(workspaceBlocks.map((entry) => entry.fullName));
    const importLines = parsed.lines.map((line) => /^\s*import\b/.test(line));

    const builder = new vscode.SemanticTokensBuilder(SEMANTIC_LEGEND);
    for (const token of scannerTokens) {
      if (definitions.has(`${token.line}:${token.start}`)) {
        continue;
      }
      if (importLines[token.line] || KEYWORD_INFO[token.text]) {
        continue;
      }
      if (/^u[gbrc]\d/.test(token.text) || /^_[\p{L}\p{N}_]+_$/u.test(token.text)) {
        continue;
      }
      if (isMetaVariableAt(parsed.lines[token.line], token.start, token.end)) {
        continue;
      }

      if (localRuleNames.has(token.text) || workspaceRuleNames.has(token.text)) {
        builder.push(token.line, token.start, token.text.length, 0, 0);
      } else if (localBlockNames.has(token.text) || workspaceBlockNames.has(token.text)) {
        builder.push(token.line, token.start, token.text.length, 1, 0);
      }
    }

    return builder.build();
  }
}

class SdkprfDocumentSymbolProvider {
  provideDocumentSymbols(document) {
    const parsed = parseText(document.getText());

    const lineLength = (line) => {
      const safe = Math.min(Math.max(line, 0), document.lineCount - 1);
      return document.lineAt(safe).range.end.character;
    };

    const symbolFor = (node) => {
      if (node.type === 'block') {
        const range = new vscode.Range(
          node.startLine,
          0,
          node.endLine,
          lineLength(node.endLine)
        );
        const selectionRange = blockSelectionRange(document, node);
        const symbol = new vscode.DocumentSymbol(
          node.name,
          node.kind,
          node.kind === 'intro' ? vscode.SymbolKind.Module : vscode.SymbolKind.Namespace,
          range,
          selectionRange
        );
        symbol.children = node.children
          .slice()
          .sort((a, b) => (a.type === 'block' ? a.startLine : a.line) - (b.type === 'block' ? b.startLine : b.line))
          .map(symbolFor);
        return symbol;
      }

      const line = Math.min(node.line, document.lineCount - 1);
      const endLine = Math.min(
        Math.max(node.endLine ?? node.line, line),
        document.lineCount - 1
      );
      const range = new vscode.Range(line, 0, endLine, lineLength(endLine));
      const symbol = new vscode.DocumentSymbol(
        node.name,
        node.depth > 0 ? `Rule · depth ${node.depth}` : 'Rule',
        vscode.SymbolKind.Function,
        range,
        ruleSelectionRange(document, node)
      );
      symbol.children = [];
      return symbol;
    };

    const roots = [...parsed.rootBlocks, ...parsed.rootRules].sort((a, b) => {
      const aLine = a.type === 'block' ? a.startLine : a.line;
      const bLine = b.type === 'block' ? b.startLine : b.line;
      return aLine - bLine;
    });

    return roots.map(symbolFor);
  }
}

class SdkprfFoldingProvider {
  provideFoldingRanges(document) {
    const parsed = parseText(document.getText());
    return parsed.blocks
      .filter((block) => block.endLine > block.startLine)
      .map(
        (block) =>
          new vscode.FoldingRange(
            block.startLine,
            block.endLine,
            vscode.FoldingRangeKind.Region
          )
      );
  }
}

function updateDiagnostics(document) {
  if (document.languageId !== LANGUAGE_ID) {
    return;
  }

  const parsed = parseText(document.getText());
  const items = parsed.errors.map((error) => {
    const line = Math.min(Math.max(error.line, 0), document.lineCount - 1);
    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(line, 0, line, document.lineAt(line).text.length),
      error.message,
      vscode.DiagnosticSeverity.Warning
    );
    diagnostic.source = 'sdkprf';
    return diagnostic;
  });
  diagnostics.set(document.uri, items);
}

function activate(context) {
  const index = new WorkspaceIndex();
  const rainbow = new RainbowBrackets();

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      SELECTOR,
      new SdkprfCompletionProvider(index),
      '.',
      '(',
      '\\'
    ),
    vscode.languages.registerHoverProvider(SELECTOR, new SdkprfHoverProvider(index)),
    vscode.languages.registerDefinitionProvider(SELECTOR, new SdkprfDefinitionProvider(index)),
    vscode.languages.registerDocumentSemanticTokensProvider(
      SELECTOR,
      new SdkprfSemanticTokensProvider(index),
      SEMANTIC_LEGEND
    ),
    vscode.languages.registerDocumentSymbolProvider(SELECTOR, new SdkprfDocumentSymbolProvider()),
    vscode.languages.registerFoldingRangeProvider(SELECTOR, new SdkprfFoldingProvider()),
    vscode.commands.registerCommand('sdkprf.reindex', async () => {
      await index.rebuild();
      vscode.window.showInformationMessage('Sodukuvania: rule index rebuilt');
    }),
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (document.languageId === LANGUAGE_ID) {
        index.rebuild();
        updateDiagnostics(document);
      }
    }),
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (document.languageId === LANGUAGE_ID) {
        updateDiagnostics(document);
        rainbow.updateDocument(document);
      }
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.languageId === LANGUAGE_ID) {
        diagnostics.delete(event.document.uri);
        applyLatexInput(event);
        rainbow.updateDocument(event.document);
      }
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        rainbow.update(editor);
      }
    }),
    vscode.window.onDidChangeVisibleTextEditors(() => {
      rainbow.refreshVisible();
    }),
    vscode.window.onDidChangeActiveColorTheme(() => {
      rainbow.rebuildTypes();
      rainbow.refreshVisible();
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('sdkprf.rainbowBrackets.enabled')) {
        rainbow.refreshVisible();
      }
      if (event.affectsConfiguration('sdkprf.rainbowBrackets.palette')) {
        rainbow.rebuildTypes();
        rainbow.refreshVisible();
      }
    }),
    vscode.workspace.onDidCloseTextDocument((document) => {
      diagnostics.delete(document.uri);
    }),
    vscode.workspace.onDidCreateFiles(() => {
      index.rebuild();
    }),
    vscode.workspace.onDidDeleteFiles(() => {
      index.rebuild();
    }),
    vscode.workspace.onDidRenameFiles(() => {
      index.rebuild();
    }),
    rainbow,
    diagnostics
  );

  for (const document of vscode.workspace.textDocuments) {
    if (document.languageId === LANGUAGE_ID) {
      updateDiagnostics(document);
    }
  }

  rainbow.refreshVisible();
}

function deactivate() {
  diagnostics.dispose();
}

module.exports = { activate, deactivate };
