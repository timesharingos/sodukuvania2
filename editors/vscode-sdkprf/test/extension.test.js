'use strict';

/**
 * Headless smoke test for the extension entry point.  VS Code itself is not
 * available from plain Node, so this file installs a small mock of the API
 * surface used by extension.js.  It catches missing exports, bad enums and
 * provider exceptions without launching an Extension Development Host.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');

class Position {
  constructor(line, character) {
    this.line = line;
    this.character = character;
  }
}

class Range {
  constructor(startLine, startCharacter, endLine, endCharacter) {
    if (startLine instanceof Position) {
      this.start = startLine;
      this.end = startCharacter;
    } else {
      this.start = new Position(startLine, startCharacter);
      this.end = new Position(endLine, endCharacter);
    }
  }
}

class MarkdownString {
  constructor(value) {
    this.value = value;
  }
}

class Hover {
  constructor(contents, range) {
    this.contents = contents;
    this.range = range;
  }
}

class Location {
  constructor(uri, range) {
    this.uri = uri;
    this.range = range;
  }
}

class CompletionItem {
  constructor(label, kind) {
    this.label = label;
    this.kind = kind;
  }
}

class Diagnostic {
  constructor(range, message, severity) {
    this.range = range;
    this.message = message;
    this.severity = severity;
  }
}

class SemanticTokensLegend {
  constructor(tokenTypes, tokenModifiers) {
    this.tokenTypes = tokenTypes;
    this.tokenModifiers = tokenModifiers;
  }
}

class SemanticTokensBuilder {
  constructor(legend) {
    this.legend = legend;
    this.data = [];
  }

  push(line, start, length, tokenType, tokenModifiers) {
    this.data.push(line, start, length, tokenType, tokenModifiers);
  }

  build() {
    return { data: this.data };
  }
}

class FoldingRange {
  constructor(start, end, kind) {
    this.start = start;
    this.end = end;
    this.kind = kind;
  }
}

class DocumentSymbol {
  constructor(name, detail, kind, range, selectionRange) {
    this.name = name;
    this.detail = detail;
    this.kind = kind;
    this.range = range;
    this.selectionRange = selectionRange;
    this.children = [];
  }
}

class ThemeColor {
  constructor(id) {
    this.id = id;
  }
}

const disposable = () => ({ dispose() {} });
const providers = {};
const handlers = { changeText: [], visibleEditors: [], theme: [] };
const decorationOptions = [];
const diagnostics = { values: new Map(), set(uri, items) { this.values.set(uri, items); }, delete(uri) { this.values.delete(uri); }, dispose() {} };

const vscode = {
  Position,
  Range,
  MarkdownString,
  Hover,
  Location,
  CompletionItem,
  Diagnostic,
  SemanticTokensLegend,
  SemanticTokensBuilder,
  FoldingRange,
  DocumentSymbol,
  ThemeColor,
  CompletionItemKind: {
    Function: 2,
    Module: 8,
    Keyword: 13,
    Constant: 20,
    Operator: 23
  },
  DiagnosticSeverity: { Warning: 1 },
  SymbolKind: { Module: 1, Namespace: 2, Function: 11 },
  FoldingRangeKind: { Region: 3 },
  ColorThemeKind: {
    Light: 1,
    Dark: 2,
    HighContrast: 3,
    HighContrastLight: 4
  },
  languages: {
    createDiagnosticCollection: () => diagnostics,
    registerCompletionItemProvider: (selector, provider) => {
      providers.completion = provider;
      return disposable();
    },
    registerHoverProvider: (selector, provider) => {
      providers.hover = provider;
      return disposable();
    },
    registerDefinitionProvider: (selector, provider) => {
      providers.definition = provider;
      return disposable();
    },
    registerDocumentSemanticTokensProvider: (selector, provider) => {
      providers.semantic = provider;
      return disposable();
    },
    registerDocumentSymbolProvider: (selector, provider) => {
      providers.symbols = provider;
      return disposable();
    },
    registerFoldingRangeProvider: (selector, provider) => {
      providers.folding = provider;
      return disposable();
    }
  },
  commands: {
    registerCommand: () => disposable()
  },
  window: {
    showInformationMessage: () => undefined,
    visibleTextEditors: [],
    activeTextEditor: undefined,
    activeColorTheme: { kind: 2 },
    createTextEditorDecorationType: (options) => {
      decorationOptions.push(options);
      return disposable();
    },
    onDidChangeActiveTextEditor: () => disposable(),
    onDidChangeVisibleTextEditors: (handler) => {
      handlers.visibleEditors.push(handler);
      return disposable();
    },
    onDidChangeActiveColorTheme: (handler) => {
      handlers.theme.push(handler);
      return disposable();
    }
  },
  workspace: {
    textDocuments: [],
    findFiles: async () => [],
    asRelativePath: (uri) => uri.fsPath,
    fs: { readFile: async () => new Uint8Array() },
    getConfiguration: () => ({ get: (key, defaultValue) => defaultValue }),
    onDidSaveTextDocument: () => disposable(),
    onDidOpenTextDocument: () => disposable(),
    onDidChangeTextDocument: (handler) => {
      handlers.changeText.push(handler);
      return disposable();
    },
    onDidCloseTextDocument: () => disposable(),
    onDidChangeConfiguration: () => disposable(),
    onDidCreateFiles: () => disposable(),
    onDidDeleteFiles: () => disposable(),
    onDidRenameFiles: () => disposable()
  }
};

const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
  if (request === 'vscode') {
    return vscode;
  }
  return originalLoad.call(this, request, parent, isMain);
};

const extension = require('../extension');

function makeDocument(text) {
  const lines = text.split('\n');

  const offsetAt = (line, character) => {
    let offset = 0;
    for (let i = 0; i < line; i += 1) {
      offset += lines[i].length + 1;
    }
    return offset + character;
  };

  return {
    languageId: 'sdkprf',
    uri: { fsPath: 'memory.sdkprf', toString: () => 'memory.sdkprf' },
    lineCount: lines.length,
    getText(range) {
      if (!range) {
        return text;
      }
      return text.slice(offsetAt(range.start.line, range.start.character), offsetAt(range.end.line, range.end.character));
    },
    lineAt(line) {
      const value = lines[line];
      return {
        text: value,
        range: new Range(line, 0, line, value.length)
      };
    }
  };
}

async function main() {
  const context = { subscriptions: [] };
  extension.activate(context);
  assert(providers.completion, 'completion provider should be registered');
  assert(providers.hover, 'hover provider should be registered');
  assert(providers.definition, 'definition provider should be registered');
  assert(providers.semantic, 'semantic token provider should be registered');
  assert(providers.symbols, 'symbol provider should be registered');
  assert(providers.folding, 'folding provider should be registered');

  const text = fs.readFileSync(path.join(__dirname, '..', 'samples', 'example.sdkprf'), 'utf8');
  const document = makeDocument(text);
  const lines = text.split('\n');
  const ruleLine = lines.findIndex((line) => line.startsWith('single_value:'));
  const refLine = lines.findIndex((line) => line.startsWith('use_single:'));
  assert(ruleLine >= 0 && refLine >= 0);

  const completion = await providers.completion.provideCompletionItems(document, new Position(ruleLine, 0));
  assert(Array.isArray(completion), 'completion should return an array');
  assert(completion.some((item) => item.label === 'given'), 'keyword completion should include given');
  assert(completion.some((item) => item.label === 'single_value'), 'rule completion should include local rules');

  const hover = await providers.hover.provideHover(document, new Position(ruleLine, 3));
  assert(hover instanceof Hover, 'hover should return a Hover');
  assert(hover.contents.value.includes('Rule'), 'rule hover should include a rule description');

  const definition = await providers.definition.provideDefinition(document, new Position(refLine, 13));
  assert(definition instanceof Location, 'definition should resolve a local rule reference');

  const symbols = providers.symbols.provideDocumentSymbols(document);
  assert(symbols.length >= 2, 'outline should contain top-level symbols');

  const folding = providers.folding.provideFoldingRanges(document);
  assert(folding.length >= 2, 'folding should contain the two blocks');

  const semantic = await providers.semantic.provideDocumentSemanticTokens(document);
  assert(semantic.data.length > 0, 'semantic tokens should highlight rule references');

  const latexDocument = makeDocument('abbrev: \\to');
  const latexCompletion = await providers.completion.provideCompletionItems(
    latexDocument,
    new Position(0, 'abbrev: \\to'.length)
  );
  assert(
    latexCompletion.some((item) => item.label === '\\to' && item.insertText === '→'),
    'typing a backslash command should offer its Unicode replacement'
  );

  // "by range=..." binds a meta variable; it must not be treated as the rule
  // named "range" by hover or go-to-definition.
  const metaText = '  - use: range (with range by range=$range) => q';
  const metaDocument = makeDocument(
    ['section s:', '  - range: p => q', metaText, 'end s'].join('\n')
  );
  const metaPosition = new Position(2, metaText.indexOf('by range=') + 3);
  const metaHover = await providers.hover.provideHover(metaDocument, metaPosition);
  assert(metaHover instanceof Hover, 'meta variable hover should exist');
  assert(
    metaHover.contents.value.includes('by meta-variable'),
    'meta variable should be documented as a by-binding, not a rule'
  );
  const metaDefinition = await providers.definition.provideDefinition(
    metaDocument,
    metaPosition
  );
  assert.strictEqual(metaDefinition, undefined, 'meta variable should not jump to a rule');

  // Simulate "\to" followed by a space: the handler should replace only the
  // command and leave the inserted space alone.
  const inputDocument = makeDocument('x = \\to ');
  const edits = [];
  vscode.window.activeTextEditor = {
    document: inputDocument,
    edit(callback) {
      callback({
        replace(range, symbol) {
          edits.push({ range, symbol });
        }
      });
      return Promise.resolve(true);
    }
  };
  assert.strictEqual(handlers.changeText.length > 0, true, 'change handler should be registered');
  handlers.changeText[0]({
    document: inputDocument,
    contentChanges: [
      {
        range: new Range(0, 7, 0, 7),
        rangeLength: 0,
        text: ' '
      }
    ]
  });
  vscode.window.activeTextEditor = undefined;
  assert.strictEqual(edits.length, 1, 'one symbol replacement should be queued');
  assert.strictEqual(edits[0].symbol, '→');
  assert.strictEqual(edits[0].range.start.character, 4);
  assert.strictEqual(edits[0].range.end.character, 7);

  // Rainbow brackets should set seven decoration groups (6 colors + unexpected)
  // for a visible sdkprf editor.
  const decorationCalls = [];
  vscode.window.visibleTextEditors = [
    {
      document: {
        languageId: 'sdkprf',
        getText: () => '([{}])'
      },
      setDecorations(type, ranges) {
        decorationCalls.push({ type, ranges });
      }
    }
  ];
  assert(handlers.visibleEditors.length > 0, 'visible editor handler should be registered');
  handlers.visibleEditors[0]();
  vscode.window.visibleTextEditors = [];
  assert.strictEqual(decorationCalls.length, 7, 'rainbow brackets should touch 7 decoration types');
  assert(
    decorationCalls.some((call) => call.ranges.length > 0),
    'rainbow brackets should decorate at least one bracket'
  );

  // The accessible palette must switch when the theme changes from dark to
  // light; this is the fix for dark-on-dark brackets.
  assert(
    decorationOptions.slice(0, 7).some((options) => options.color === '#FFD700'),
    'dark themes should use the bright accessible palette'
  );
  const lightDecorationStart = decorationOptions.length;
  vscode.window.activeColorTheme.kind = 1; // ColorThemeKind.Light
  assert(handlers.theme.length > 0, 'active color theme handler should be registered');
  handlers.theme[0]();
  const lightColors = decorationOptions
    .slice(lightDecorationStart)
    .map((options) => options.color);
  assert(lightColors.includes('#9A6700'), 'light themes should use the dark accessible palette');
  assert(!lightColors.includes('#FFD700'), 'light themes must not reuse dark-theme colors');

  extension.deactivate();
  console.log('extension smoke tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
