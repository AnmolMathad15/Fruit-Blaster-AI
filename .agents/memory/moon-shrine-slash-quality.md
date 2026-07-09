---
name: Slice-quality detection must key off input trail, not entity velocity
description: For "Clean"/"Perfect" slash-quality mechanics in the fruit-slicing game, derive quality from the sword/fingertip trail speed at the moment of contact, not the sliced entity's own velocity.
---

Fruit entities move at spawn-determined arc velocities that have nothing to do with how fast the
player swung. Using `fruit.vel` magnitude as a proxy for slash quality produces scoring/buff
behavior (e.g. Spirit Energy gain, Moon Blessing timing) that is disconnected from actual player
skill — a slow, lazy swing through a fast-moving fruit would register as "perfect".

**Why:** the engine already tracks a `swordTrail` (recent fingertip/cursor position history) for
rendering the sword streak; that's the correct signal for slash speed, since it reflects the
player's actual hand motion.

**How to apply:** compute slash speed as the distance between the two most recent swordTrail
points divided by elapsed frames, and threshold that (not entity velocity) for any "clean" /
"perfect" / "critical" slice-quality tiering.
