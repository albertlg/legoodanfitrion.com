# LGA Design System (`design.md`)

This document is the **single visual contract** for Le Good Anfitrión (LGA).
All new UI work must follow these rules by default.

---

## 1) Design Philosophy

### 1.1 Doodle-first UX
- Keep interfaces frictionless, fast, and focused on decisions.
- Prioritize completion over decoration.
- Prefer progressive disclosure for advanced controls.

### 1.2 Premium SaaS clarity
- Neutral surfaces first, color used semantically.
- Consistent spacing, borders, and interaction feedback.
- Zero visual noise and zero punitive language patterns.

### 1.3 Accessibility as baseline
- Dark and light mode are first-class.
- Text contrast must remain readable in all states.
- Keyboard, focus, and feedback states are mandatory.

---

## 2) Core Primitives (Tailwind)

### 2.1 Surfaces
- App background: subtle gradients only.
- Default cards:
  - `bg-white dark:bg-gray-800`
  - `border border-gray-200 dark:border-gray-700`
  - `rounded-xl`
  - `shadow-sm`
- Transparent/glass panels must include:
  - `backdrop-blur-md`
  - `border border-black/10 dark:border-white/10`

### 2.2 Text semantic roles
- Primary: `text-gray-900 dark:text-white`
- Secondary: `text-gray-600 dark:text-gray-300`
- Muted/meta: `text-gray-500 dark:text-gray-400`

### 2.3 Border language
- Structural: `border-gray-200 dark:border-gray-700`
- Soft inner: `border-black/5 dark:border-white/10`
- Semantic only when needed (success/info/error).

---

## 3) Typography & Contrast (Strict)

### 3.1 Forbidden patterns
- **Never** use `font-black` on small labels (`text-xs`, `text-[10px]`, `text-[11px]`).
- Avoid low-contrast text over translucent dark layers like `bg-black/20` unless validated.

### 3.2 Label standard
- Labels/meta headings must use:
  - `font-semibold` or `font-bold`
  - `uppercase` (when appropriate)
  - `tracking-wide` or `tracking-wider`

### 3.3 Contrast minimum
- Target minimum contrast ratio: **4.5:1** for normal text, including Dark Mode.
- If contrast is borderline, raise text luminance first (not saturation).

---

## 4) Interactive Elements

### 4.1 Mandatory interaction contract
All clickable elements must include:
- `cursor-pointer`
- `transition-all duration-200`

Disabled controls must include:
- `disabled:opacity-60`
- `disabled:cursor-not-allowed`

### 4.2 Button patterns

#### Primary
- `bg-indigo-600 hover:bg-indigo-700 text-white`
- `rounded-xl px-4 py-2.5`
- `font-semibold`

#### Secondary
- `border border-black/10 dark:border-white/10`
- `bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700`
- `text-gray-700 dark:text-gray-200`
- `rounded-xl`

#### Danger (non-punitive)
- Avoid saturated punitive red blocks.
- Prefer soft danger styling with clear guidance.

### 4.3 Micro-interactions (Premium requirement)
On hover for important cards and primary buttons:
- add subtle lift: `hover:-translate-y-0.5` (or `hover:translate-y-[-2px]`)
- combine with subtle elevation: `hover:shadow-md`
- keep transitions soft and fast (`duration-200`)

---

## 5) Empty States: “The Helpful Guide”

Every empty state must include:
1. **Narrative visual slot**
   - Reserved area for minimal illustration/iconography.
2. **Empowering copy**
   - Action-oriented and supportive, never blaming.
3. **Single primary CTA**
   - One clear next step.

### Empty state anti-patterns
- No multiple competing CTAs.
- No dead-end text (“No data”) without an action path.

---

## 6) Error States (Non-punitive)

### 6.1 Visual style
Use soft containers, not aggressive red blocks:
- `bg-red-50 dark:bg-red-900/20`
- `border border-red-200 dark:border-red-800/60`
- `text-red-700 dark:text-red-200`

### 6.2 UX rule
- Always include a one-click resolution when possible:
  - retry, fix input, reconnect, or copy support detail.
- Error copy must explain what happened and what to do next.

---

## 7) Loading Strategy

### 7.1 Preferred loading pattern
- **Skeleton screens are mandatory by default** for loading content sections.
- Use `animate-pulse` with realistic content shapes (title, lines, media blocks).

### 7.2 Spinner policy
- Spinners are secondary and only valid for compact inline actions (e.g. button submit state).
- Never replace full content areas with spinner-only placeholders.

---

## 8) Component Patterns

### 8.1 Module card pattern
- Header (title + context)
- Body (main interaction/data)
- Footer (single primary action + optional secondary)
- Keep hierarchy clean and avoid duplicate labels if icon/value already provides context.

### 8.2 Modal pattern
Backdrop:
- `fixed inset-0 z-[120]`
- `bg-black/55 backdrop-blur-md`

Dialog:
- `rounded-2xl`
- `border border-black/10 dark:border-white/10`
- `bg-white/95 dark:bg-gray-900/95`
- `shadow-sm`

Accessibility baseline:
- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby`
- Escape closes modal

---

## 9) Responsive Contract

- Mobile-first always.
- No horizontal scroll in core flows.
- Row layouts with long text must use:
  - container: `min-w-0 flex-1`
  - text: `truncate`
- On small screens, controls can wrap into a second line while preserving action visibility.

---

## 10) AI Coding Directives (Absolute)

When generating UI code for LGA, the assistant must:
1. Use Tailwind utilities first; avoid ad-hoc CSS unless unavoidable.
2. Follow this document as source of truth.
3. Enforce typography and contrast rules (including 4.5:1 in Dark Mode).
4. Use skeletons for loading blocks (`animate-pulse`).
5. Apply premium micro-hover behavior on key interactive elements.
6. Build empty/error states with actionable guidance.
7. Keep progressive disclosure and low cognitive load as default behavior.

---

## 11) AI Feature Cards (Single Visual Pattern)

Any feature powered by AI must use the `MagicCard` component as its outer shell. This is the shared visual DNA between the landing demo and the real app:

- **Planificador IA** (event plan generation) → `colorVariant="purple"`
- **Modo Rompehielos** (icebreaker generation) → `colorVariant="orange"`
- Any future AI feature card → pick `"blue" | "purple" | "orange"` to differentiate, but always use `MagicCard`.

**Pattern:**
- Base component: [frontend/src/screens/dashboard/components/ui/magic-card.jsx](frontend/src/screens/dashboard/components/ui/magic-card.jsx) — pure presentational, no Supabase.
- Shared wrappers: `PlannerIACard`, `IcebreakerCard` (when worth it) in `frontend/src/components/dashboard/presentational/`.
- Props contract: `{ title, subtitle, icon, colorVariant, onClick }`. Keep icons minimal (usually `"sparkle"`). Subtitle adapts to state (empty / loading / has-data).

**Why:** unifies the "there's AI here" visual signal across the product. A user who sees the gradient blob + asymmetric border instantly knows it's an AI feature. The landing and the private app share the exact same aesthetic — no dissonance when the user signs up.

**Do NOT:**
- Create custom AI feature cards from scratch with Tailwind.
- Use `bg-indigo-50` banners with internal buttons for AI features. That's legacy and has been replaced.

---

## 12) Simulator Convention (Public Landing)

Any component on the public landing that **mocks or previews the real product UI** must be wrapped with a subtle 3D tilt on `lg+` screens:

```
lg:[transform:perspective(1400px)_rotateY(-6deg)_rotateX(2deg)]
lg:hover:[transform:perspective(1400px)_rotateY(-2deg)_rotateX(1deg)]
transition-transform duration-500 ease-out
```

- Tilt strength varies by importance: hero widget uses `rotateY(-6deg)`; full-page simulator (InteractiveDemo) uses `rotateY(-3deg)` (subtler because it's larger).
- Never apply tilt below `lg` (mobile must be flat for readability).
- Hover reduces the tilt toward zero for interactivity.

**Why:** gives a clear visual signal that "this is a preview, not the real app". Users don't confuse the showcase with live data. Adds premium depth without overwhelming.

**Current simulators:**
- `ModuleShowcaseCard` in hero right column.
- `InteractiveDemo` MockAppShell in #landing-demo-section.

---

## 13) Third-Party Embed Chrome Masking

When embedding a third-party iframe (Google Maps, YouTube, etc.) as background decoration, the chrome injected by that third party ("Open in Google Maps", attribution, fullscreen buttons) must be masked:

- Add a solid bottom strip `absolute bottom-0 left-0 right-0 h-20 bg-white dark:bg-gray-900 pointer-events-none` BEFORE the fade gradient.
- Then overlay the aesthetic fade `bg-gradient-to-t from-white via-white/85 to-transparent`.

**Why:** cross-origin iframes can't be fully styled; strip + gradient guarantees the UI is ours, not Google's. Applied in `event-detail-view.jsx` hero cover.

