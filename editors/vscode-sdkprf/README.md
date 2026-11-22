# Sodukuvania Proof (VS Code Extension)

VS Code support for the semi-formal `.sdkprf` proof language described in `proof/syntax.txt`.
At its core is a TextMate grammar; on top of that the extension provides rule-name completion,
hover documentation, an outline, folding, go-to-definition, lightweight structural diagnostics,
LaTeX-style Unicode math input, and six-color rainbow brackets.

![language](https://img.shields.io/badge/language-.sdkprf-blue)

## Features

- **Syntax highlighting** for rule names, `intro` / `section` / `end` blocks, `import`, `unlock`,
  `with` / `by`, `given` / `axioms` / `known`, variables, coordinates, `=>` / `=?` / `:=` / `=`,
  math and set symbols, the `[ ]` implicit-verification marker, and comments.
- **LaTeX-style symbol input**: type `\to`, `\forall`, `\in`, etc. and press Space or Tab to get
  `→`, `∀`, `∈`; type `\` to open the full symbol completion list. See
  [Math symbol input](#math-symbol-input-latex-style).
- **Rainbow brackets**: `[]`, `()`, and `{}` are colored by nesting depth with six high-contrast
  colors that switch between dark and light themes; an unmatched closing bracket uses the
  "unexpected bracket" color. See [Rainbow brackets](#rainbow-brackets).
- **Rule-reference highlighting**: bare references such as `single_value` and
  `hidden.row_hidden` are highlighted with semantic tokens when they match a known rule or block.
- **Completion**:
  - keywords, `with` targets, and operators;
  - rule names and block-qualified names from the current file (e.g. `hidden.row_hidden`);
  - rules from other `.sdkprf` files in the workspace, with their module prefix;
  - module paths on `import` lines;
  - LaTeX symbol names after `\`.
- **Hover documentation**: keyword meanings, rule signatures and definition locations, block
  information, coordinate breakdowns, and variable explanations.
- **Outline / breadcrumbs**: rules grouped by their `intro` / `section` / `end` nesting.
- **Folding**: fold an entire `intro` / `section` block.
- **Go to definition**: Ctrl/Cmd + click a rule or block name, including across files.
- **Lightweight diagnostics**: check `end` / block-name mismatches on open and save, without
  interrupting normal typing.
- **Snippets**: `rule`, `intro`, `section`, `with`, `withby`, `import`, `unlock`, `implicit`,
  `candidate`, `value`, `bind`.

## Installation

### Option 1: Install the VSIX

The built package is `editors/vscode-sdkprf/sdkprf-0.2.3.vsix` (when present):

```powershell
code --install-extension "D:\project\sodukuvania-ast\editors\vscode-sdkprf\sdkprf-0.2.3.vsix"
```

You can also use **Extensions** → `...` → **Install from VSIX...** in VS Code.

### Option 2: Run as a development extension

Open this repository in VS Code and press `F5`. The `.vscode/launch.json` at the repository root
starts an Extension Development Host with this extension loaded and opens the sample directory.

Alternatively, start it manually:

```powershell
code --extensionDevelopmentPath="D:\project\sodukuvania-ast\editors\vscode-sdkprf"
```

### Option 3: Copy into the extensions directory

This is the most direct option, though it is not recommended for regular use. Copy the whole
`editors/vscode-sdkprf` folder to:

```text
%USERPROFILE%\.vscode\extensions\sodukuvania.sdkprf-0.2.3
```

Then restart VS Code. `.sdkprf` files are recognized as **Sodukuvania Proof**.

## Try the sample

`editors/vscode-sdkprf/samples/example.sdkprf` covers most of the syntax. Open it and try:

- hover over `with`, `given`, `=?`, or `ug1`;
- type `with (` or `hidden.` in a rule to trigger completion;
- type `\to` followed by Space, or type `\` and pick a symbol;
- watch the six colors on nested brackets such as `[uc1 =? {5}]`;
- press `Ctrl+Shift+O` to open the outline;
- `Ctrl+Click` on `single_value` or `hidden.row_hidden` to jump to its definition.

## Syntax coverage

| Syntax | Example | TextMate scope |
| --- | --- | --- |
| Rule definition | `single_value:` | `entity.name.function.rule.sdkprf` |
| Block header | `intro hidden:` / `section advanced:` | `keyword.control.block.sdkprf` + `entity.name.type.block.sdkprf` |
| Block end | `end hidden` | `keyword.control.block.end.sdkprf` |
| Level dashes | `  - rule:` (top-level block) / `    -- rule:` (nested block) | `punctuation.definition.depth.sdkprf` |
| Module import | `import sudoku.core` | `keyword.control.import.sdkprf` + `entity.name.namespace.import.sdkprf` |
| Unlock | `unlock ug1` | `keyword.control.unlock.sdkprf` |
| with clause | `(with given)` | `keyword.other.with.sdkprf` + `constant.language.with-target.sdkprf` |
| Meta-variable binding | `by total=6` | `keyword.other.by.sdkprf` |
| Variables | `$x`, `_y_` | `variable.other.dollar.sdkprf` / `variable.other.underscore.sdkprf` |
| Coordinates | `ug1`, `ub2`, `ur3`, `uc4` | `variable.other.coordinate.sdkprf` |
| Rule separator | `=>` | `keyword.operator.entailment.sdkprf` |
| Candidate set | `=?` | `keyword.operator.candidate.sdkprf` |
| Structured binding | `:=` | `keyword.operator.binding.sdkprf` |
| Implicit verification | `[stat]` | `punctuation.section.implicit.begin/end.sdkprf` |
| Comments | `// ...`, `/* ... */` | `comment.line.double-slash.sdkprf` / `comment.block.sdkprf` |

> `intro` blocks take `<name>: <premises>`; `section` blocks take only a name, written as
> `section <name>:`. If there is text after the `section` colon, the extension reports a
> structural diagnostic.
>
> The number of leading dashes equals the block level: `-` for a top-level block, `--` for a
> nested block. A rule may span multiple lines: subsequent lines that are indented deeper than the
> rule line are treated as continuation lines, and hover, completion documentation, and the outline
> preserve the full signature.

Math/logic symbols (`¬ ∧ ∨ → ↔ ∀ ∃ ∈ ∉ ⊆ ∪ ∩ ≠ ≤ ≥`, etc.) use
`keyword.operator.logical/set/math.sdkprf`. Greek letters use
`variable.other.greek.sdkprf`, and the number sets `ℕ ℤ ℚ ℝ ℂ 𝔹` use
`constant.language.number-set.sdkprf`. If a symbol is not highlighted, add its character to the
`operators` / `greek` / `number-sets` patterns in
`syntaxes/sdkprf.tmLanguage.json`.

## Math symbol input (LaTeX-style)

Type a LaTeX name directly in `.sdkprf` and press **Space** or **Tab**. The extension replaces the
command with the corresponding Unicode symbol:

```text
x \in A        =>   x ∈ A
\forall x, ... =>   ∀ x, ...
A \subseteq B  =>   A ⊆ B
```

You can also type just `\` and choose from the completion list. Accepting an item replaces the whole
`\command`:

| Input | Result | Input | Result | Input | Result |
| --- | --- | --- | --- | --- | --- |
| `\to` | → | `\forall` | ∀ | `\exists` | ∃ |
| `\and` | ∧ | `\or` | ∨ | `\not` | ¬ |
| `\in` | ∈ | `\notin` | ∉ | `\subseteq` | ⊆ |
| `\cup` | ∪ | `\cap` | ∩ | `\emptyset` | ∅ |
| `\le` / `\leq` | ≤ | `\ge` / `\geq` | ≥ | `\ne` / `\neq` | ≠ |
| `\approx` | ≈ | `\equiv` | ≡ | `\infty` | ∞ |
| `\R` | ℝ | `\N` | ℕ | `\Z` | ℤ |
| `\lambda` | λ | `\vdash` | ⊢ | `\models` | ⊨ |
| `\langle` | ⟨ | `\rangle` | ⟩ | `\qed` | □ |

The full table is in [`lib/latex.js`](lib/latex.js). A command preceded by another backslash
(for example `\\to`) is not replaced, so literal text can be preserved.

- Disable with `sdkprf.unicodeInput.enabled` set to `false`.
- Add a symbol by adding one line to `LATEX_SYMBOLS` in `lib/latex.js`, for example
  `"therefore2": "∴"`; completion and auto-replacement pick it up automatically.
- Auto-replacement only fires when the cursor is directly after a complete command and a Space or
  Tab has just been typed. It does not modify existing text.

## Rainbow brackets

`[]`, `()`, and `{}` cycle through six colors by nesting depth. An unmatched closing bracket uses
the "unexpected bracket" color. Brackets inside comments and strings are not colored.

By default the extension uses the `accessible` palette: it selects a high-contrast color set based
on whether the current theme is dark or light, avoiding dark-on-dark brackets. You can also follow
the theme exactly:

```jsonc
// settings.json
{
  "sdkprf.rainbowBrackets.palette": "theme"
}
```

- `accessible` (default): dark themes use bright gold/purple/blue/orange/green/coral; light themes
  use the corresponding darker variants.
- `theme`: use `editorBracketHighlight.foreground1` … `foreground6`. If those colors are too dark
  in a custom theme, keep the default `accessible`.

For example:

```sdkprf
single_value: [uc1 =? {5}] => uc1 = 5
```

Here `[` and `]` are depth 0, while `{` and `}` are depth 1, so they receive different colors.

- Disable with `sdkprf.rainbowBrackets.enabled` set to `false`.
- Choose the palette with `sdkprf.rainbowBrackets.palette`: `accessible` (default) or `theme`.
- The extension uses `configurationDefaults` to turn off VS Code's native
  `editor.bracketPairColorization` for `[sdkprf]`, avoiding two sets of bracket colors. If you
  disable this extension's rainbow brackets but still want native colors, set it back to `true`.
- Native `editor.matchBrackets` (matching-bracket highlight at the cursor) is unaffected.

## Comment convention

`proof/syntax.txt` does not define comment syntax. This extension uses:

- line comments: `//`
- block comments: `/* ... */`

It does not use `--` because a leading `--` already denotes a level-2 rule line. To switch to a
different comment marker, update:

1. `comments` in `language-configuration.json`;
2. `repository.comments` in `syntaxes/sdkprf.tmLanguage.json`;
3. the comment scanners in `lib/parser.js` and `lib/scan.js` (if the marker is not `//` / `/* */`).

## Known limitations and assumptions

This is an editor-assistance extension, not a semantic verifier. It does not check whether the
premises actually entail the conclusion, and it is not a replacement for a Lean backend or proof
checker.

- The language is semi-formal, and the grammar is line/token-oriented. Bare identifiers cannot be
  distinguished syntactically between a `<ref_name>` and an ordinary mathematical term. Rule
  references are therefore highlighted by **matching known definition names**; a bare name is only
  colored when it matches a known rule or block.
- Blocks are nested by `end`, not by indentation. The leading dash count is highlighted but not
  validated.
- Coordinates are implemented as `u` + `g/b/r/c` + digits, including concatenations such as
  `ug1ur2`. If indices can contain letters, adjust the `coordinates` pattern in
  `syntaxes/sdkprf.tmLanguage.json`.
- Candidate sets after `=?` are currently treated as ordinary `{1, 2, 3}` punctuation.
- Strings `"..."` are supported optionally (the language specification does not define strings)
  and do not interfere with the `[ ]` implicit-verification marker.
- The completion index scans at most 500 `.sdkprf` files and excludes the extension's own `test/`
  and `samples/` directories.
- The LaTeX input table covers common math/logic symbols, not all of LaTeX. Commands with
  arguments such as `\mathbb{R}` are not supported; use `\R` instead. The table is a plain text
  mapping; no KaTeX/MathJax is involved.
- Rainbow brackets use the built-in `accessible` high-contrast palette by default and do not depend
  on the theme's bracket-highlight colors. With `palette: "theme"` they use
  `editorBracketHighlight.*`; a custom theme without those colors may fall back to the default
  foreground.

## Development

```powershell
cd editors/vscode-sdkprf
npm install
npm test        # parser + scanner + brackets + latex + TextMate tokenizer + extension smoke
npm run package # requires @vscode/vsce; produces sdkprf-0.2.3.vsix
```

- `npm test` tokenizes `samples/example.sdkprf` with `vscode-textmate` + `vscode-oniguruma`, so
  grammar regex changes are covered by regression tests.
- After changing `syntaxes/sdkprf.tmLanguage.json`, run `npm test` to verify the scope assertions.
- After changing completion, hover, outline, symbol input, or rainbow logic, press `F5` and verify
  in the Extension Development Host.
- See [`CHANGELOG.md`](CHANGELOG.md) for version history.

## File layout

```text
editors/vscode-sdkprf/
├── package.json                     # extension manifest
├── extension.js                     # completion / hover / definition / outline / folding /
│                                    # diagnostics / symbol input / rainbow brackets
├── language-configuration.json      # brackets, comments, indentation
├── syntaxes/sdkprf.tmLanguage.json  # TextMate grammar
├── snippets/sdkprf.json             # code snippets
├── lib/parser.js                    # tolerant structural parser
├── lib/scan.js                      # comment/string-aware token scanner
├── lib/brackets.js                  # bracket nesting scanner (rainbow)
├── lib/latex.js                     # LaTeX command -> Unicode symbol table
├── samples/example.sdkprf           # example
└── test/                            # headless tests
```
