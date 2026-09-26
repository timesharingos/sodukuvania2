import Mathlib.Data.Fin.Basic
import Mathlib.Data.Finset.Basic
import Mathlib.Data.Fintype.Basic
import Mathlib.Data.Finset.Card
import Mathlib.Data.Finset.Max

/-!
  It seems that Finset introduces Classical.choice, and it is likely that
  all the possible "non-constructive parts" come from there.
  I would keep the Finset implementation as a compromise,
  but the constructive feature is not guaranteed.
  If I should have free time in the future or this were truly to affect the constructive features,
  I would replace it with the constructive design.
-/

abbrev Wrapperset (α : Type) [DecidableEq α] := Finset α
namespace Wrapperset
export Finset (
  card_eq_one card_pos min'_mem card_erase_of_mem singleton_inj card_singleton
  Subset.refl
)
end Wrapperset

structure Dims where
  un : Nat
  um : Nat
  gc : Nat
  gn : Nat
  gm : Nat
  rc : Nat
  rn : Nat
  rm : Nat

inductive Letter where
  | a | b | c | d | e | f | g | h | i | j | k | l | m
  | n | o | p | q | r | s | t | u | v | w | x | y | z
deriving DecidableEq, Repr

instance : Fintype Letter where
  elems := {.a, .b, .c, .d, .e, .f, .g, .h, .i, .j, .k, .l, .m,
            .n, .o, .p, .q, .r, .s, .t, .u, .v, .w, .x, .y, .z}
  complete := by
    intro char
    cases char <;> simp

def Letter.toNat : Letter → Nat
  | .a => 0  | .b => 1  | .c => 2  | .d => 3  | .e => 4
  | .f => 5  | .g => 6  | .h => 7  | .i => 8  | .j => 9
  | .k => 10 | .l => 11 | .m => 12 | .n => 13 | .o => 14
  | .p => 15 | .q => 16 | .r => 17 | .s => 18 | .t => 19
  | .u => 20 | .v => 21 | .w => 22 | .x => 23 | .y => 24
  | .z => 25

theorem Letter.toNat_injective : Function.Injective Letter.toNat := by
  decide

instance : LinearOrder Letter where
  le fa fb := Nat.le fa.toNat fb.toNat
  le_refl fa := Nat.le_refl fa.toNat
  le_trans _ _ _ h1 h2 := Nat.le_trans h1 h2
  le_antisymm _ _ h1 h2 := Letter.toNat_injective (Nat.le_antisymm h1 h2)
  le_total fa fb := Nat.le_total fa.toNat fb.toNat
  toDecidableLE fa fb := Nat.decLe fa.toNat fb.toNat

def Sum.toInt : Fin 10 ⊕ Letter → Int
  | .inl n => (n : Int)
  | .inr fl => -((fl.toNat : Int) + 1)

theorem Sum.toInt_injective : Function.Injective Sum.toInt := by
  intro a b h
  cases a <;> cases b <;> simp only [Sum.toInt, inl.injEq, inr.injEq, reduceCtorEq] at h ⊢
  · exact Fin.ext (by omega)
  · omega
  · omega
  · rename_i l₁ l₂
    exact Letter.toNat_injective (by omega)

instance : LinearOrder (Fin 10 ⊕ Letter) where
  le a b := Sum.toInt a ≤ Sum.toInt b
  le_refl a := Int.le_refl _
  le_trans _ _ _ := Int.le_trans
  le_antisymm a b h1 h2 := Sum.toInt_injective (Int.le_antisymm h1 h2)
  le_total a b := Int.le_total _ _
  toDecidableLE a b := Int.decLe _ _

def Char.toLetter? (c : Char) : Option Letter :=
  match c with
  | 'a' => some .a | 'b' => some .b | 'c' => some .c
  | 'd' => some .d | 'e' => some .e | 'f' => some .f
  | 'g' => some .g | 'h' => some .h | 'i' => some .i
  | 'j' => some .j | 'k' => some .k | 'l' => some .l
  | 'm' => some .m | 'n' => some .n | 'o' => some .o
  | 'p' => some .p | 'q' => some .q | 'r' => some .r
  | 's' => some .s | 't' => some .t | 'u' => some .u
  | 'v' => some .v | 'w' => some .w | 'x' => some .x
  | 'y' => some .y | 'z' => some .z
  | _   => none

structure Cell (dims : Dims) where
  ucord : Fin dims.un × Fin dims.um
  region : Fin dims.rc
  regioncord : Fin dims.rn × Fin dims.rm
deriving DecidableEq

class Region
  (R : Type) (dims : Dims) (gid : Nat) [DecidableEq R]
where
  rid : R → Nat
  validextra :
    List (Cell dims) → Prop

structure Grid (dims : Dims)
where
  gid : Nat
  R : Type
  [deceq : DecidableEq R]
  [regiontype : Region R dims gid]
  validextra : Prop

structure Puzzle (dims : Dims) where
  validextra : Prop

def cells_belong_to_region {dims : Dims}
  (cells : List (Cell dims)) (rid : Nat) : Prop :=
  ∀ c ∈ cells, c.region = rid

def Hasvalue (dims : Dims) := Cell dims → (Fin 10 ⊕ Letter) → Prop
def Hascandidates (dims : Dims) := Cell dims → Wrapperset (Fin 10 ⊕ Letter) → Prop
def Hascells
  {R : Type} {dims : Dims} {gid : Nat}
  [DecidableEq R] [rtype : Region R dims gid] :=
  (r : R) → (cells : List (Cell dims)) →
    (cells_belong_to_region cells (@Region.rid _ _ _ _ rtype r))
  → Prop
def Hasregions (dims : Dims) := (g : Grid dims) → List g.R → Prop
def Hasgrids (dims : Dims) := Puzzle dims → List (Grid dims) → Prop

structure PuzzleState (dims : Dims) where
  hv : Hasvalue dims
  hc : Hascandidates dims
  hcells : (g : Grid dims) → @Hascells _ _ _ g.deceq g.regiontype
  hr : Hasregions dims
  hg : Hasgrids dims

def PuzzleState.from
  {dims : Dims}
  (hv : Option (Hasvalue dims))
  (hc : Option (Hascandidates dims))
  (hcells : Option ((g : Grid dims) → @Hascells _ _ _ g.deceq g.regiontype))
  (hr : Option (Hasregions dims))
  (hg : Option (Hasgrids dims)) : PuzzleState dims :=
  {
    hv := hv.getD (fun _ _ => False)
    hc := hc.getD (fun _ cans => cans = {} )
    hcells := hcells.getD (fun _ => (fun _ cells _ => cells = []))
    hr := hr.getD (fun _ regions => regions = [])
    hg := hg.getD (fun _ grids => grids = [])
  }

def Hascandidates.functional {dims : Dims} (hc : Hascandidates dims) : Prop :=
  ∀ (c : Cell dims) (can1 can2 : Wrapperset (Fin 10 ⊕ Letter)),
    hc c can1 → hc c can2 → can1 = can2

def Cell.ucord_uniq (dims : Dims) : Prop :=
  ∀ (c1 c2 : Cell dims), c1.ucord = c2.ucord → c1 = c2

def Cell.valid_have_if_state
  {dims : Dims} (c : Cell dims)
  (hv : Hasvalue dims) (hc : Hascandidates dims) : Prop :=
  ∀ (v : Fin 10 ⊕ Letter) (can : Wrapperset (Fin 10 ⊕ Letter)),
    hv c v -> hc c can -> can = {v}

def Cell.valid_can_if_state
  {dims : Dims} (c : Cell dims)
  (hc : Hascandidates dims) : Prop :=
  (∃ can : Wrapperset (Fin 10 ⊕ Letter), hc c can ∧ can.card > 0)

def Cell.valid_if_state
  {dims : Dims} (c : Cell dims)
  (hv : Hasvalue dims) (hc : Hascandidates dims) : Prop :=
  c.valid_can_if_state hc ∧ c.valid_have_if_state hv hc

def Region.valid_if_state
  {R : Type} {dims : Dims} {gid : Nat}
  [DecidableEq R] [rtype : Region R dims gid]
  (r : R)
  (hcells : @Hascells _ _ _ _ rtype)
  (hv : Hasvalue dims)
  (hc : Hascandidates dims)
  : Prop :=
  ∀ cells : List (Cell dims),
  ∃ belongto : cells_belong_to_region cells (@Region.rid _ _ _ _ rtype r),
    hcells r cells belongto →
    (∀ c ∈ cells, c.valid_if_state hv hc)
    ∧ (@Region.validextra _ _ _ _ rtype cells)

def Grid.valid_if_state
  {dims : Dims} (g : Grid dims)
  (hr : Hasregions dims)
  (hcells : @Hascells _ _ _ g.deceq g.regiontype)
  (hv : Hasvalue dims)
  (hc : Hascandidates dims)
  : Prop :=
  ∀ regions : List g.R,
    hr g regions →
    (∀ region ∈ regions, @Region.valid_if_state _ _ _ g.deceq g.regiontype region hcells hv hc) ∧
    g.validextra

def Grid.grids_unique_in_puzzle {dims : Dims} (grids : List (Grid dims)) : Prop :=
  ∀ g1 ∈ grids, ∀ g2 ∈ grids, g1.gid = g2.gid → g1 = g2

def Puzzle.valid_if_state
  {dims : Dims} (p : Puzzle dims)
  (hg : Hasgrids dims)
  (hr : Hasregions dims)
  (hcells : (g : Grid dims) → @Hascells _ _ _ g.deceq g.regiontype)
  (hv : Hasvalue dims)
  (hc : Hascandidates dims)
  : Prop :=
  ∀ grids : List (Grid dims),
    hg p grids →
    (∀ g ∈ grids, g.valid_if_state hr (hcells g) hv hc) ∧
    p.validextra

def Puzzle.always_valid
  {dims : Dims} (p : Puzzle dims)
  (hg : Hasgrids dims)
  (hr : Hasregions dims)
  (hcells : (g : Grid dims) → @Hascells _ _ _ g.deceq g.regiontype)
  (hv : Hasvalue dims)
  (hc : Hascandidates dims) : Prop :=
  p.valid_if_state hg hr hcells hv hc

theorem hv_most_one
  {dims : Dims} (c : Cell dims)
  (hv : Hasvalue dims) (hc : Hascandidates dims)
  (havevalid : c.valid_have_if_state hv hc)
  (v1 v2 : Fin 10 ⊕ Letter) (v1val : hv c v1)
  : (∃ (hv2 : Hasvalue dims) (hc2 : Hascandidates dims) (can : Wrapperset (Fin 10 ⊕ Letter)),
    hc c can ∧ hc2 c can ∧ hv2 c v2 ∧ c.valid_have_if_state hv2 hc2) → v1 = v2 := by
    intro h
    obtain ⟨ hv2, hc2, can, ⟨ hccan, hc2can, v2val, havevalid2 ⟩ ⟩ := h
    unfold Cell.valid_have_if_state at havevalid havevalid2
    specialize havevalid v1 can
    specialize havevalid2 v2 can
    have e1 : can = {v1} := havevalid v1val hccan
    have e2 : can = {v2} := havevalid2 v2val hc2can
    rw [e1] at e2
    exact Wrapperset.singleton_inj.mp e2

theorem hv_exclusive
  {dims : Dims} (c : Cell dims)
  (hv : Hasvalue dims) :
  ∀ (v : Fin 10 ⊕ Letter) (hc : Hascandidates dims),
    (hv c v ∧ c.valid_if_state hv hc) → (∀ ov ≠ v, ¬ hv c ov) := by
    intro v hc h ov ovneq haveov
    obtain ⟨ havev, valid ⟩ := h
    unfold Cell.valid_if_state Cell.valid_can_if_state Cell.valid_have_if_state at valid
    obtain ⟨ ⟨ can, ⟨ hccan, _ ⟩ ⟩, valid ⟩ := valid
    have ev : can = {v} := valid v can havev hccan
    have eov : can = {ov} := valid ov can haveov hccan
    rw [ev, Wrapperset.singleton_inj] at eov
    symm at eov
    contradiction

def single_can_imp_hv
  {dims : Dims} (c : Cell dims)
  (v : Fin 10 ⊕ Letter) (hc : Hascandidates dims) (hcsingle : hc c {v})
  (hfunc : hc.functional)
  : {hv : Hasvalue dims // hv c v ∧ c.valid_if_state hv hc} :=
    ⟨ fun _ can => can = v,
    (by
      constructor
      case left => simp only
      case right =>
        unfold Cell.valid_if_state Cell.valid_can_if_state Cell.valid_have_if_state
        constructor
        case left =>
          use {v}
          constructor
          case h.left => assumption
          case h.right => simp only [Wrapperset.card_singleton, gt_iff_lt, zero_lt_one]
        case right =>
          intro varv canv hvvar hcvar
          unfold Hascandidates.functional at hfunc
          specialize hfunc c canv {v} hcvar hcsingle
          rwa [hvvar]
    )⟩

theorem not_can_imp_not_hv
  {dims : Dims} (c : Cell dims)
  (v : Fin 10 ⊕ Letter) (hc : Hascandidates dims) :
  (∃ can, hc c can ∧ (¬ {v} ⊆ can)) →
    (∀ hv : Hasvalue dims, c.valid_have_if_state hv hc → (¬ hv c v)) := by
    intro h hv havevalid hvval
    unfold Cell.valid_have_if_state at havevalid
    obtain ⟨ can, ⟨ hccan, notbelong ⟩ ⟩ := h
    specialize havevalid v can
    have eq : can = {v} := havevalid hvval hccan
    rw [eq] at notbelong
    let reflv := Wrapperset.Subset.refl {v}
    contradiction

theorem valid_puzzle_imp_valid_grid
  {dims : Dims} (p : Puzzle dims)
  (pstate : PuzzleState dims)
  (pvalid : p.always_valid pstate.hg pstate.hr pstate.hcells pstate.hv pstate.hc) :
  ∀ grids : List (Grid dims),
    pstate.hg p grids → (
      ∀ grid ∈ grids, grid.valid_if_state pstate.hr (pstate.hcells grid) pstate.hv pstate.hc
    ) := by
  intro grids gridsbelong grid gridbelong
  have h := pvalid grids gridsbelong
  exact h.1 grid gridbelong

/-
TODO: cascade valid imp
theorem valid_grid_imp_valid_region
-/
/-
def cellinPuzzles {dims : Dims} (p : Puzzle dims) (c : Cell dims) : Prop :=
  ∃ (g : Grid dims) (r : g.R),
    c ∈ @Region.cells g.R _ _ _ g.regiontype r ∧ r ∈ g.regions ∧ g ∈ p.grids

theorem ensure_valid
  {dims : Dims} {can : Nat} (ca : Cell dims) (cb : Cell dims)
  (p : Puzzle dims)
  (preb : cellinPuzzles p cb)
  (h0 : (ca.value = some (.inl can)) → ¬ cb.valid)
  (welldefined : wellSovlable p) : ca.value ≠ some (.inl can) := by
  rw [@Ne.eq_def]
  intro h
  rcases preb with ⟨ gb, rb, statb⟩
  obtain ⟨ cbbelong, rbbelong, gbbelong ⟩ := statb
  have cbinvalid : ¬ cb.valid := h0 h
  have rbinvalid : @Region.invalid _ _ _ gb.deceq gb.regiontype rb := by
    unfold Region.invalid
    left
    use cb
  have gbinvalid : Solvable.invalid gb := by
    unfold Solvable.invalid instSolvableGrid
    simp only
    left
    use rb
  have pinvalid : Solvable.invalid p := by
    unfold Solvable.invalid instSolvablePuzzle
    simp only
    left
    use gb
  have pnotvalid : ¬ Solvable.valid p := (invalid_imp_not_valid_puzzle p) pinvalid
  unfold wellSovlable at welldefined
  contradiction

theorem cell_remove_only_candidate {dims : Dims} (c : Cell dims) (can : Nat ⊕ Letter)
  (h0 : c.value.isNone = true)
  (h1 : c.candidates.card = 1)
  (h2 : c.forcedValue h1 = can) :
    ¬ (c.removeCandidate can).valid := by
  intro h
  simp only [Cell.valid, Cell.removeCandidate, gt_iff_lt, Wrapperset.card_pos] at h
  have : can ∈ c.candidates := by
    rw [<- h2]
    exact Wrapperset.min'_mem _ _
  have hval : c.value = none := by simpa using h0
  rcases h with h | h
  case inl =>
    rw [hval] at h
    simp at h
  case inr =>
    have hcard : (c.candidates.erase can).card = 0 := by
      rw [Wrapperset.card_erase_of_mem this, h1]
    have hpos : 0 < (c.candidates.erase can).card := Wrapperset.card_pos.mpr h
    omega
-/
