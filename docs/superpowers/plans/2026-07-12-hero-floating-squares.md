# Hero Floating Squares Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Animate the Hero’s existing flat Riso squares with continuous drift and subtle pointer parallax while preserving readability, accessibility, and CTA behavior.

**Architecture:** Add a focused `FloatingSquareField` presentational component that owns square descriptors, Framer Motion transforms, reduced-motion handling, and a pointer listener attached to the Hero section through a ref. Render the field as a decorative, non-interactive layer behind the existing Hero content; keep all existing copy, routing, and buttons unchanged.

**Tech Stack:** React 18, TypeScript, Framer Motion 12, existing Riso/Tailwind classes, Jest + Testing Library.

## Global Constraints

- Keep the existing flat Riso pink, blue, and mustard square palette.
- Do not add a new animation or WebGL dependency.
- Decorative squares must use `pointer-events-none` and `aria-hidden="true"`.
- Use transform/opacity animation only; do not animate layout properties.
- Respect `prefers-reduced-motion`; reduced-motion users receive stable squares with no looping or pointer response.
- Preserve Hero copy, CTA behavior, navigation, responsive layout, and existing tests.
- Do not touch the unrelated `deploy/Caddyfile` or `deploy/docker-compose.prod.yml` changes.

---

### Task 1: Define the floating-field contract and failing tests

**Files:**

- Create: `components/FloatingSquareField.test.tsx`
- Modify: `components/Hero.test.tsx`

**Interfaces:**

- The tests define `FloatingSquareField` with props `{ containerRef?: React.RefObject<HTMLElement | null>; className?: string }`.
- The field exposes `data-testid="hero-floating-square"` on every decorative square.

- [ ] **Step 1: Write the failing component tests**

Create `components/FloatingSquareField.test.tsx`. Mock `framer-motion` with a passthrough `motion.div`, `useMotionValue`, `useSpring`, and a jest-mocked `useReducedMotion`. Assert the field renders 8–10 squares, every square has `aria-hidden="true"`, and reduced motion does not set `data-motion-active="true"`.

```tsx
it('renders a bounded decorative field of flat squares', () => {
  render(<FloatingSquareField />);
  const squares = screen.getAllByTestId('hero-floating-square');
  expect(squares.length).toBeGreaterThanOrEqual(8);
  expect(squares.length).toBeLessThanOrEqual(10);
  squares.forEach((square) => expect(square).toHaveAttribute('aria-hidden', 'true'));
});

it('keeps squares static when reduced motion is requested', () => {
  (useReducedMotion as jest.Mock).mockReturnValue(true);
  render(<FloatingSquareField />);
  screen.getAllByTestId('hero-floating-square').forEach((square) => {
    expect(square).not.toHaveAttribute('data-motion-active', 'true');
  });
});
```

Add to `components/Hero.test.tsx` without changing existing CTA/routing tests:

```tsx
it('renders the decorative floating square field', () => {
  render(<Hero onLogin={jest.fn()} onRegister={jest.fn()} isLoggedIn={false} />);
  const squares = screen.getAllByTestId('hero-floating-square');
  expect(squares.length).toBeGreaterThanOrEqual(8);
  expect(squares.every((square) => square.getAttribute('aria-hidden') === 'true')).toBe(true);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run `npm test -- --runInBand components/FloatingSquareField.test.tsx components/Hero.test.tsx`.

Expected: FAIL because the component and Hero field markup do not exist yet.

- [ ] **Step 3: Commit the failing tests**

```bash
git add components/FloatingSquareField.test.tsx components/Hero.test.tsx
git commit -m "test: define hero floating square behavior"
```

### Task 2: Implement the isolated floating square field

**Files:**

- Create: `components/FloatingSquareField.tsx`
- Test: `components/FloatingSquareField.test.tsx`

**Interfaces:**

- Produces `FloatingSquareField` with `{ containerRef?: React.RefObject<HTMLElement | null>; className?: string }`.

- [ ] **Step 1: Add descriptor-driven flat squares**

Create a descriptor list with exactly 9 entries. Each descriptor contains `tone`, `size`, `left`, `top`, `driftX`, `driftY`, `duration`, `delay`, `rotate`, and `opacity`. Map tones to existing `bg-riso-pink`, `bg-riso-blue`, and `bg-riso-mustard` classes. Render every square absolutely inside an inset decorative wrapper.

- [ ] **Step 2: Add drift, pointer spring, and reduced-motion behavior**

Use `useMotionValue(0)` and `useSpring` for shared `pointerX`/`pointerY`. Attach a `pointermove` listener to `containerRef.current`; normalize against `getBoundingClientRect()`, clamp each axis to `[-1, 1]`, multiply by 8 pixels, and remove the listener during cleanup. Skip the listener when `useReducedMotion()` is true or `matchMedia('(pointer: coarse)').matches`.

Render `motion.div` keyframes for `x`, `y`, and `rotate` only when motion is enabled. Set `data-motion-active="true"` only in the animated branch. Apply `pointer-events-none`, `aria-hidden="true"`, and `will-change-transform`; keep the field below content with explicit z-indexes.

- [ ] **Step 3: Run the isolated tests to verify they pass**

Run `npm test -- --runInBand components/FloatingSquareField.test.tsx`.

Expected: PASS with both field tests green.

- [ ] **Step 4: Commit the isolated component**

```bash
git add components/FloatingSquareField.tsx components/FloatingSquareField.test.tsx
git commit -m "feat: add animated hero square field"
```

### Task 3: Integrate the field into Hero without changing behavior

**Files:**

- Modify: `components/Hero.tsx`
- Test: `components/Hero.test.tsx`

**Interfaces:**

- `Hero` creates `const heroRef = useRef<HTMLElement | null>(null)` and passes it to `<FloatingSquareField containerRef={heroRef} />`.

- [ ] **Step 1: Add ref and decorative layer**

Import `useRef` and `FloatingSquareField`. Add `ref={heroRef}` to the existing section and render `<FloatingSquareField containerRef={heroRef} />` before the halftone texture. Keep content at its existing `relative z-10` layer and leave copy, CTA labels, handlers, and navigation unchanged.

- [ ] **Step 2: Run Hero and field tests**

Run `npm test -- --runInBand components/FloatingSquareField.test.tsx components/Hero.test.tsx`.

Expected: PASS with the existing Hero behavior tests plus the new field assertions.

- [ ] **Step 3: Commit the Hero integration**

```bash
git add components/Hero.tsx components/Hero.test.tsx
git commit -m "feat: animate hero squares with pointer parallax"
```

### Task 4: Run quality gates and inspect the final diff

**Files:**

- Verify: `components/Hero.tsx`, `components/FloatingSquareField.tsx`, `components/Hero.test.tsx`, `components/FloatingSquareField.test.tsx`

- [ ] **Step 1: Run the complete test suite**

Run `npm test -- --runInBand`.

Expected: all existing suites and new field tests pass with zero failures.

- [ ] **Step 2: Run typecheck and lint**

Run:

```bash
npm run typecheck
npm run lint
```

Expected: typecheck exits successfully and lint reports no errors; existing unrelated warnings may remain.

- [ ] **Step 3: Build production assets**

Run `npm run build`.

Expected: Vite production build completes successfully without animation-related errors.

- [ ] **Step 4: Review the final diff and working tree**

Run:

```bash
git diff --check HEAD~3..HEAD
git status --short
```

Confirm only Hero animation files, tests, and approved spec/plan commits are part of the feature work. Leave unrelated deployment files untouched.
