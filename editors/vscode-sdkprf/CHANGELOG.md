# Changelog

## 0.2.3

- Translated the extension README to English.
- Translated all user-facing strings to English: hover documentation, completion details and
  documentation, setting descriptions, command titles, diagnostics, snippets, and sample comments.
- No functional changes.

## 0.2.2

- Corrected the dash-level convention in the sample, snippets, and documentation: top-level blocks
  use `-`, nested blocks use `--`.
- Added multi-line rule support: continuation lines are merged into the rule signature, and hover,
  completion documentation, and the outline keep the complete rule.
- `range` in `by range=$range` is now treated as a meta-variable; it is no longer highlighted,
  hovered, or resolved as the rule named `range`.
- Updated the sample, README, and tests.

## 0.2.1

- Fixed `section` syntax: set blocks take only a name (`section <name>:`) and no premises. A
  structural diagnostic is reported if there is text after the `section` colon.
- Fixed dark-on-dark rainbow brackets: the default `accessible` palette selects high-contrast
  six-color sets for light and dark themes.
- Added the `sdkprf.rainbowBrackets.palette` setting (`accessible` / `theme`).
- Updated `proof/syntax.txt`, snippets, hover documentation, and the README.

## 0.2.0

- Added Lean/LaTeX-style Unicode math input: type a command such as `\to` and press Space or Tab to
  replace it; type `\` to open the symbol completion list.
- Added six-color rainbow brackets: `[]`, `()`, and `{}` use
  `editorBracketHighlight.foreground1..6` by nesting depth, with an unexpected-bracket color for
  unmatched closing brackets.
- Added the `sdkprf.unicodeInput.enabled` and `sdkprf.rainbowBrackets.enabled` settings.
- Turned off VS Code's native `editor.bracketPairColorization` for `[sdkprf]` by default to avoid
  overlapping bracket colors.
- Added headless tests for the symbol table, bracket scanner, and extension entry point, and
  rebuilt the package as `sdkprf-0.2.0.vsix`.

## 0.1.0

- Initial release: `.sdkprf` syntax highlighting, rule-name completion, hover, outline, folding,
  go-to-definition, structural diagnostics, and snippets.
