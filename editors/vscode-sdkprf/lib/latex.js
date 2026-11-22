'use strict';

/**
 * Lean/LaTeX-ish input abbreviations for the symbols used in .sdkprf proofs.
 *
 * Keys are the text after the backslash.  The extension uses this table in two
 * places:
 *   - typing "\to" and then space/tab replaces the command with "→";
 *   - typing "\" opens a completion list that replaces the typed command with
 *     the symbol directly.
 *
 * Add entries here to extend the input method.  Keep the values to a single
 * grapheme where possible; the auto-replacement leaves the typed whitespace in
 * place, so multi-character output would also work but is harder to edit.
 */
const LATEX_SYMBOLS = Object.freeze({
  // Greek, lower case
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  varepsilon: 'ε',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  vartheta: 'ϑ',
  iota: 'ι',
  kappa: 'κ',
  lambda: 'λ',
  lam: 'λ',
  mu: 'μ',
  nu: 'ν',
  xi: 'ξ',
  omicron: 'ο',
  pi: 'π',
  varpi: 'ϖ',
  rho: 'ρ',
  varrho: 'ϱ',
  sigma: 'σ',
  varsigma: 'ς',
  tau: 'τ',
  upsilon: 'υ',
  phi: 'ϕ',
  varphi: 'φ',
  chi: 'χ',
  psi: 'ψ',
  omega: 'ω',

  // Greek, upper case
  Gamma: 'Γ',
  Delta: 'Δ',
  Theta: 'Θ',
  Lambda: 'Λ',
  Xi: 'Ξ',
  Pi: 'Π',
  Sigma: 'Σ',
  Upsilon: 'Υ',
  Phi: 'Φ',
  Psi: 'Ψ',
  Omega: 'Ω',

  // Logic
  forall: '∀',
  all: '∀',
  exists: '∃',
  ex: '∃',
  nexists: '∄',
  neg: '¬',
  not: '¬',
  land: '∧',
  wedge: '∧',
  and: '∧',
  lor: '∨',
  vee: '∨',
  or: '∨',
  to: '→',
  rightarrow: '→',
  leftarrow: '←',
  gets: '←',
  leftrightarrow: '↔',
  iff: '↔',
  Rightarrow: '⇒',
  implies: '⇒',
  Leftarrow: '⇐',
  Leftrightarrow: '⇔',
  mapsto: '↦',
  hookrightarrow: '↪',
  uparrow: '↑',
  downarrow: '↓',
  Uparrow: '⇑',
  Downarrow: '⇓',
  longrightarrow: '⟶',
  longleftarrow: '⟵',
  longleftrightarrow: '⟷',
  Longrightarrow: '⟹',
  Longleftarrow: '⟸',
  Longleftrightarrow: '⟺',
  vdash: '⊢',
  dashv: '⊣',
  models: '⊨',
  top: '⊤',
  bot: '⊥',
  therefore: '∴',
  because: '∵',

  // Sets and order
  in: '∈',
  notin: '∉',
  ni: '∋',
  subseteq: '⊆',
  subset: '⊂',
  supseteq: '⊇',
  supset: '⊃',
  cup: '∪',
  cap: '∩',
  setminus: '∖',
  empty: '∅',
  emptyset: '∅',
  varnothing: '∅',
  bigcup: '⋃',
  bigcap: '⋂',
  sqcup: '⊔',
  sqcap: '⊓',
  uplus: '⊎',
  langle: '⟨',
  rangle: '⟩',
  lfloor: '⌊',
  rfloor: '⌋',
  lceil: '⌈',
  rceil: '⌉',
  mid: '∣',
  nmid: '∤',
  parallel: '∥',
  perp: '⊥',
  sqsubseteq: '⊑',
  sqsupseteq: '⊒',
  subsetneq: '⊊',
  supsetneq: '⊋',
  nsubseteq: '⊈',
  nsupseteq: '⊉',
  N: 'ℕ',
  Z: 'ℤ',
  Q: 'ℚ',
  R: 'ℝ',
  C: 'ℂ',
  NN: 'ℕ',
  ZZ: 'ℤ',
  QQ: 'ℚ',
  RR: 'ℝ',
  CC: 'ℂ',
  P: '℘',

  // Arithmetic and relations
  times: '×',
  div: '÷',
  pm: '±',
  mp: '∓',
  cdot: '·',
  cdots: '⋯',
  ldots: '…',
  dots: '…',
  sum: '∑',
  prod: '∏',
  coprod: '∐',
  int: '∫',
  iint: '∬',
  iiint: '∭',
  oint: '∮',
  bigoplus: '⨁',
  bigotimes: '⨂',
  sqrt: '√',
  infty: '∞',
  partial: '∂',
  nabla: '∇',
  le: '≤',
  leq: '≤',
  ge: '≥',
  geq: '≥',
  ne: '≠',
  neq: '≠',
  approx: '≈',
  equiv: '≡',
  sim: '∼',
  simeq: '≃',
  cong: '≅',
  propto: '∝',
  ll: '≪',
  gg: '≫',
  prec: '≺',
  succ: '≻',
  preceq: '⪯',
  succeq: '⪰',
  lesssim: '≲',
  gtrsim: '≳',
  triangleq: '≜',
  coloneq: '≔',
  doteq: '≐',
  asymp: '≍',
  bowtie: '⋈',
  vDash: '⊨',
  Vdash: '⊩',
  nvDash: '⊭',

  // Misc
  square: '□',
  qed: '□',
  blacksquare: '■',
  checkmark: '✓',
  degree: '°',
  deg: '°',
  angle: '∠',
  triangle: '△',
  diamond: '⋄',
  star: '⋆',
  ast: '∗',
  circ: '∘',
  bullet: '•',
  oplus: '⊕',
  ominus: '⊖',
  otimes: '⊗',
  oslash: '⊘',
  odot: '⊙',
  dagger: '†',
  ddagger: '‡',
  ell: 'ℓ',
  hbar: 'ℏ',
  Re: 'ℜ',
  Im: 'ℑ',
  aleph: 'ℵ',
  wp: '℘',
  prime: '′',
  norm: '‖',
  diff: 'Δ',
  grad: '∇',

  // A few Lean-ish aliases
  fun: 'λ',
  bool: '𝔹'
});

/**
 * Find a known "\command" immediately before `offset` in `line`.
 *
 * @param {string} line
 * @param {number} offset
 * @returns {{command: string, start: number, end: number, symbol: string} | undefined}
 */
function findLatexReplacement(line, offset) {
  const prefix = line.slice(0, offset);
  const match = /\\[A-Za-z]+$/.exec(prefix);
  if (!match) {
    return undefined;
  }

  const start = prefix.length - match[0].length;
  if (start > 0 && prefix[start - 1] === '\\') {
    return undefined;
  }

  const symbol = LATEX_SYMBOLS[match[0].slice(1)];
  if (!symbol) {
    return undefined;
  }

  return {
    command: match[0],
    start,
    end: prefix.length,
    symbol
  };
}

module.exports = { LATEX_SYMBOLS, findLatexReplacement };
