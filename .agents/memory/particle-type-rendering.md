---
name: Particle type must be added to GameEngine.draw() to be visible
description: Fruit Blaster's Particle.type union includes values (star, sparkle, ember, frost) that GameTypes.ts defines but GameEngine.draw() may not render.
---

`Particle.type` is a string union declared in `GameTypes.ts`, but rendering is a separate
switch/if-chain inside `GameEngine.draw()`. Adding a new type to the union (or spawning particles
with an existing-but-unhandled type) does nothing visually unless a matching draw case is added.

**Why:** the two are decoupled — TypeScript only checks that the string is a valid member of the
union, not that a renderer exists for it. This produced a silent no-op bug where `star`/`sparkle`
particles were spawned but invisible.

**How to apply:** whenever introducing a new particle-based visual effect (or reusing a type not
seen drawn on screen before), grep `GameEngine.draw()` for that type string and add a render case
if missing, rather than assuming the type union is the source of truth.
