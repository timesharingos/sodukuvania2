import Lake
open Lake DSL

package "sodukuvania2" where
  version := v!"0.1.0"
  keywords := #["math"]
  leanOptions := #[
    ⟨`pp.unicode.fun, true⟩, -- pretty-prints `fun a ↦ b`
    ⟨`relaxedAutoImplicit, false⟩,
    ⟨`maxSynthPendingDepth, .ofNat 3⟩,
    ⟨`weak.linter.mathlibStandardSet, true⟩,
  ]

require "leanprover-community" / "mathlib" @ git "v4.34.0"

@[default_target]
lean_lib «Sodukuvania2» where
  -- add any library configuration options here
