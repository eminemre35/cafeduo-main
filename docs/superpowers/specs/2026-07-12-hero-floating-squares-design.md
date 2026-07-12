# Hero Floating Squares Design

## Goal

Make the landing-page hero feel alive by animating its existing flat Riso squares across the full hero area while preserving copy readability, CTA interaction, and the current visual identity.

## Approved direction

Use a layered motion treatment: squares drift continuously with different durations and rotations, then respond subtly to pointer movement through a shared parallax offset. Keep the squares flat and use the existing pink, blue, and mustard palette. Do not add a new animation or WebGL dependency; the repository already uses `framer-motion`.

## Component design

Create a focused `FloatingSquareField` presentational component under `components/` and render it as a decorative layer inside `Hero`.

- The field owns a fixed set of 8–10 square descriptors: tone, size, start position, drift distance, duration, delay, rotation, and opacity.
- Each square renders as a `motion.div` with `pointer-events-none` and `aria-hidden="true"`.
- Continuous motion uses Framer Motion keyframes so each square follows an independent loop rather than moving as a single block.
- A shared pointer target drives a small `useSpring` parallax offset for the field. Pointer listeners are attached to the Hero section, cleaned up on unmount, and clamped so the effect remains subtle.
- On touch-sized viewports, pointer tracking is skipped and only the low-frequency drift remains.
- The field stays behind the content and texture layers through explicit z-indexes; it must never create a stacking or click target above the CTA buttons.

## Accessibility and performance

- Detect `prefers-reduced-motion` with Framer Motion’s `useReducedMotion`.
- When reduced motion is requested, render squares at stable positions with no looping animation or pointer response.
- Use transform-only animation (`x`, `y`, `rotate`) and opacity; avoid layout-affecting properties.
- Keep the number of animated nodes bounded and avoid per-frame React state updates.
- Preserve the existing responsive layout and avoid horizontal overflow at any breakpoint.

## Behavior

- Existing Hero copy, buttons, navigation, and routing behavior remain unchanged.
- Mouse movement changes the decorative field by only a few pixels, with spring smoothing.
- Squares drift over the entire hero section and remain clipped by its existing `overflow-hidden` boundary.
- Animation pauses naturally when the page is not visible through Framer Motion/browser scheduling; no custom animation loop is needed.

## Testing

- Extend `components/Hero.test.tsx` to assert the decorative field renders the expected bounded number of squares and remains `aria-hidden`.
- Mock `framer-motion` in the component test as existing Hero-related tests do, so tests verify structure without timing-sensitive animation.
- Add a reduced-motion test by mocking `useReducedMotion` to return `true` and asserting squares render without active animation props/classes.
- Keep all existing Hero CTA and navigation assertions unchanged.

## Validation gates

Run the focused Hero tests, the full Jest suite, TypeScript typecheck, lint, and production build before deployment.
