---
name: Dojo Gate katana asset was unwired
description: Fruit Blaster's Dojo Gate ("classic" mode) had a grandmaster-bell-katana.png asset sitting in public/dojo/ but no code ever drew it — every other world (bamboo/moon/challenge/survival) has its own sword-drawing block in GameEngine.ts, classic didn't.
---

Presence of a themed asset file in `public/<theme>/` does not mean it's wired into gameplay — check `GameEngine.ts` for a matching `this.mode === '<mode>'` sword/sprite draw block before assuming a themed weapon/sprite renders.

**Why:** Dojo Gate's katana image existed on disk (and even matched a user-uploaded reference image) but was invisible in actual play; only fixing the image (removing its white background) wouldn't have surfaced in-game without also adding the render block.

**How to apply:** When asked to fix/replace a themed sprite (fruit, weapon, hazard), grep `GameEngine.ts` for the mode string to confirm a draw call actually references that file, not just that the file exists in `GameData.ts`/`public/`.
