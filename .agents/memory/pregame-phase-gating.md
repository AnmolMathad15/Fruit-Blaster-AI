---
    name: Pre-game countdown gating must cover every timer, not just spawning
    description: When adding a "wait for hand, then countdown" phase before gameplay, every per-mode timer/state tick (not just fruit spawning) must be gated on the same phase flag.
    ---

    Symptom: gating fruit spawning behind an `engine.active` flag is not enough — per-mode side
    effects that live in the outer game-loop component (survival seconds, blessing timers,
    hand-lost auto-pause, mode countdown clocks, ambient music gating) run independently of the
    engine and will silently advance/trigger during the pre-game wait/countdown if not gated too.

    **Why:** in this codebase (fruit-blaster), `GameEngine.update()` only owns spawn/difficulty
    logic; several per-mode effects (Moon Shrine's `tickSurvival`/`tickBlessing`, the hand-lost
    auto-pause, the challenge/bamboo countdown timer) live directly in the React game-loop
    component and read fingertip/tracking state independently. A single engine-level flag misses
    all of them.

    **How to apply:** when introducing any pre-game phase state machine, grep the game-loop
    component for every `setInterval`/per-frame tick tied to mode-specific state and gate each one
    on the same phase (ideally via a ref mirrored from the phase state, read inside the RAF loop —
    state alone lags a frame). Also: only arm a mouse/touch input fallback once the primary input
    method is *definitively* unavailable (an explicit denied/error state), never on a "not ready
    yet" condition, or it will race ahead of normal initialization.
    