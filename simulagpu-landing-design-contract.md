# SimulaGPU — Landing Design Contract

**Branch:** `feat/landing`  
**Scope:** landing page + entry into existing classes only  
**Do not modify:** lesson internals, lesson visualizations, lesson pedagogy, Anki behavior, CUDA content

---

## 1. Goal

Create a new SimulaGPU landing page that makes the first interaction feel like **entering a GPU** and then choosing one of the **already existing classes**.

The page should answer, within ~10 seconds:

1. What is SimulaGPU?
2. What should I click?
3. Which classes can I enter?

The landing is a navigation/experience layer. It must not redesign how individual classes work.

---

## 2. Protected boundaries

This branch must not create avoidable Git divergence with concurrent lesson work.

### Allowed

- Replace/customize the VitePress home page.
- Add landing-only Vue components.
- Add landing-only CSS.
- Add one static SVG/background asset.
- Add lightweight local state if needed only for landing state.
- Link to existing lesson routes.
- Add responsive behavior.
- Add reduced-motion behavior.

### Forbidden

- Editing lesson content under `apps/docs/clase-*`, `apps/docs/leccion/*`, or equivalent lesson pages unless strictly required to repair a broken link.
- Refactoring `@simulagpu/core`.
- Refactoring `@simulagpu/visuals`.
- Changing lesson data contracts.
- Changing Anki generation or review behavior.
- Introducing React, Tailwind, shadcn, Radix, Framer Motion, WebGL, Three.js, or a runtime Haikei dependency.
- Inventing future lessons just to fill the visual map.
- Renaming or moving current lesson routes.

If a desired landing improvement requires touching lesson internals, stop and report it instead of implementing it.

---

## 3. Current stack constraint

Keep the existing stack:

- Vue 3
- VitePress
- existing SimulaGPU packages
- plain CSS / scoped Vue CSS where sufficient

The references below are **design sources**, not dependency requirements.

---

# 4. Curated visual references

## A. Watermelon Hero 10 — primary composition reference

Reference:

- https://ui.watermelon.sh/block/hero-10
- Source:
  https://github.com/WatermelonCorp/watermellon-registry/blob/main/src/components/watermelon-ui/hero-10.tsx

### Extract

Use its high-level hierarchy:

```text
navbar
  ↓
small status / eyebrow pill
  ↓
large centered headline
  ↓
short description
  ↓
single primary CTA
  ↓
large atmospheric visual
```

Useful motion values observed in the reference:

```text
content stagger:      ~100 ms
initial Y offset:     ~18 px
initial blur:         ~8 px
press scale:          ~0.96
background scale:     ~1.035 → 1
```

Do not reproduce its image, wellness aesthetic, serif typography, customer counters, or marketing content.

### SimulaGPU translation

```text
● INTERACTIVE CUDA

Understand CUDA
from inside the GPU.

See what your code makes
the hardware actually do.

[ ENTER GPU → ]

        GPU visual
```

The CTA is the dominant first action.

---

## B. Watermelon Hero 1 — dark technical atmosphere

Reference:

- https://ui.watermelon.sh/block/hero-1
- Source:
  https://github.com/WatermelonCorp/watermellon-registry/blob/main/src/components/watermelon-ui/hero-1.tsx

### Extract

Useful characteristics:

- dark full-height surface;
- localized geometric visual rather than a busy full-page pattern;
- radial fade from visual into background;
- short staged reveal;
- small arrow microinteraction on the CTA;
- simple top navigation.

Useful timing/easing observed in the source:

```text
stagger children:     ~120 ms
delay children:       ~100 ms
item initial Y:       ~24 px
item duration:        ~800 ms in the marketing example
background duration:  ~1.2 s
ease:                 cubic-bezier(0.16, 1, 0.3, 1)
```

For SimulaGPU, shorten normal UI transitions. Do not blindly copy the long marketing durations.

### SimulaGPU translation

Use the idea of a GPU chip surrounded by a **very subtle circuit/silicon structure** that fades into the background.

Do not use:

- social links;
- scroll-to-discover indicator;
- large marketing navigation;
- continuous decorative movement.

---

## C. Motion Primitives — Animated Background

Reference:

- https://motion-primitives.com/docs/animated-background
- Repository examples:
  https://github.com/ibelick/motion-primitives/tree/main/app/docs/animated-background

### Extract

The important idea is not the React component. It is this state model:

```text
multiple selectable items
        ↓
one shared visual highlight
        ↓
highlight moves to active / hovered item
```

Use it for the class/module selector after entering the GPU.

Example:

```text
[ Modelo mental ]   Índice global   Reducción
       ↑
single shared active surface
```

When selection changes, the same highlight should appear to travel to the new target.

### Vue implementation guidance

Prefer a tiny local implementation.

Possible approach:

```vue
<div class="module-grid" @mouseleave="hovered = null">
  <a
    v-for="item in items"
    :key="item.href"
    :href="item.href"
    class="module-card"
    @mouseenter="hovered = item.id"
    @focus="hovered = item.id"
  >
    <span
      class="module-card__surface"
      :class="{ active: activeId === item.id || hovered === item.id }"
    />
    <span class="module-card__content">
      {{ item.label }}
    </span>
  </a>
</div>
```

For v1, a clean per-card transition is acceptable if a true shared-layout indicator would add significant complexity.

Correctness and clarity are more important than reproducing Motion's internal implementation.

---

## D. Motion Primitives — Animated Group

Reference:

- https://motion-primitives.com/docs/animated-group
- Repository examples:
  https://github.com/ibelick/motion-primitives/tree/main/app/docs/animated-group

### Extract

Use a hierarchical reveal for the class map:

```text
GPU
 ↓
top-level learning groups
 ↓
available classes
```

Recommended landing timings:

```text
stagger:       50–80 ms
translateY:    8–16 px
initial blur:  3–5 px maximum
duration:      250–450 ms
```

This should feel immediate.

Do not animate each letter or every decorative object.

---

## E. Motion Primitives — Transition Panel semantics

Reference:

- https://motion-primitives.com/docs/transition-panel

### Extract

Use the state model:

```text
landing hero
    ↓ click ENTER GPU
transition
    ↓
class selector
```

Do not turn this into a full routing or animation framework.

A local Vue state is enough:

```ts
const enteredGpu = ref(false)
```

Conceptually:

```vue
<LandingIntro v-if="!enteredGpu" @enter="enteredGpu = true" />
<GpuClassMap v-else />
```

Transition target:

```text
~300–400 ms
```

The transition should communicate that the student moved **inside the same system**, not to an unrelated marketing section.

---

## F. Haikei — Low Poly Grid

Reference:

- https://haikei.app/
- https://haikei.app/generators/

### Extract

Create/export one static SVG with:

- low distortion;
- medium/high grid resolution;
- colors close to SimulaGPU background;
- very low contrast.

Then commit it as a normal asset.

Example:

```text
apps/docs/public/landing/gpu-grid.svg
```

Suggested final CSS opacity:

```css
opacity: 0.08;
```

Adjust only if required by light/dark mode.

The background must disappear perceptually while reading.

Do not add Haikei as a runtime dependency.

---

# 5. Landing information architecture

## State 1 — Arrival

Minimum content:

```text
SimulaGPU

● Interactive CUDA

Understand CUDA
from inside the GPU.

See threads, memory and synchronization
as operations you can inspect.

[ ENTER GPU → ]

GPU visual
```

A compact navigation may include only existing useful destinations.

Avoid a SaaS marketing navbar.

---

## State 2 — Inside GPU / choose class

Only show classes that actually exist in the repository.

At the current stage this will likely include concepts such as:

```text
GPU model / mental model
Indexing / vector addition
Parallel reduction
```

The implementation agent must inspect the repository and derive the exact labels and routes from current files instead of trusting this illustrative list.

Possible visual hierarchy:

```text
              INSIDE GPU

                 GPU
                  │

       Existing learning modules

       [ Class A ] [ Class B ]

     [ Class C ] ...
```

Use the project's 1 → 2 → 4 visual rhythm when natural, but do not manufacture empty modules to satisfy it.

---

# 6. Motion rules

**Principle:** motion communicates state.

Allowed:

- entrance reveal;
- CTA press/hover;
- GPU enter transition;
- class hover/focus/active state;
- short stagger when class selector appears.

Avoid:

- particles;
- floating decorative elements;
- infinite pulsing everywhere;
- animated text by character;
- parallax;
- unnecessary scroll choreography.

### Reduced motion

Respect:

```css
@media (prefers-reduced-motion: reduce)
```

In reduced-motion mode:

- remove transforms and blur transitions;
- keep state changes immediate or simple opacity changes;
- preserve all navigation and comprehension.

---

# 7. Responsive rules

The landing must be usable at **360 px width**.

Requirements:

- no horizontal scroll;
- primary CTA visible without precision tapping;
- all hover behavior also works by tap/focus;
- touch targets ~44 px minimum where practical;
- class labels remain readable;
- no more than ~8 simultaneously meaningful selectable objects.

Desktop may be richer spatially, but mobile must remain a first-class layout.

---

# 8. Suggested file ownership

Prefer landing-specific files so concurrent lesson work stays isolated.

Example:

```text
apps/docs/
├── index.md
└── .vitepress/
    └── theme/
        ├── index.ts
        ├── landing.css
        └── components/
            └── landing/
                ├── LandingHome.vue
                ├── LandingIntro.vue
                ├── GpuEntrance.vue
                └── GpuClassMap.vue

apps/docs/public/
└── landing/
    └── gpu-grid.svg
```

This is a suggestion, not a mandate. Reuse existing conventions if the repository already has a cleaner equivalent.

Do not move lesson files.

---

# 9. Acceptance criteria

The branch is complete when all of the following are true:

1. A new student can identify the primary action (`Enter GPU`) immediately.
2. Clicking/tapping `Enter GPU` reveals a clear selector for **existing classes**.
3. Every displayed class link resolves to an existing route.
4. No lesson implementation/content is redesigned in this branch.
5. Works at 360 px without horizontal scrolling.
6. Works in current light/dark behavior or intentionally preserves the project's existing mode contract.
7. `prefers-reduced-motion` remains usable and clear.
8. No React/Tailwind/Motion/WebGL dependency is added.
9. Existing lesson pages behave as before.
10. `pnpm verify` passes, or any pre-existing unrelated failure is clearly documented with evidence.

---

# 10. Visual verification checklist

Before closing the task, inspect at least:

```text
360 × 800
768 × 1024
1440 × 900
```

Check:

- initial viewport;
- after `Enter GPU`;
- keyboard focus;
- tap behavior;
- light/dark if both are supported;
- reduced motion.

A screenshot of the before/after landing at desktop and mobile is preferable in the final report.

---

# 11. Stop conditions

Stop and ask/report rather than expanding scope if:

- class routes are inconsistent or unclear;
- implementing the landing requires changing lesson architecture;
- the existing theme contract conflicts with the proposed layout;
- a new heavy dependency appears necessary;
- concurrent branch changes make a lesson file necessary to touch.

Do not solve those issues opportunistically in `feat/landing`.

---

# 12. Recommended implementation harness

Use **Kiro + Sol High** as the primary implementation agent.

Why:

- task is local-repo aware;
- requires UI judgment plus implementation;
- needs terminal/build/test access;
- scope is bounded enough for a single agent;
- Sol High is useful for preserving architecture while translating React design references into Vue/CSS.

The external links above should be treated as **reference/provenance**, not as a runtime requirement or a dependency of successful execution.

The agent should be able to complete the task even if it cannot browse those sites, because the important design decisions and implementation patterns are frozen in this document.

Optional cheap review after implementation:

- a fast visual/code reviewer can check screenshots, mobile layout, scope drift, and dependency changes;
- do not use a second implementation agent unless the first attempt fails materially.

---

# 13. Future branch — explicitly out of scope now

After the concurrent lesson work is merged and stabilized, create a separate branch for the new primitive-oriented lesson experience.

Possible future branch name:

```text
feat/primitive-lessons
```

That later branch can safely explore:

- one CUDA primitive per lesson/module;
- richer pedagogical animations;
- prediction-first interactions;
- local Anki Live review;
- module-specific state visualizations;
- deeper Motion-Primitives-inspired interactions.

Do not pre-implement those ideas in `feat/landing`.
