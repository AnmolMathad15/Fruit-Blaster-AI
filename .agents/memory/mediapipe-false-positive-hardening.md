---
    name: MediaPipe hand-tracking false-positive hardening
    description: Layers to add on top of MediaPipe HandLandmarker to stop it latching onto body/face/background as a "hand" and to stop single-frame misdetections snapping the sword.
    ---

    MediaPipe's HandLandmarker with default/moderate confidence thresholds can still fire on
    skin-toned non-hand regions (face edges, arms, sleeves) or hold onto a stale detection through
    occlusion. `numHands` alone does not filter this — it only caps count, not correctness.

    **Why:** raising confidence thresholds (0.8–0.9 range for detection/presence/tracking) cuts
    most false positives, but transient single-frame misfires still slip through even at high
    confidence, and only show up as symptoms (sword jumping) rather than errors.

    **How to apply:** add two independent guards beyond confidence thresholds:
    1. Presence-confirmation — require several (~4) consecutive detected frames before trusting a
     *new* appearance of the hand, not just a lost-frame debounce on disappearance.
    2. Jump rejection — compare each new landmark to the **last accepted raw** (not smoothed)
     position; discard frames whose jump exceeds a plausible per-frame distance, but force-accept
     after a few consecutive discards so a genuinely fast motion doesn't get stuck. Comparing
     against the smoothed/EMA position instead of raw causes perceptible lag on fast motion.
    