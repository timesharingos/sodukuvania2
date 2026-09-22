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

class Region (R : Type) (dims : Dims) (gid : Nat) [DecidableEq R]
where
  rid : R -> Nat
  cells : R -> Wrapperset (Cell dims)
  valid :
    R -> Prop
  belongto : ∀ r : R, ∀ c ∈ cells r, c.region = rid r ∧ c.grid = gid
  index? :
    R -> Fin dims.rn -> Fin dims.rm -> Option (Cell dims)

structure Grid (R : Type) (dims : Dims) (gid : Nat) [DecidableEq R] [Region R dims gid]
where
  regions : Wrapperset R

def Grid.valid
  {R : Type} {dims : Dims} {gid : Nat}
  [DecidableEq R] [Region R dims gid]
  (g : Grid R dims gid) : Prop :=
    ∀ region ∈ g.regions, @Region.valid R dims gid _ _ region

noncomputable def Grid.index?
  {R : Type} {dims : Dims} {gid : Nat}
  [DecidableEq R] [Region R dims gid]
  (g : Grid R dims gid) (idx : Fin dims.rc) : Option R :=
    g.regions.toList.find? (fun r => @Region.rid R dims gid _ _ r = idx)
