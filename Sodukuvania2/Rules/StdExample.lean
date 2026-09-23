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
export Finset (card_eq_one card_pos min'_mem card_erase_of_mem)
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

def Sum.toInt : Nat ⊕ Letter → Int
  | .inl n => (n : Int)
  | .inr fl => -((fl.toNat : Int) + 1)

theorem Sum.toInt_injective : Function.Injective Sum.toInt := by
  intro a b h
  cases a <;> cases b <;> simp only [Sum.toInt, inl.injEq, inr.injEq, reduceCtorEq] at h ⊢
  · exact Int.ofNat.inj h
  · omega
  · omega
  · rename_i l₁ l₂
    exact Letter.toNat_injective (by omega)

instance : LinearOrder (Nat ⊕ Letter) where
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
  grid : Fin dims.gc
  gridcord : Fin dims.gn × Fin dims.gm
  region : Fin dims.rc
  regioncord : Fin dims.rn × Fin dims.rm
  value : Option (Nat ⊕ Letter)
  candidates : Wrapperset (Nat ⊕ Letter)
deriving DecidableEq

def Cell.valid {dims : Dims} (c : Cell dims) : Prop :=
  c.value.isSome = true ∨ c.candidates.card > 0

def Cell.forcedValue {dims : Dims} (c : Cell dims)
  (h : c.candidates.card = 1) : Nat ⊕ Letter :=
    c.candidates.min' (by
        rw [Wrapperset.card_eq_one] at h
        rcases h with ⟨ a, ha ⟩
        exact ⟨ a, by rw [ha]; simp ⟩
      )

def Cell.forceValue {dims : Dims} (c : Cell dims)
  (h : c.candidates.card = 1) : Cell dims :=
    {
      ucord := c.ucord
      grid := c.grid
      gridcord := c.gridcord
      region := c.region
      regioncord := c.regioncord
      value := some (c.forcedValue h)
      candidates := ∅
    }

def Cell.removeCandidate {dims : Dims} (c : Cell dims)
  (can : Nat ⊕ Letter) : Cell dims :=
  {
    ucord := c.ucord
    grid := c.grid
    gridcord := c.gridcord
    region := c.region
    regioncord := c.regioncord
    value := c.value
    candidates := c.candidates.erase can
  }

def cells_belong_to_region {dims : Dims}
  (cells : Wrapperset (Cell dims)) (rid : Nat) (gid : Nat) : Prop :=
  ∀ c ∈ cells, c.region = rid ∧ c.grid = gid

class Region
  (R : Type) (dims : Dims) (gid : Nat) [DecidableEq R]
where
  rid : R → Nat
  cells : R → Wrapperset (Cell dims)
  validextra :
    R → Prop
  belongto : ∀ r : R, cells_belong_to_region (cells r) (rid r) (gid)
  index? :
    R → Fin dims.rn → Fin dims.rm → Option (Cell dims)
  update :
    (r : R) -> (cells : Wrapperset (Cell dims)) ->
    (h: cells_belong_to_region cells (rid r) gid) -> R
  updateRelated :
    R -> Cell dims -> R
  updateRelatedInjective : Function.Injective2 updateRelated

def Region.valid
  {R : Type} {dims : Dims} {gid : Nat}
  [deceq : DecidableEq R] [rtype : Region R dims gid]
  (r : R) : Prop :=
  (∀ c ∈ @Region.cells R dims gid deceq rtype r, c.valid) ∧ Region.validextra dims gid r

def Region.invalid
  {R : Type} {dims : Dims} {gid : Nat}
  [deceq : DecidableEq R] [rtype : Region R dims gid]
  (r : R) : Prop :=
  (∃ c ∈ @Region.cells R dims gid deceq rtype r, ¬ c.valid) ∨ (¬ Region.validextra dims gid r)

structure Grid (dims : Dims)
where
  gid : Nat
  R : Type
  [deceq : DecidableEq R]
  [regiontype : Region R dims gid]
  regions : List R
  validextra : Prop

def Grid.index?
  {dims : Dims}
  (g : Grid dims) (idx : Fin dims.rc) : Option g.R :=
    g.regions.find? (fun r => @Region.rid g.R dims g.gid _ g.regiontype r = idx)

def Grid.update
  {dims : Dims}
  (g : Grid dims) (updateRegions : List g.R) :=
    {g with regions := updateRegions}

def Grid.updateCellRelated
  {dims : Dims}
  (g : Grid dims) (updateCell : Cell dims) :=
    {g with regions :=
      g.regions.map (fun r => @Region.updateRelated _ _ _ _ g.regiontype r updateCell)}

theorem update_related_cell_grid_gid {dims : Dims} :
  ∀ g : Grid dims, ∀ updateCell : Cell dims, g.gid = (g.updateCellRelated updateCell).gid := by
    intro g updateCell
    unfold Grid.updateCellRelated
    simp only

def grids_unique_in_puzzle {dims : Dims} (grids : List (Grid dims)) : Prop :=
  ∀ g1 ∈ grids, ∀ g2 ∈ grids, g1 ≠ g2 → g1.gid ≠ g2.gid

structure Puzzle (dims : Dims) where
  grids : List (Grid dims)
  unique : grids_unique_in_puzzle grids
  validextra : Prop

def Puzzle.index?
  {dims : Dims}
  (p : Puzzle dims) (idx : Fin dims.gc) : Option (Grid dims) :=
    p.grids.find? (fun g => g.gid = idx)

def Puzzle.update
  {dims : Dims}
  (p : Puzzle dims) (updateGrids : List (Grid dims))
  (h : grids_unique_in_puzzle updateGrids) :=
    {p with grids := updateGrids, unique := h}

def Puzzle.updateCellRelated
  {dims : Dims}
  (p : Puzzle dims) (updateCell : Cell dims) :=
    { p with
      grids := p.grids.map (fun (g : Grid dims) => g.updateCellRelated updateCell)
      unique := by
        unfold grids_unique_in_puzzle
        intro g1 g1belong g2 g2belong gneq
        let uni := p.unique
        unfold grids_unique_in_puzzle at uni
        rcases List.mem_map.mp g1belong with ⟨g1', h1'mem, h1'eq⟩
        rcases List.mem_map.mp g2belong with ⟨g2', h2'mem, h2'eq⟩
        have orineq : g1' ≠ g2' := by
          intro h
          apply gneq
          rw [← h1'eq, ← h2'eq, h]
        have origidneq : g1'.gid ≠ g2'.gid := uni g1' h1'mem g2' h2'mem orineq
        let g1eq := update_related_cell_grid_gid g1' updateCell
        rw [h1'eq] at g1eq
        let g2eq := update_related_cell_grid_gid g2' updateCell
        rw [h2'eq] at g2eq
        rwa [g1eq, g2eq] at origidneq
    }

class Solvable (S : Type*)
where
  valid : S -> Prop
  invalid : S -> Prop

instance (dims : Dims) : Solvable (Grid dims) where
  valid s :=
    (∀ r ∈ s.regions, @Region.valid s.R dims s.gid s.deceq s.regiontype r) ∧ s.validextra
  invalid s :=
    (∃ r ∈ s.regions, @Region.invalid s.R dims s.gid s.deceq s.regiontype r) ∨ (¬ s.validextra)

instance (dims : Dims) : Solvable (Puzzle dims) where
  valid s :=
    (∀ g ∈ s.grids, Solvable.valid g) ∧ s.validextra
  invalid s :=
    (∃ g ∈ s.grids, Solvable.invalid g) ∨ (¬ s.validextra)

theorem invalid_imp_not_valid_region
  {R : Type} {dims : Dims} {gid : Nat}
  [deceq : DecidableEq R] [rtype : Region R dims gid] :
  ∀ r : R, @Region.invalid _ _ _ _ rtype r → ¬ @Region.valid _ _ _ _ rtype r := by
    intro r
    unfold Region.invalid Region.valid
    intro h h1
    obtain ⟨ cvalid, extravalid ⟩ := h1
    rcases h with h | h
    case inr => contradiction
    case inl =>
      obtain ⟨ c, ⟨ cbelong, invalidc ⟩ ⟩ := h
      let validc := cvalid c cbelong
      contradiction

theorem invalid_imp_not_valid_grid {dims : Dims} :
  ∀ g : Grid dims, Solvable.invalid g → ¬ Solvable.valid g := by
  intro g
  unfold Solvable.invalid Solvable.valid instSolvableGrid
  simp only [not_and]
  intro h h1
  rcases h with h | h
  case inr => assumption
  case inl =>
    obtain ⟨ r, ⟨ rbelong, invalidr ⟩ ⟩ := h
    have validr : @Region.valid _ _ _ g.deceq g.regiontype r := h1 r rbelong
    have truer : ¬ @Region.valid _ _ _ g.deceq g.regiontype r :=
      @invalid_imp_not_valid_region g.R dims g.gid g.deceq g.regiontype r invalidr
    contradiction

theorem invalid_imp_not_valid_puzzle {dims : Dims} :
  ∀ p : Puzzle dims, Solvable.invalid p → ¬ Solvable.valid p := by
    intro p
    unfold Solvable.invalid Solvable.valid instSolvablePuzzle
    simp only [not_and]
    intro h h1
    rcases h with h | h
    case inr => assumption
    case inl =>
      obtain ⟨ g, invalidstat ⟩ := h
      obtain ⟨ gbelong, invalidg ⟩ := invalidstat
      have validg : Solvable.valid g := by
        specialize h1 g
        exact h1 gbelong
      have trueg : ¬ Solvable.valid g := invalid_imp_not_valid_grid g invalidg
      contradiction

def wellSovlable {dims : Dims} (p : Puzzle dims) : Prop :=
  Solvable.valid p

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
