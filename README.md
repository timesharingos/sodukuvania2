# Sodukuvania2

This is the English translation of the `.sdkprf` language specification maintained in
[`proof/syntax.txt`](proof/syntax.txt).

## Contents

- [1. Basic format](#1-basic-format)
- [2. Variables](#2-variables)
- [3. Coordinates](#3-coordinates)
- [4. Rule blocks](#4-rule-blocks)
- [5. Other notation](#5-other-notation)
- [6. Predefined rules](#6-predefined-rules)
- [7. Modularity](#7-modularity)
- [Editor support](#editor-support)
- [GitHub configuration](#github-configuration)

## 1. Basic format

A rule has the form:

```text
<rule_name>: premises... => <expr> [with_clause...]
```

A `with` clause has the form:

```text
(with (<rule>|<ref>|<stat>) [by <meta_var>=<value>...])
```

A premise may take one of the following forms:

```text
<stat> [with_clause...]              // <stat> is evidenced by <with_clause>
<ref_name> [with_clause]             // <ref_name> is substituted according to <with_clause>
"[" <stat> [with_clause...] "]"      // implicit <stat> form
"[" <ref_name> [with_clause...] "]"  // implicit <ref_name> form
```

`<stat>` is a regular logical expression.  
`<ref_name>` is some `<rule_name>`.

Expressions marked with `[` `]` are implicit-verification expressions. They may be omitted when
writing, but they must be verifiable via `with given` / `with axioms` / `with known`.

The scope of `with` is the rule it governs. It is only responsible for the `|-` of the rule itself;
premises must supply their own `with` (except in the `<ref_name>` form).

A premise without a `with` clause is treated as a condition. A premise with a `with` clause is
treated as an evidence reference. Only premises that consist entirely of `with` clauses (or empty
premises) are treated as an inference process; otherwise the rule is an inference rule. There is one
boundary case: when a `with` clause is attached to an inference rule, the rule is still treated as
an inference rule.

A premise may be referenced as:

```text
<ref_name>.<idx>
```

This refers to the `<idx>`-th premise of `<ref_name>`; the result is treated as a `<stat>`.

## 2. Variables

A variable may be written as `$<name>` or `_<name>_`. The two forms differ only in spelling; the
name is the actual ID.

Substitution rule: all variables with the same name are replaced.

Variables that are not fully bound in `with by` remain in the premises and can be referenced later.
`$<nat>` is a special variable. It is implicitly converted to
`$<rule_name>-<premises_idx>-<nat>` and is used as a filler for unrelated variable bindings.

## 3. Coordinates

The fixed form is `<prefix><scope><index>...`; it denotes all coordinates that satisfy the
constraint. The available scopes are:

- `g`: grid — a minimal board;
- `b`: block — a region (including boxes and irregular regions);
- `r`: row — a row;
- `c`: column — a column.

The available prefixes are:

- `u`: universe — a global coordinate.

## 4. Rule blocks

There are two ways to create rule blocks: conditional blocks and set blocks.

A conditional block has the form:

```text
intro <name>: <premises>
    <prefix_dash> <rule>...
end <name>
```

A set block has the form:

```text
section <name>:
    <prefix_dash> <rule>...
end <name>
```

`<prefix_dash>` is a sequence of dashes `-`; the number of dashes equals the level of the block it
belongs to.

When a block is referenced, its rules automatically receive a `<name>.` prefix on the original
`<rule_name>`. Nesting is allowed.

Name resolution follows local shadowing.

When a conditional block is referenced from outside, the rules introduced by each `intro` at its
level are automatically added to the premises.

## 5. Other notation

| Notation | Meaning |
| --- | --- |
| `=` | fill in a number |
| `=?` | candidate set |
| `==` | object content equality (coordinates, values, etc.) |
| `:=` | structured binding, used as a shorthand for a set |

`=` and `=?` automatically perform flattening, and wrap a single element automatically.

Any of these markers may be prefixed with `!` to mean negation. For example, `!=` means the number
cannot be filled in, and `!==` means object contents are not equal.

## 6. Predefined rules

- `with given`: known rules and board givens;
- `with axioms`: basic mathematics, game-independent pure-mathematical proofs;
- `with known`: geometric relations;
- `unlock <region>`: reveal a fog-of-war region.
Basic mathematical symbols may be used freely.

## 7. Modularity

Modules are divided by directory and file name; names are case-sensitive and use the `.sdkprf`
suffix.

```text
import <folder1>.<folder2>...<sdkprf_main_name>
```

There is no permission control; everything is exported, and full-name prefixes are added
automatically.

## Editor support

`.sdkprf` syntax highlighting and language support for VS Code lives in
[`editors/vscode-sdkprf`](editors/vscode-sdkprf/README.md). It provides TextMate highlighting,
completion, hover documentation, outline, folding, go-to-definition, LaTeX-style Unicode math input,
and rainbow brackets.

## GitHub configuration

To set up your new GitHub repository, follow these steps:

* Under your repository name, click **Settings**.
* In the **Actions** section of the sidebar, click "General".
* Check the box **Allow GitHub Actions to create and approve pull requests**.
* Click the **Pages** section of the settings sidebar.
* In the **Source** dropdown menu, select "GitHub Actions".

After following the steps above, you can remove this section from the README file.
