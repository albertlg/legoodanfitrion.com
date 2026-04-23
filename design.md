# LGA Design System (`design.md`)

This document is the visual and UX contract for **Le Good Anfitrión (LGA)**.  
It is inspired by Google Labs design-context standards and adapted to our current Tailwind + React architecture.

Use it as the single source of truth when building or modifying UI.

---

## 1) Design Philosophy

### 1.1 Frictionless by default (Doodle philosophy)
- Prioritize completion speed over decorative complexity.
- The user should be able to: open, understand, act.
- Avoid requiring extra steps (email, confirmations, hidden dependencies) unless strictly needed.

### 1.2 Progressive Disclosure
- Show only what is necessary for the current task.
- Advanced modules/options live behind explicit actions (`Manage modules`, modal/drawer, secondary zones).
- Do not overload primary screens with low-frequency controls.

### 1.3 Content-first hierarchy
- Data and decisions are primary; chrome is secondary.
- If an icon already provides context, do not duplicate with redundant labels.
- Reduce visual noise: fewer colors, fewer shadow layers, fewer nested containers.

### 1.4 Trust and anti-spam UX
- Communications are opt-in and host-controlled.
- Avoid automatic behavior that feels intrusive.
- Copy must be transparent, direct, and respectful.

---

## 2) Visual Audit Snapshot (current frontend)

### 2.1 Typography
- Primary UI/body font: `DM Sans` (`--font-family`, `--font-ui`).
- Display/marketing accent font: `Fraunces` (`--font-display`) for selective headings.
- Typical emphasis:
  - Section title: `text-sm` + `font-black`
  - Card title: `text-lg` + `font-black`
  - Meta labels: `text-[10px]`/`text-xs` + `uppercase` + `tracking-wider`

### 2.2 Color language
- Neutral surfaces dominate (light/dark variants).
- Semantic accents:
  - Primary action: Indigo (`bg-indigo-600` / hover darker)
  - Success: Emerald/green tones
  - Danger: Red tones
  - Informational/supporting: blue/gray subtle backgrounds

### 2.3 Shape, spacing, elevation
- Radius standard:
  - Main cards: `rounded-xl` / `rounded-2xl`
  - Modals: `rounded-2xl` or `rounded-3xl`
  - Chips/buttons: `rounded-lg` / `rounded-xl` / `rounded-full` depending on semantic role
- Spacing rhythm: `gap-2`, `gap-3`, `gap-4`, `gap-5`, `gap-6`; paddings mostly `p-3`, `p-4`, `p-5`, `p-6`.
- Elevation policy: subtle borders + `shadow-sm`. No heavy, stacked shadows in base state.

---

## 3) Core Primitives (Tailwind semantic mapping)

### 3.1 App Background
- Light: warm/neutral gradient via CSS variables.
- Dark: deep navy/blue gradient via CSS variables.
- Layout root: no visual clutter; preserve breathing room.

### 3.2 Surface / Card
- **Default card shell**
  - `bg-white dark:bg-gray-800`
  - `border border-gray-200 dark:border-gray-700`
  - `rounded-xl`
  - `shadow-sm`
  - `overflow-hidden`
- **Inner soft panel**
  - `bg-white/70 dark:bg-black/20`
  - `border border-black/5 dark:border-white/10`
  - `rounded-2xl`

### 3.3 Text
- **Primary text**: `text-gray-900 dark:text-white`
- **Secondary text**: `text-gray-500 dark:text-gray-400` (or `text-gray-600 dark:text-gray-300` when higher contrast is needed)
- **Muted helper**: `text-xs` or `text-[11px]` + muted color

### 3.4 Border language
- Structural borders:
  - `border-gray-200 dark:border-gray-700`
- Soft inner borders:
  - `border-black/5 dark:border-white/10`
- Semantic borders:
  - Success: emerald
  - Danger: red
  - Primary emphasis: indigo/blue

---

## 4) Interactive Elements

### 4.1 Mandatory interaction contract
All interactive controls must include:
- `cursor-pointer`
- `transition-all duration-200`

Disabled controls must include:
- `disabled:opacity-60`
- `disabled:cursor-not-allowed`

### 4.2 Button system

#### Primary
Use for the main action in a scope.

Base pattern:
- `inline-flex items-center justify-center gap-2`
- `rounded-xl`
- `bg-indigo-600 hover:bg-indigo-700`
- `text-white`
- `font-black`
- `px-4 py-2.5 text-xs sm:text-sm`

#### Secondary
Use for neutral support actions.

Base pattern:
- `inline-flex items-center justify-center gap-2`
- `rounded-xl`
- `border border-black/10 dark:border-white/10`
- `bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700`
- `text-gray-700 dark:text-gray-200`
- `font-bold`

#### Danger
Use only for destructive actions.

Base pattern:
- `border border-red-200/80 dark:border-red-700/40`
- `text-red-600 dark:text-red-300`
- `hover:bg-red-50 dark:hover:bg-red-900/20`

### 4.3 Inputs and selects
- Always explicit borders and visible focus:
  - `border border-black/10 dark:border-white/15`
  - `focus:border-blue-500`
- Neutral backgrounds:
  - `bg-white dark:bg-gray-950` or `dark:bg-gray-900`
- Use `text-sm` + `font-semibold` for readable form controls.

---

## 5) Component Patterns

### 5.1 Module Card Pattern (dashboard modules)

Structure:
1. Wrapper card (surface default)
2. Header row:
   - Icon + title + optional hint
   - Optional KPI mini-cards on the right
3. Body panel (`rounded-2xl`, soft border/background)
4. Action footer (primary/secondary actions)

Rules:
- Keep the module self-contained.
- No duplicate labels if icon + value already explain context.
- Empty states should be actionable, not passive.

### 5.2 Modal Pattern

Backdrop:
- `fixed inset-0 z-[120]`
- `bg-black/55 backdrop-blur-sm`
- `p-4 sm:p-6`

Dialog:
- `w-full max-w-2xl` (or task-fit width)
- `rounded-2xl` or `rounded-3xl`
- `bg-white/95 dark:bg-gray-900/95`
- `border border-black/10 dark:border-white/10`
- `shadow-sm`
- `max-h-[88vh] overflow-y-auto`

Accessibility baseline:
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- `Escape` closes modal
- Focused controls are visibly distinct

### 5.3 Inline Feedback Pattern
- Use contextual inline message blocks for `info/success/error`.
- Never rely on color alone; pair with clear wording.

---

## 6) Shadows, Motion, and Effects

### 6.1 Shadows
- Base: `shadow-sm` only.
- Hover/focus elevations can use `shadow-md` sparingly.
- Avoid `shadow-lg`, `shadow-xl`, `shadow-2xl` in everyday UI.

### 6.2 Motion
- Motion should support comprehension, never distract.
- Standard transitions:
  - `transition-all duration-200`
- Entry animations (when used) must be subtle:
  - low-distance fade/translate patterns.

---

## 7) Responsive Rules (mobile-first)

- Build mobile first; scale upward with `sm/md/lg/xl`.
- Never allow horizontal scroll in primary app screens.
- Long text inside rows must be truncatable:
  - container: `min-w-0 flex-1`
  - text: `truncate`
- On constrained widths:
  - primary info on first line
  - controls move to second line if needed
  - action buttons must remain reachable and visible

---

## 8) Dark Mode Contract

- Respect explicit app theme via `data-theme`.
- When explicit theme is absent, fallback to `prefers-color-scheme`.
- Maintain AA-like contrast in public and private surfaces.
- Do not use low-contrast text on saturated backgrounds.

---

## 9) AI Coding Directives (strict)

When generating UI code for LGA:

1. **Tailwind-first**
- Prefer Tailwind utility classes for new UI work.
- Do not introduce ad-hoc CSS files unless there is a clear system-level reason.

2. **Use semantic primitives**
- Reuse the card/button/text/border patterns defined above.
- Keep visual language consistent across modules.

3. **Interaction baseline required**
- Every clickable element must include `cursor-pointer transition-all duration-200`.
- Disabled states must include `disabled:cursor-not-allowed` and reduced opacity.

4. **Minimal visual noise**
- Avoid rainbow palettes for structural elements.
- Use color only for action hierarchy and semantic status.

5. **Progressive disclosure by default**
- Advanced options belong in secondary zones (modal, drawer, expandable sections).
- Keep the main event view focused on high-frequency tasks.

6. **No regressions in responsiveness**
- Ensure mobile layout is tested as first-class, not as fallback.
- Avoid fixed-width controls that push actions off-screen.

7. **Accessibility baseline is mandatory**
- Proper ARIA attributes in modals/menus.
- Keyboard operability for key workflows.
- Meaningful labels and focus-visible behavior.

---

## 10) PR Review Checklist (UI)

Before merging UI changes, verify:
- [ ] Uses card/button/text primitives from this file.
- [ ] No heavy shadows or random badge colors.
- [ ] No horizontal scroll on mobile or desktop.
- [ ] Interactive states include cursor + transition + disabled handling.
- [ ] Dark mode contrast remains readable.
- [ ] Advanced settings are progressively disclosed.
- [ ] No duplicated labels or redundant visual metadata.

---

## 11) Scope Note

There is legacy CSS in `frontend/src/styles.css`.  
For new dashboard/module work, use this Tailwind contract as the source of truth and avoid expanding legacy custom styles.
