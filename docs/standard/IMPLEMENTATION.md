# PR-STD-003 implementation contract — V5.14

The English handbook edition 3 and `mechanisms.json` bind this implementation to its formulas. `ruleset.json` is the canonical coefficient input; `node scripts/build-rules.cjs` regenerates the runtime config and world-event weights, while `--check` rejects divergence. Save schema remains 5; the ruleset version is separate.

Implemented in this release:

- World, loot, craft, combat and visual PRNG domains; independent cached map/art generators. Cryptographic account entropy remains separate. Seeds and counters are diagnostic, not a complete replay or an authority guarantee.
- Exact stock/output bounded-batch DP, finite-stock first-success CDF, replenished cost moments and a bounded 95% material quantile; honest locked-material assumptions.
- Nearby enemy joint reward means/standard deviations, preserving shared-rank covariance. The rarity value index is an explicit analysis choice, not currency or a universal build ranking.
- Prism melee critical chance `min(.6,1-.85^c)`, multiplier 1.6 before armor; no critical effect on body, poison or projectiles. Batch feedback shows critical count.
- Frost melee refresh to 1.2 simulation seconds; movement reduction `min(.35,.12*c)`, guardian magnitude halved. At least one qualifying source remains for the triggering batch even if broken by that batch. No duration stacking or attack-clock slowing.
- Character-entry clock/spawn reset. Region/respawn clear venom, dash motion/iframes, root layers, buffs and boons while preserving skill cooldowns. Existing dynamic population loops and requested-damage life steal remain explicitly documented.
- Eight biome material recipes, decorative landmarks/obstacle finishes, guardian anatomy, shrine glow and directional visual cues. Rendered appendages and ponds do not add collision bodies. Low quality and reduced motion retain scoped fallbacks.

Deferred contracts remain marked P: complete ordered replay, automatic policy optimization, general element matrices, pity, trading and server-authoritative multiplayer/economy. This release is a concrete standards-based implementation step; it does not declare all future proposals complete.

Verification: `npm test`, `node scripts/build-rules.cjs --check`, Worker compilation, browser suites and the handbook's independent reference calculations. The exact source/deployment pins and fresh evidence belong in the release QA report.
